import { setTimeout as sleep } from "node:timers/promises";
import { deflateSync } from "node:zlib";

const INGEST_URL = process.env.INGEST_URL;
const API_KEY = process.env.API_KEY;

if (!INGEST_URL || !API_KEY) {
  throw new Error("INGEST_URL and API_KEY must be configured");
}

try {
  const url = new URL(INGEST_URL);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("INGEST_URL must use HTTP or HTTPS");
  }
} catch (error) {
  throw new Error(`Invalid INGEST_URL: ${error.message}`);
}

const UPLOAD_URL_ENDPOINT =
  process.env.UPLOAD_URL_ENDPOINT || new URL("/camera/upload-url", INGEST_URL).toString();

function getInterval(variable, min, max, fallback) {
  const interval = Number(process.env[variable] ?? fallback);
  if (!Number.isInteger(interval) || interval < min || interval > max) {
    throw new Error(`${variable} must be between ${min} and ${max} ms`);
  }
  return interval;
}

// ---------- tiny PNG generator (no dependencies) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function makePng(width = 160, height = 120) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const shift = Math.floor(Math.random() * 256);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) {
      raw[p++] = Math.floor((x * 255) / width + shift) & 255;
      raw[p++] = Math.floor((y * 255) / height + shift / 2) & 255;
      raw[p++] = shift;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

// ---------- senders ----------
async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response;
}

async function sendMeasurement(sensor) {
  const measurement = {
    sensor_id: sensor.sensor_id,
    sensor_type: sensor.sensor_type,
    value: Number(sensor.generateValue().toFixed(2)),
    unit: sensor.unit,
    location: sensor.location,
    measured_at: new Date().toISOString()
  };
  await postJson(INGEST_URL, measurement);
  console.log(`[SENT] ${sensor.sensor_id}: ${measurement.value} ${measurement.unit}`);
}

async function sendCamera(sensor) {
  const image = makePng();
  const measuredAt = new Date().toISOString();

  // 1. ask the function for a one-time presigned upload URL
  const presign = await postJson(UPLOAD_URL_ENDPOINT, {
    sensor_id: sensor.sensor_id,
    content_type: "image/png",
    size: image.length
  });
  const { upload_url: uploadUrl, object_key: objectKey } = await presign.json();

  // 2. upload the image directly to S3 (not through the queue)
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: image,
    signal: AbortSignal.timeout(10000)
  });
  if (!upload.ok) {
    throw new Error(`S3 upload HTTP ${upload.status}: ${await upload.text()}`);
  }

  // 3. only now send a regular message with the object reference
  await postJson(INGEST_URL, {
    sensor_id: sensor.sensor_id,
    sensor_type: sensor.sensor_type,
    value: image.length,
    unit: sensor.unit,
    location: sensor.location,
    measured_at: measuredAt,
    object_key: objectKey
  });
  console.log(`[SENT] ${sensor.sensor_id}: image ${image.length} bytes -> ${objectKey}`);
}

const sensors = [
  {
    sensor_id: "temperature-01",
    sensor_type: "temperature",
    unit: "°C",
    interval: getInterval("TEMPERATURE_INTERVAL_MS", 20, 100, 100),
    location: { lat: 49.8397, lon: 24.0297 },
    generateValue: () => 18 + Math.random() * 12,
    send: sendMeasurement
  },
  {
    sensor_id: "humidity-01",
    sensor_type: "humidity",
    unit: "%",
    interval: getInterval("HUMIDITY_INTERVAL_MS", 20, 100, 100),
    location: { lat: 49.8401, lon: 24.0306 },
    generateValue: () => 30 + Math.random() * 50,
    send: sendMeasurement
  },
  {
    sensor_id: "light-01",
    sensor_type: "light",
    unit: "lux",
    interval: getInterval("LIGHT_INTERVAL_MS", 20, 100, 100),
    location: { lat: 49.8389, lon: 24.0287 },
    generateValue: () => 100 + Math.random() * 900,
    send: sendMeasurement
  },
  {
    sensor_id: "camera-01",
    sensor_type: "camera",
    unit: "bytes",
    interval: getInterval("CAMERA_INTERVAL_MS", 10000, 30000, 15000),
    location: { lat: 49.8393, lon: 24.0311 },
    send: sendCamera
  }
];

const stats = { sent: 0, errors: 0, sensors: {} };
for (const sensor of sensors) {
  stats.sensors[sensor.sensor_id] = { sent: 0, errors: 0 };
}

let stopping = false;

async function runSensor(sensor) {
  while (!stopping) {
    const startedAt = Date.now();
    try {
      await sensor.send(sensor);
      stats.sent++;
      stats.sensors[sensor.sensor_id].sent++;
    } catch (error) {
      stats.errors++;
      stats.sensors[sensor.sensor_id].errors++;
      console.error(`[ERROR] ${sensor.sensor_id}: ${error.message}`);
    }
    const remaining = sensor.interval - (Date.now() - startedAt);
    if (remaining > 0 && !stopping) await sleep(remaining);
  }
}

function printStats() {
  console.log("\nSTATISTICS");
  console.log(`Total sent: ${stats.sent}`);
  console.log(`Total errors: ${stats.errors}`);
  for (const sensor of sensors) {
    const result = stats.sensors[sensor.sensor_id];
    console.log(`${sensor.sensor_id}: sent=${result.sent}, errors=${result.errors}`);
  }
}

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Stopping emulator...`);
  stopping = true;
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

console.log("IoT Sensor Emulator started");
for (const sensor of sensors) {
  console.log(`${sensor.sensor_type}: interval=${sensor.interval}ms`);
}

const statisticsTimer = setInterval(printStats, 5000);
await Promise.all(sensors.map(runSensor));
clearInterval(statisticsTimer);
console.log("Final statistics:");
printStats();
