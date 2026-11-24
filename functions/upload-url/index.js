import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED" });
const API_KEY = process.env.API_KEY;
const BUCKET = process.env.IMAGES_BUCKET;
const EXPIRES_IN = Number(process.env.URL_EXPIRATION || 300);
const MAX_SIZE = 1024 * 1024;
const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg" };

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  try {
    if (!API_KEY || !BUCKET) {
      return response(500, { error: "Server configuration error" });
    }

    const keyEntry = Object.entries(event.headers || {}).find(
      ([name]) => name.toLowerCase() === "x-api-key"
    );
    if (!keyEntry || keyEntry[1] !== API_KEY) {
      return response(401, { error: "Invalid or missing API key" });
    }

    let body;
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
      body = JSON.parse(raw);
    } catch {
      return response(400, { error: "Invalid JSON" });
    }

    if (typeof body?.sensor_id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(body.sensor_id)) {
      return response(400, { error: "sensor_id must match [A-Za-z0-9_-]{1,64}" });
    }
    const extension = EXTENSIONS[body.content_type];
    if (!extension) {
      return response(400, { error: "content_type must be image/png or image/jpeg" });
    }
    if (!Number.isInteger(body.size) || body.size < 1 || body.size > MAX_SIZE) {
      return response(400, { error: "size must be an integer between 1 and 1048576" });
    }

    const objectKey = `images/${body.sensor_id}/${Date.now()}-${randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: body.content_type }),
      { expiresIn: EXPIRES_IN }
    );

    console.log("Presigned upload URL issued:", { sensor_id: body.sensor_id, objectKey });
    return response(200, {
      upload_url: uploadUrl,
      method: "PUT",
      object_key: objectKey,
      headers: { "Content-Type": body.content_type },
      expires_in: EXPIRES_IN
    });
  } catch (error) {
    console.error("Failed to create upload URL:", error);
    return response(500, { error: "Failed to create upload URL" });
  }
}
