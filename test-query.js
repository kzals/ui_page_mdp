// Simple test to debug the range query
import { InfluxDB } from "@influxdata/influxdb-client";

async function testQuery() {
  const INFLUX_URL = process.env.INFLUX_URL || "http://192.168.3.17:8086";
  const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
  const INFLUX_ORG = process.env.INFLUX_ORG || "TTI";

  if (!INFLUX_TOKEN) {
    console.error("Missing INFLUX_TOKEN environment variable. Aborting test.");
    process.exit(1);
  }

  const influxDB = new InfluxDB({
    url: INFLUX_URL,
    token: INFLUX_TOKEN,
  });

  const queryApi = influxDB.getQueryApi(INFLUX_ORG);
  
  // Test 1: Latest query (should work)
  console.log("Test 1: Latest query");
  const latestQuery = `
    from(bucket: "OtomasiEng")
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "pm2220" and r._field == "P_active_total")
      |> last()
  `;
  
  try {
    const latestRows = await queryApi.collectRows(latestQuery);
    console.log("Latest rows:", latestRows.length);
    if (latestRows.length > 0) {
      console.log("Sample:", latestRows[0]);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
  
  // Test 2: Range query
  console.log("\nTest 2: Range query");
  const now = new Date();
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const startISO = startTime.toISOString();
  const stopISO = now.toISOString();
  
  const rangeQuery = `
    from(bucket: "OtomasiEng")
      |> range(start: ${JSON.stringify(startISO)}, stop: ${JSON.stringify(stopISO)})
      |> filter(fn: (r) => r._measurement == "pm2220" and r._field == "P_active_total")
  `;
  
  console.log("Query:", rangeQuery);
  
  try {
    const rangeRows = await queryApi.collectRows(rangeQuery);
    console.log("Range rows:", rangeRows.length);
    if (rangeRows.length > 0) {
      console.log("First:", rangeRows[0]);
      console.log("Last:", rangeRows[rangeRows.length - 1]);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
  
  process.exit(0);
}

testQuery().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
