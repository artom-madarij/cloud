import {
  SQSClient,
  SendMessageCommand
} from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});

const API_KEY = process.env.API_KEY;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const ALLOWED_SENSOR_TYPES = [
  "temperature",
  "humidity",
  "light",
    "camera"
];

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

export function validateMeasurement(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  if (typeof data.sensor_id !== "string" || !data.sensor_id.trim()) {
    return { valid: false, error: "sensor_id must be a non-empty string" };
  }

  if (!ALLOWED_SENSOR_TYPES.includes(data.sensor_type)) {
    return { valid: false, error: "Invalid sensor_type" };
  }

  if (typeof data.value !== "number" || !Number.isFinite(data.value)) {
    return { valid: false, error: "value must be a valid number" };
  }

  if (typeof data.unit !== "string" || !data.unit.trim()) {
    return { valid: false, error: "unit must be a non-empty string" };
  }

  if (
    !data.location ||
    typeof data.location !== "object" ||
    Array.isArray(data.location) ||
    typeof data.location.lat !== "number" ||
    !Number.isFinite(data.location.lat) ||
    typeof data.location.lon !== "number" ||
    !Number.isFinite(data.location.lon)
  ) {
    return { valid: false, error: "Invalid location: lat and lon are required" };
  }

  const isoUtcPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  if (
    typeof data.measured_at !== "string" ||
    !isoUtcPattern.test(data.measured_at) ||
    !Number.isFinite(Date.parse(data.measured_at))
  ) {
    return { valid: false, error: "measured_at must be ISO 8601 UTC" };
  }

  if (data.sensor_type === "camera") {
        const keyPattern = /^images\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9._-]{1,128}$/;
        if (
            typeof data.object_key !== "string" ||
            !keyPattern.test(data.object_key) ||
            !data.object_key.startsWith(`images/${data.sensor_id}/`)
        ) {
            return { valid: false, error: "camera requires a valid object_key" };
        }
    }
    return { valid: true };
}

export async function handler(event) {
  try {
    if (!API_KEY || !SQS_QUEUE_URL) {
      console.error("Missing Lambda environment configuration");
      return response(500, {
        error: "Server configuration error"
      });
    }

    const headers = event.headers || {};

    const apiKeyEntry = Object.entries(headers).find(
      ([name]) => name.toLowerCase() === "x-api-key"
    );

    if (!apiKeyEntry || apiKeyEntry[1] !== API_KEY) {
      return response(401, {
        error: "Invalid or missing API key"
      });
    }

    if (typeof event.body !== "string") {
      return response(400, {
        error: "Request body is required"
      });
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    let measurement;

    try {
      measurement = JSON.parse(rawBody);
    } catch {
      return response(400, {
        error: "Invalid JSON"
      });
    }

    const validation = validateMeasurement(measurement);

    if (!validation.valid) {
      return response(400, {
        error: validation.error
      });
    }

    const result = await sqs.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify(measurement)
      })
    );

    console.log("Measurement added to SQS:", result.MessageId);

    return response(202, {
      messageId: result.MessageId
    });

  } catch (error) {
    console.error("Failed to receive measurement:", error);

    return response(500, {
      error: "Failed to enqueue measurement"
    });
  }
}