/**
 * Sensor Simulator
 *
 * Generates fake sensor readings and sends them to the API,
 * so you can test the full pipeline without physical hardware.
 *
 * Usage:
 *   API_URL=http://localhost:8000 API_KEY=crane_xxx node simulator.js
 *
 * Simulates 3 sensors sending data every 10 seconds:
 *   - Sensor 01: gradually degrading (vibration increasing over time)
 *   - Sensor 02: healthy and stable
 *   - Sensor 03: intermittent spikes
 */

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_KEY = process.env.API_KEY || "";
const INTERVAL_SEC = parseInt(process.env.INTERVAL || "10");

if (!API_KEY) {
  console.error("ERROR: API_KEY is required");
  console.error("Usage: API_KEY=crane_xxx node simulator.js");
  process.exit(1);
}

const SENSORS = [
  { addr: "00:13:A2:00:41:AB:CD:01", label: "Hoist (degrading)", mode: "degrade" },
  { addr: "00:13:A2:00:41:AB:CD:02", label: "Bridge (healthy)", mode: "healthy" },
  { addr: "00:13:A2:00:41:AB:CD:03", label: "Gearbox (spiky)", mode: "spiky" },
];

let counter = 100; // start after seed data counters
let tick = 0;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function generateReading(sensor) {
  tick++;
  const noise = () => rand(-0.05, 0.05);
  let xVel, yVel, zVel, temp;

  switch (sensor.mode) {
    case "degrade":
      // Slowly increasing vibration — starts in Zone A, drifts toward Zone D over ~50 readings
      const progress = Math.min(tick / 50, 1);
      xVel = 0.3 + progress * 1.8 + noise();
      yVel = 0.2 + progress * 1.2 + noise();
      zVel = 0.15 + progress * 0.7 + noise();
      temp = 32 + progress * 8 + noise();
      break;

    case "healthy":
      // Stable, well within Zone A
      xVel = 0.35 + noise();
      yVel = 0.25 + noise();
      zVel = 0.18 + noise();
      temp = 28 + noise();
      break;

    case "spiky":
      // Mostly okay but random spikes into Zone C/D
      const spike = Math.random() < 0.15; // 15% chance of spike
      xVel = spike ? rand(1.5, 2.5) : rand(0.4, 0.6) + noise();
      yVel = spike ? rand(1.0, 1.8) : rand(0.3, 0.45) + noise();
      zVel = spike ? rand(0.8, 1.2) : rand(0.2, 0.35) + noise();
      temp = spike ? rand(38, 45) : rand(29, 31) + noise();
      break;
  }

  counter++;
  return {
    addr: sensor.addr,
    firmware: 10,
    battery_percent: Math.max(10, Math.round(95 - tick * 0.1)),
    counter: counter,
    sensor_type: 114,
    odr: 800,
    temperature: Math.round(temp * 10) / 10,
    x_rms_ACC_G: Math.round(xVel * 0.12 * 1000) / 1000,
    x_max_ACC_G: Math.round(xVel * 0.3 * 1000) / 1000,
    x_velocity_mm_sec: Math.round(xVel * 1000) / 1000,
    x_displacement_mm: Math.round(xVel * 0.006 * 1000) / 1000,
    x_peak_one_Hz: Math.round(rand(50, 200) * 10) / 10,
    x_peak_two_Hz: Math.round(rand(100, 400) * 10) / 10,
    x_peak_three_Hz: Math.round(rand(200, 600) * 10) / 10,
    y_rms_ACC_G: Math.round(yVel * 0.11 * 1000) / 1000,
    y_max_ACC_G: Math.round(yVel * 0.25 * 1000) / 1000,
    y_velocity_mm_sec: Math.round(yVel * 1000) / 1000,
    y_displacement_mm: Math.round(yVel * 0.005 * 1000) / 1000,
    y_peak_one_Hz: Math.round(rand(40, 150) * 10) / 10,
    y_peak_two_Hz: Math.round(rand(80, 300) * 10) / 10,
    y_peak_three_Hz: Math.round(rand(160, 450) * 10) / 10,
    z_rms_ACC_G: Math.round(zVel * 0.1 * 1000) / 1000,
    z_max_ACC_G: Math.round(zVel * 0.2 * 1000) / 1000,
    z_velocity_mm_sec: Math.round(zVel * 1000) / 1000,
    z_displacement_mm: Math.round(zVel * 0.004 * 1000) / 1000,
    z_peak_one_Hz: Math.round(rand(30, 100) * 10) / 10,
    z_peak_two_Hz: Math.round(rand(60, 200) * 10) / 10,
    z_peak_three_Hz: Math.round(rand(90, 300) * 10) / 10,
    rpm: 1750,
    rssi: Math.round(rand(-70, -50)),
  };
}

async function sendReading(sensor) {
  const payload = generateReading(sensor);

  try {
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
      const zone = payload.x_velocity_mm_sec < 0.71 ? "A" :
                   payload.x_velocity_mm_sec < 1.12 ? "B" :
                   payload.x_velocity_mm_sec < 1.8 ? "C" : "D";
      console.log(
        `  ${sensor.label.padEnd(22)} → #${String(result.reading_id).padStart(4)} | ` +
        `x=${payload.x_velocity_mm_sec.toFixed(2)} y=${payload.y_velocity_mm_sec.toFixed(2)} z=${payload.z_velocity_mm_sec.toFixed(2)} mm/s | ` +
        `${payload.temperature}°C | Zone ${zone}`
      );
    } else if (res.status === 409) {
      // skip
    } else {
      console.error(`  ${sensor.label} → ERROR ${res.status}`);
    }
  } catch (err) {
    console.error(`  ${sensor.label} → NETWORK ERROR: ${err.message}`);
  }
}

async function runCycle() {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`\n[${ts}] Sending readings...`);
  for (const sensor of SENSORS) {
    await sendReading(sensor);
  }
}

console.log(`\nCrane Sensor Simulator`);
console.log(`  API:      ${API_URL}`);
console.log(`  Sensors:  ${SENSORS.length}`);
console.log(`  Interval: ${INTERVAL_SEC}s`);
console.log(`  Key:      ${API_KEY.slice(0, 10)}...`);
console.log(`\nSimulating 3 sensor behaviors:`);
console.log(`  Sensor 01: Gradually degrading — vibration increases over time`);
console.log(`  Sensor 02: Healthy and stable — stays in Zone A`);
console.log(`  Sensor 03: Intermittent spikes — random jumps to Zone C/D`);

// Send first batch immediately, then on interval
runCycle();
setInterval(runCycle, INTERVAL_SEC * 1000);
