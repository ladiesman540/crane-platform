/**
 * Load temperature CSV data into the Crane Platform API.
 *
 * Usage:
 *   API_URL=https://crane-platform-production.up.railway.app API_KEY=crane_xxx node load-csv.js ../Temperature_Sensor_02_10_2026\ 09_21_02_10_2026\ 15_21.csv
 */

const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "https://crane-platform-production.up.railway.app";
const API_KEY = process.env.API_KEY || "";
const SENSOR_ADDR = process.env.SENSOR_ADDR || "00:13:A2:00:41:AB:CD:01";

if (!API_KEY) {
  console.error("ERROR: API_KEY is required");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node load-csv.js <path-to-csv>");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(csvPath), "utf-8");
const lines = raw.trim().split("\n").slice(1); // skip header

// Parse and sort chronologically (CSV is reverse chronological)
const readings = lines
  .map((line) => {
    const [temp, time] = line.split(",");
    return { temperature: parseFloat(temp), time };
  })
  .filter((r) => !isNaN(r.temperature) && r.time)
  .reverse();

console.log(`Loaded ${readings.length} readings from CSV`);
console.log(`  First: ${readings[0].time} (${readings[0].temperature}°C)`);
console.log(`  Last:  ${readings[readings.length - 1].time} (${readings[readings.length - 1].temperature}°C)`);
console.log(`  Sensor: ${SENSOR_ADDR}`);
console.log(`  API: ${API_URL}`);
console.log(``);

let counter = 10000; // high counter to avoid duplicates with existing data

async function send(reading) {
  counter++;
  const payload = {
    addr: SENSOR_ADDR,
    firmware: 10,
    battery_percent: 95,
    counter: counter,
    sensor_type: 114,
    odr: 800,
    temperature: reading.temperature,
    x_rms_ACC_G: 0,
    x_max_ACC_G: 0,
    x_velocity_mm_sec: 0,
    x_displacement_mm: 0,
    x_peak_one_Hz: 0,
    x_peak_two_Hz: 0,
    x_peak_three_Hz: 0,
    y_rms_ACC_G: 0,
    y_max_ACC_G: 0,
    y_velocity_mm_sec: 0,
    y_displacement_mm: 0,
    y_peak_one_Hz: 0,
    y_peak_two_Hz: 0,
    y_peak_three_Hz: 0,
    z_rms_ACC_G: 0,
    z_max_ACC_G: 0,
    z_velocity_mm_sec: 0,
    z_displacement_mm: 0,
    z_peak_one_Hz: 0,
    z_peak_two_Hz: 0,
    z_peak_three_Hz: 0,
    rpm: 0,
    rssi: -60,
  };

  const res = await fetch(`${API_URL}/api/v1/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const result = await res.json();
    return result.reading_id;
  } else if (res.status === 409) {
    return "dup";
  } else {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
}

async function main() {
  let loaded = 0;
  let dupes = 0;
  let errors = 0;

  for (let i = 0; i < readings.length; i++) {
    try {
      const id = await send(readings[i]);
      if (id === "dup") {
        dupes++;
      } else {
        loaded++;
      }
      if ((i + 1) % 50 === 0) {
        process.stdout.write(`  ${i + 1}/${readings.length} (${loaded} loaded, ${dupes} dupes)\n`);
      }
    } catch (e) {
      errors++;
      console.error(`  Error at ${i}: ${e.message}`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Loaded: ${loaded}`);
  console.log(`  Dupes:  ${dupes}`);
  console.log(`  Errors: ${errors}`);
}

main();
