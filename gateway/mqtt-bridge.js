/**
 * MQTT Bridge
 *
 * Subscribes to the client's MQTT broker, listens for NCD sensor
 * data messages, and forwards each reading to the Crane Platform API.
 *
 * Usage:
 *   MQTT_URL=mqtt://broker-ip:1883 MQTT_TOPIC=ncd/sensors/# API_URL=https://crane-platform-production.up.railway.app API_KEY=crane_xxx node mqtt-bridge.js
 *
 * Optional:
 *   MQTT_USER=username  MQTT_PASS=password   (if broker requires auth)
 */

const mqtt = require("mqtt");

const MQTT_URL = process.env.MQTT_URL || "";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "ncd/sensors/#";
const MQTT_USER = process.env.MQTT_USER || undefined;
const MQTT_PASS = process.env.MQTT_PASS || undefined;
const API_URL = process.env.API_URL || "https://crane-platform-production.up.railway.app";
const API_KEY = process.env.API_KEY || "";

if (!MQTT_URL) {
  console.error("ERROR: MQTT_URL is required");
  console.error("Usage: MQTT_URL=mqtt://broker-ip:1883 API_KEY=crane_xxx node mqtt-bridge.js");
  process.exit(1);
}
if (!API_KEY) {
  console.error("ERROR: API_KEY is required");
  process.exit(1);
}

console.log(`\nCrane MQTT Bridge`);
console.log(`  Broker:  ${MQTT_URL}`);
console.log(`  Topic:   ${MQTT_TOPIC}`);
console.log(`  API:     ${API_URL}`);
console.log(`  Key:     ${API_KEY.slice(0, 10)}...`);
console.log(``);

// ── Connect to MQTT broker ──────────────────────────────
const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  reconnectPeriod: 5000,
});

client.on("connect", () => {
  console.log(`Connected to MQTT broker`);
  client.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error(`Failed to subscribe: ${err.message}`);
    } else {
      console.log(`Subscribed to: ${MQTT_TOPIC}`);
      console.log(`Listening for sensor data...\n`);
    }
  });
});

client.on("error", (err) => {
  console.error(`MQTT error: ${err.message}`);
});

client.on("reconnect", () => {
  console.log(`Reconnecting to MQTT broker...`);
});

// ── Handle incoming messages ────────────────────────────
client.on("message", async (topic, message) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (e) {
    console.error(`  Bad JSON on ${topic}: ${message.toString().slice(0, 100)}`);
    return;
  }

  // NCD Node-RED output typically has: addr, firmware, battery,
  // sensor_type, temperature, x_rms_ACC_G, x_velocity_mm_sec, etc.
  // Map to our API's expected field names.
  const payload = {
    addr: data.addr || data.mac || data.mac_address,
    firmware: data.firmware,
    battery_percent: data.battery_percent ?? data.battery,
    counter: data.counter,
    sensor_type: data.sensor_type,
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

  if (!payload.addr) {
    console.error(`  No sensor address in message on ${topic}`);
    return;
  }

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
      console.log(
        `  [${new Date().toISOString().slice(11, 19)}] ${payload.addr} → reading #${result.reading_id} | ` +
        `temp=${payload.temperature}°C | x_vel=${payload.x_velocity_mm_sec} mm/s`
      );
    } else if (res.status === 409) {
      // duplicate counter, skip
    } else {
      console.error(`  ${payload.addr} → ERROR ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`  ${payload.addr} → NETWORK ERROR: ${err.message}`);
  }
});
