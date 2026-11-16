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

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

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
        timezone: "Z",
        dateStrings: true,
        supportBigNumbers: true,
        bigNumberStrings: true,
        decimalNumbers: true
      });
    })().catch(error => {
      poolPromise = undefined;
      throw error;
    });
  }

  return poolPromise;
}

function parseIsoDate(value, fieldName) {
  const isoPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

  if (typeof value !== "string" || !isoPattern.test(value)) {
    throw new Error(
      `${fieldName} must be an ISO 8601 timestamp with timezone`
    );
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }

  return date.toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

function formatMeasuredAt(value) {
  return `${String(value).replace(" ", "T")}Z`;
}

export async function handler(event) {
  const method = event.requestContext?.http?.method;

  if (method !== "GET") {
    return response(405, {
      error: "Method not allowed"
    });
  }

  const sensorId = event.pathParameters?.sensor_id;
  const query = event.queryStringParameters || {};

  if (
    typeof sensorId !== "string" ||
    !sensorId.trim() ||
    sensorId.length > 128
  ) {
    return response(400, {
      error: "Invalid sensor_id"
    });
  }

  let fromDate;
  let toDate;

  try {
    fromDate = parseIsoDate(query.from, "from");
    toDate = parseIsoDate(query.to, "to");
  } catch (error) {
    return response(400, {
      error: error.message
    });
  }

  if (fromDate > toDate) {
    return response(400, {
      error: "'from' must not be later than 'to'"
    });
  }

  const rawLimit = query.limit ?? "100";

  if (!/^\d+$/.test(String(rawLimit))) {
    return response(400, {
      error: "limit must be an integer between 1 and 500"
    });
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return response(400, {
      error: "limit must be between 1 and 500"
    });
  }

  try {
    const pool = await getPool();

    const [rows] = await pool.execute(
      `
        SELECT
          measurement_id,
          sensor_id,
          sensor_type,
          value,
          unit,
          latitude,
          longitude,
          measured_at,
          is_anomaly,
          anomaly_reason
        FROM measurements
        WHERE sensor_id = ?
          AND measured_at >= ?
          AND measured_at <= ?
        ORDER BY measured_at DESC
        LIMIT ?
      `,
      [
        sensorId,
        fromDate,
        toDate,
        limit
      ]
    );

    const measurements = rows.map(row => ({
      measurement_id: row.measurement_id,
      sensor_id: row.sensor_id,
      sensor_type: row.sensor_type,
      value: Number(row.value),
      unit: row.unit,
      location: {
        lat: Number(row.latitude),
        lon: Number(row.longitude)
      },
      measured_at: formatMeasuredAt(row.measured_at),
      is_anomaly: Boolean(row.is_anomaly),
      anomaly_reason: row.anomaly_reason
    }));

    console.log("History request completed:", {
      sensor_id: sensorId,
      count: measurements.length
    });

    return response(200, measurements);

  } catch (error) {
    console.error("History request failed:", error);

    return response(500, {
      error: "Failed to load sensor history"
    });
  }
}