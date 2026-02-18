/**
 * Gateway Bridge
 *
 * Runs on a Raspberry Pi or PC at the customer site.
 * Connects to an NCD USB wireless gateway, listens for sensor data,
 * and forwards each reading to the Crane Platform API.
 *
 * Usage:
 *   API_URL=https://your-api.com API_KEY=crane_xxx SERIAL_PORT=/dev/ttyUSB0 node bridge.js
 */

const WirelessSensor = require("@ncd-io/node-red-enterprise-sensors");

// ── Config ──────────────────────────────────────────────
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_KEY = process.env.API_KEY || "";
const SERIAL_PORT = process.env.SERIAL_PORT || "/dev/ttyUSB0";
const BAUD_RATE = parseInt(process.env.BAUD_RATE || "115200");

if (!API_KEY) {
  console.error("ERROR: API_KEY environment variable is required");
  console.error("  Get your key from the Crane Platform dashboard under Settings > API Keys");
  process.exit(1);
}

console.log(`Crane Gateway Bridge`);
console.log(`  API:    ${API_URL}`);
console.log(`  Port:   ${SERIAL_PORT}`);
console.log(`  Baud:   ${BAUD_RATE}`);
console.log(`  Key:    ${API_KEY.slice(0, 10)}...`);
console.log("");

// ── Connect to NCD USB gateway ──────────────────────────
const sensor = new WirelessSensor(SERIAL_PORT, BAUD_RATE);

sensor.on("sensor_data", async (data) => {
  // data comes from the NCD library with fields like:
  // addr, firmware, battery, sensor_type, temperature, x_rms_ACC_G, etc.

  const payload = {
    addr: data.addr,
    firmware: data.firmware,
    battery_percent: data.battery,
    counter: data.counter,
    sensor_type: data.sensor_type,
    mode: data.mode,
    odr: data.odr,
    temperature: data.temperature,
    x_rms_ACC_G: data.x_rms_ACC_G,
    x_max_ACC_G: data.x_max_ACC_G,
    x_velocity_mm_sec: data.x_velocity_mm_sec,
    x_displacement_mm: data.x_displacement_mm,
    x_peak_one_Hz: data.x_peak_one_Hz,
    x_peak_two_Hz: data.x_peak_two_Hz,
    x_peak_three_Hz: data.x_peak_three_Hz,
    y_rms_ACC_G: data.y_rms_ACC_G,
    y_max_ACC_G: data.y_max_ACC_G,
    y_velocity_mm_sec: data.y_velocity_mm_sec,
    y_displacement_mm: data.y_displacement_mm,
    y_peak_one_Hz: data.y_peak_one_Hz,
    y_peak_two_Hz: data.y_peak_two_Hz,
    y_peak_three_Hz: data.y_peak_three_Hz,
    z_rms_ACC_G: data.z_rms_ACC_G,
    z_max_ACC_G: data.z_max_ACC_G,
    z_velocity_mm_sec: data.z_velocity_mm_sec,
    z_displacement_mm: data.z_displacement_mm,
    z_peak_one_Hz: data.z_peak_one_Hz,
    z_peak_two_Hz: data.z_peak_two_Hz,
    z_peak_three_Hz: data.z_peak_three_Hz,
    rpm: data.rpm,
    rssi: data.rssi,
  };

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
      console.log(`[${new Date().toISOString()}] ✓ ${data.addr} → reading #${result.reading_id} (temp=${data.temperature}°C, x_vel=${data.x_velocity_mm_sec} mm/s)`);
    } else if (res.status === 409) {
      // duplicate, ignore
    } else {
      const err = await res.text();
      console.error(`[${new Date().toISOString()}] ✗ ${data.addr} → ${res.status}: ${err}`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ✗ Network error: ${err.message}`);
  }
});

sensor.on("sensor_mode", (data) => {
  console.log(`[${new Date().toISOString()}] Mode: ${data.addr} → ${data.mode}`);
});

console.log("Listening for sensor data...\n");
