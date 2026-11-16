import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

import mysql from "mysql2/promise";

const secretsClient = new SecretsManagerClient({});

const DB_SECRET_ARN = process.env.DB_SECRET_ARN;
const DB_NAME = process.env.DB_NAME || "lamp_store";
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);

let poolPromise;
let schemaPromise;

const SENSOR_RULES = {
  temperature: {
    units: ["°C", "C"],
    min: -50,
    max: 100,
    normalMin: 0,
    normalMax: 40
  },

  humidity: {
    units: ["%"],
    min: 0,
    max: 100,
    normalMin: 20,
    normalMax: 80
  },

  light: {
    units: ["lux"],
    min: 0,
    max: 100000,
    normalMin: 50,
    normalMax: 10000
  }
};

async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      if (!DB_HOST) {
          throw new Error("DB_HOST is missing");
        }

        if (!DB_SECRET_ARN) {
        throw new Error("DB_SECRET_ARN is missing");
      }

      const result = await secretsClient.send(
        new GetSecretValueCommand({
          SecretId: DB_SECRET_ARN
        })
      );

      if (!result.SecretString) {
        throw new Error("Database secret is empty");
      }

      const credentials = JSON.parse(result.SecretString);

      return mysql.createPool({
        host: DB_HOST,
      port: DB_PORT,
        user: credentials.username,
        password: credentials.password,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0,
        connectTimeout: 10000,
        timezone: "Z"
      });
    })().catch(error => {
      poolPromise = undefined;
      throw error;
    });
  }

  return poolPromise;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const pool = await getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS measurements (
          measurement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          sensor_id VARCHAR(128) NOT NULL,
          measured_at DATETIME(3) NOT NULL,
          sensor_type VARCHAR(32) NOT NULL,
          value DOUBLE NOT NULL,
          unit VARCHAR(16) NOT NULL,
          latitude DECIMAL(10,7) NOT NULL,
          longitude DECIMAL(10,7) NOT NULL,
          is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
          anomaly_reason VARCHAR(255) NULL,
          processed_at DATETIME(3) NOT NULL
            DEFAULT CURRENT_TIMESTAMP(3),

          PRIMARY KEY (measurement_id),

          UNIQUE KEY uq_sensor_measured_at (
            sensor_id,
            measured_at
          )
        ) ENGINE=InnoDB
      `);
    })().catch(error => {
      schemaPromise = undefined;
      throw error;
    });
  }

  return schemaPromise;
}

function processMeasurement(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid measurement object");
  }

  if (
    typeof data.sensor_id !== "string" ||
    !data.sensor_id.trim()
  ) {
    throw new Error("Invalid sensor_id");
  }

  const rules = SENSOR_RULES[data.sensor_type];

  if (!rules) {
    throw new Error("Unsupported sensor_type");
  }

  if (
    typeof data.value !== "number" ||
    !Number.isFinite(data.value)
  ) {
    throw new Error("Invalid measurement value");
  }

  if (!rules.units.includes(data.unit)) {
    throw new Error("Invalid measurement unit");
  }

  if (
    !data.location ||
    typeof data.location.lat !== "number" ||
    typeof data.location.lon !== "number" ||
    data.location.lat < -90 ||
    data.location.lat > 90 ||
    data.location.lon < -180 ||
    data.location.lon > 180
  ) {
    throw new Error("Invalid sensor location");
  }

  const measuredDate = new Date(data.measured_at);

  if (
    typeof data.measured_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(data.measured_at) ||
    !Number.isFinite(measuredDate.getTime())
  ) {
    throw new Error("Invalid measured_at");
  }

  let anomalyReason = null;

  if (
    data.value < rules.min ||
    data.value > rules.max
  ) {
    anomalyReason = "Value outside valid range";
  } else if (
    data.value < rules.normalMin ||
    data.value > rules.normalMax
  ) {
    anomalyReason = "Value outside normal range";
  }

  return {
    sensor_id: data.sensor_id,
    sensor_type: data.sensor_type,
    value: data.value,
    unit: data.unit,
    latitude: data.location.lat,
    longitude: data.location.lon,
    measured_at: measuredDate
      .toISOString()
      .slice(0, 23)
      .replace("T", " "),
    is_anomaly: anomalyReason !== null,
    anomaly_reason: anomalyReason
  };
}

async function saveMeasurement(measurement) {
  const pool = await getPool();

  await pool.execute(
    `
      INSERT INTO measurements (
        sensor_id,
        measured_at,
        sensor_type,
        value,
        unit,
        latitude,
        longitude,
        is_anomaly,
        anomaly_reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        measurement_id = measurement_id
    `,
    [
      measurement.sensor_id,
      measurement.measured_at,
      measurement.sensor_type,
      measurement.value,
      measurement.unit,
      measurement.latitude,
      measurement.longitude,
      measurement.is_anomaly,
      measurement.anomaly_reason
    ]
  );
}

export async function handler(event) {
  const batchItemFailures = [];

  try {
    await ensureSchema();
  } catch (error) {
    console.error("Database initialization failed:", error);

    return {
      batchItemFailures: (event.Records || []).map(record => ({
        itemIdentifier: record.messageId
      }))
    };
  }

  for (const record of event.Records || []) {
    try {
      const data = JSON.parse(record.body);
      const measurement = processMeasurement(data);

      await saveMeasurement(measurement);

      console.log("Measurement processed:", {
        sensor_id: measurement.sensor_id,
        sensor_type: measurement.sensor_type,
        is_anomaly: measurement.is_anomaly
      });
    } catch (error) {
      console.error(
        "Failed to process message:",
        record.messageId,
        error.message
      );

      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }

  return {
    batchItemFailures
  };
}
