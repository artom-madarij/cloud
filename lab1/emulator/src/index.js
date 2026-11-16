
import { setTimeout as sleep } from "node:timers/promises";

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

function getInterval(variable) {
  const interval = Number(process.env[variable] ?? 100);

  if (
    !Number.isInteger(interval) ||
    interval < 20 ||
    interval > 100
  ) {
    throw new Error(`${variable} must be between 20 and 100 ms`);
  }

  return interval;
}

const sensors = [
  {
    sensor_id: "temperature-01",
    sensor_type: "temperature",
    unit: "°C",
    interval: getInterval("TEMPERATURE_INTERVAL_MS"),
    location: { lat: 49.8397, lon: 24.0297 },
    generateValue: () => 18 + Math.random() * 12
  },
  {
    sensor_id: "humidity-01",
    sensor_type: "humidity",
    unit: "%",
    interval: getInterval("HUMIDITY_INTERVAL_MS"),
    location: { lat: 49.8401, lon: 24.0306 },
    generateValue: () => 30 + Math.random() * 50
  },
  {
    sensor_id: "light-01",
    sensor_type: "light",
    unit: "lux",
    interval: getInterval("LIGHT_INTERVAL_MS"),
    location: { lat: 49.8389, lon: 24.0287 },
    generateValue: () => 100 + Math.random() * 900
  }
];

const stats = {
  sent: 0,
  errors: 0,
  sensors: {}
};

for (const sensor of sensors) {
  stats.sensors[sensor.sensor_id] = {
    sent: 0,
    errors: 0
  };
}

function generateMeasurement(sensor) {
  return {
    sensor_id: sensor.sensor_id,
    sensor_type: sensor.sensor_type,
    value: Number(sensor.generateValue().toFixed(2)),
    unit: sensor.unit,
    location: sensor.location,
    measured_at: new Date().toISOString()
  };
}

async function sendMeasurement(sensor) {
  const measurement = generateMeasurement(sensor);

  const response = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify(measurement),
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  stats.sent++;
  stats.sensors[sensor.sensor_id].sent++;

  console.log(
    `[SENT] ${sensor.sensor_id}: ${measurement.value} ${measurement.unit}`
  );
}

let stopping = false;

async function runSensor(sensor) {
  while (!stopping) {
    const startedAt = Date.now();

    try {
      await sendMeasurement(sensor);
    } catch (error) {
      stats.errors++;
      stats.sensors[sensor.sensor_id].errors++;

      console.error(
        `[ERROR] ${sensor.sensor_id}: ${error.message}`
      );
    }

    const elapsed = Date.now() - startedAt;
    const remaining = sensor.interval - elapsed;

    if (remaining > 0 && !stopping) {
      await sleep(remaining);
    }
  }
}

function printStats() {
  console.log("\nSTATISTICS");
  console.log(`Total sent: ${stats.sent}`);
  console.log(`Total errors: ${stats.errors}`);

  for (const sensor of sensors) {
    const result = stats.sensors[sensor.sensor_id];

    console.log(
      `${sensor.sensor_id}: sent=${result.sent}, errors=${result.errors}`
    );
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
  console.log(
    `${sensor.sensor_type}: interval=${sensor.interval}ms`
  );
}

const statisticsTimer = setInterval(printStats, 5000);

await Promise.all(sensors.map(runSensor));

clearInterval(statisticsTimer);
console.log("Final statistics:");
printStats();
