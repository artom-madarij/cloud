import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mysql from "mysql2/promise";

const secretsClient = new SecretsManagerClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" });

const DB_SECRET_ARN = process.env.DB_SECRET_ARN;
const DB_NAME = process.env.DB_NAME || "lamp_store";
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const URL_EXPIRATION = Number(process.env.URL_EXPIRATION || 300);

let poolPromise;

function response(statusCode, body, source) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(source ? { "X-Data-Source": source } : {})
    },
    body: JSON.stringify(body)
  };
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      if (!DB_HOST) throw new Error("DB_HOST is missing");
      if (!DB_SECRET_ARN) throw new Error("DB_SECRET_ARN is missing");

      const result = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: DB_SECRET_ARN })
      );
      if (!result.SecretString) throw new Error("Database secret is empty");

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
    throw new Error(`${fieldName} must be an ISO 8601 timestamp with timezone`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  return date;
}

const toSqlDate = date => date.toISOString().slice(0, 23).replace("T", " ");
const formatMeasuredAt = value => `${String(value).replace(" ", "T")}Z`;

async function withImageUrl(item) {
  if (item.sensor_type === "camera" && item.object_key && IMAGES_BUCKET) {
    item.image_url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: IMAGES_BUCKET, Key: item.object_key }),
      { expiresIn: URL_EXPIRATION }
    );
    item.image_url_expires_in = URL_EXPIRATION;
  }
  return item;
}

async function querySql(sensorId, from, to, limit) {
  const pool = await getPool();
  // SELECT * keeps the query working even before the object_key migration has run
  const [rows] = await pool.execute(
    `
      SELECT * FROM measurements
      WHERE sensor_id = ? AND measured_at >= ? AND measured_at <= ?
      ORDER BY measured_at DESC
      LIMIT ?
    `,
    [sensorId, toSqlDate(from), toSqlDate(to), limit]
  );
  return rows.map(row => ({
    measurement_id: row.measurement_id,
    sensor_id: row.sensor_id,
    sensor_type: row.sensor_type,
    value: Number(row.value),
    unit: row.unit,
    location: { lat: Number(row.latitude), lon: Number(row.longitude) },
    measured_at: formatMeasuredAt(row.measured_at),
    is_anomaly: Boolean(row.is_anomaly),
    anomaly_reason: row.anomaly_reason,
    object_key: row.object_key ?? null
  }));
}

async function queryDynamo(sensorId, from, to, limit) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: "sensor_id = :s AND measured_at BETWEEN :from AND :to",
      ExpressionAttributeValues: {
        ":s": sensorId,
        ":from": from.toISOString(),
        ":to": to.toISOString()
      },
      ScanIndexForward: false,
      Limit: limit
    })
  );
  return (result.Items || []).map(item => ({
    sensor_id: item.sensor_id,
    sensor_type: item.sensor_type,
    value: Number(item.value),
    unit: item.unit,
    location: item.location,
    measured_at: item.measured_at,
    is_anomaly: Boolean(item.is_anomaly),
    anomaly_reason: item.anomaly_reason ?? null,
    object_key: item.object_key ?? null
  }));
}

export async function handler(event) {
  if (event.requestContext?.http?.method !== "GET") {
    return response(405, { error: "Method not allowed" });
  }

  const sensorId = event.pathParameters?.sensor_id;
  const query = event.queryStringParameters || {};

  if (typeof sensorId !== "string" || !sensorId.trim() || sensorId.length > 128) {
    return response(400, { error: "Invalid sensor_id" });
  }

  const source = query.source ?? "sql";
  if (!["sql", "dynamodb"].includes(source)) {
    return response(400, { error: "source must be 'sql' or 'dynamodb'" });
  }

  let from;
  let to;
  try {
    from = parseIsoDate(query.from, "from");
    to = parseIsoDate(query.to, "to");
  } catch (error) {
    return response(400, { error: error.message });
  }
  if (from.getTime() > to.getTime()) {
    return response(400, { error: "'from' must not be later than 'to'" });
  }

  const rawLimit = query.limit ?? "100";
  if (!/^\d+$/.test(String(rawLimit))) {
    return response(400, { error: "limit must be an integer between 1 and 500" });
  }
  const limit = Number(rawLimit);
  if (limit < 1 || limit > 500) {
    return response(400, { error: "limit must be between 1 and 500" });
  }

  try {
    const items = source === "dynamodb"
      ? await queryDynamo(sensorId, from, to, limit)
      : await querySql(sensorId, from, to, limit);
    const measurements = await Promise.all(items.map(withImageUrl));

    console.log("History request completed:", { sensor_id: sensorId, source, count: measurements.length });
    return response(200, measurements, source);
  } catch (error) {
    console.error("History request failed:", error);
    return response(500, { error: "Failed to load sensor history" });
  }
}
