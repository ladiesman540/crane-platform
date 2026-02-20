/**
 * Load temperature CSV directly into Neon DB with original timestamps.
 * Usage: node load-csv-direct.js <csv-path>
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SENSOR_ID = "877af3a1-6259-474a-a359-01817049037c";
const DB_URL = "postgresql://neondb_owner:npg_H8z7LwOUZFyk@ep-purple-heart-akev6dhq-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node load-csv-direct.js <path-to-csv>");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(csvPath), "utf-8");
const lines = raw.trim().split("\n").slice(1);

const readings = lines
  .map((line) => {
    const [temp, time] = line.split(",");
    return { temperature: parseFloat(temp), time: time.trim() };
  })
  .filter((r) => !isNaN(r.temperature) && r.time)
  .reverse();

console.log(`Parsed ${readings.length} readings`);
console.log(`  First: ${readings[0].time} (${readings[0].temperature}°C)`);
console.log(`  Last:  ${readings[readings.length - 1].time} (${readings[readings.length - 1].temperature}°C)`);

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to Neon\n");

  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < readings.length; i += BATCH) {
    const batch = readings.slice(i, i + BATCH);
    const values = [];
    const params = [];
    batch.forEach((r, j) => {
      const offset = j * 4;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      params.push(SENSOR_ID, r.time, 95, r.temperature);
    });

    const sql = `INSERT INTO readings (sensor_id, "timestamp", battery_percent, temperature) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`;
    const result = await client.query(sql, params);
    inserted += result.rowCount;
    console.log(`  ${Math.min(i + BATCH, readings.length)}/${readings.length} (${inserted} inserted)`);
  }

  console.log(`\nDone! Inserted ${inserted} rows.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
