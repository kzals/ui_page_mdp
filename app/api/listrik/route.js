import { InfluxDB, Point } from "@influxdata/influxdb-client";

export const runtime = "nodejs";

const POWER_FIELDS = ["P_active_total", "p_active_total", "power_kw", "power"];
const DEFAULT_DEVICE = process.env.INFLUX_DEVICE || "mdp-1";
const TARGET_BUCKET = process.env.INFLUX_BUCKET || "OtomasiEng";
const TARGET_MEASUREMENT = process.env.INFLUX_MEASUREMENT || "pm2220";

function parseTimeParam(param) {
  if (!param) return null;
  
  // Handle relative time formats like -24h, -1h, -7d
  if (param.startsWith("-")) {
    const match = param.match(/^-(\d+)([hdm])$/);
    if (match) {
      const [, value, unit] = match;
      const num = parseInt(value, 10);
      let ms = 0;
      
      if (unit === "h") ms = num * 60 * 60 * 1000;
      else if (unit === "d") ms = num * 24 * 60 * 60 * 1000;
      else if (unit === "m") ms = num * 60 * 1000;
      
      if (ms > 0) {
        return new Date(Date.now() - ms);
      }
    }
    return param; // Return as-is if not parsed
  }
  
  // Handle now()
  if (param === "now()") {
    return new Date();
  }
  
  // Handle ISO format
  const parsed = new Date(param);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

async function getIntegratedEnergy(
  queryApi,
  bucket,
  measurement,
  fieldName,
  startDate,
  stopDate,
  device
) {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: time(v: ${JSON.stringify(startDate.toISOString())}), stop: time(v: ${JSON.stringify(stopDate.toISOString())}))
      |> filter(fn: (r) =>
        r._measurement == "${measurement}" and
        r._field == "${fieldName}" and
        r.device == "${device}"
      )
      |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
      |> integral(unit: 1h)
  `;

  const rows = await queryApi.collectRows(fluxQuery);
  const latestRow = rows[rows.length - 1];
  const value = latestRow ? Number(latestRow._value) : Number.NaN;

  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function GET(request) {
  const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG } = process.env;
  const measurement = TARGET_MEASUREMENT;

  const url = new URL(request.url);
  const queryFrom = url.searchParams.get("from") || "-24h";
  const queryTo = url.searchParams.get("to") || "now()";
  const queryMode = url.searchParams.get("mode") || "latest";
  const queryDeviceRawParam = url.searchParams.get("device");
  let queryDevices;
  if (queryDeviceRawParam === "__none__") {
    queryDevices = [];
  } else if (queryDeviceRawParam) {
    queryDevices = queryDeviceRawParam.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    queryDevices = [DEFAULT_DEVICE];
  }

  const startTime = parseTimeParam(queryFrom);
  const stopTime = parseTimeParam(queryTo);

  if (!startTime) {
    return Response.json(
      { error: "Invalid 'from' parameter. Use ISO format or relative time (e.g., -24h)" },
      { status: 400 }
    );
  }
  
  if (!stopTime) {
    return Response.json(
      { error: "Invalid 'to' parameter. Use ISO format or relative time (e.g., now())" },
      { status: 400 }
    );
  }

  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG) {
    return Response.json(
      {
        error:
          "InfluxDB env is not fully configured. Set INFLUX_URL, INFLUX_TOKEN, and INFLUX_ORG.",
      },
      { status: 500 }
    );
  }

  try {
    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    const queryApi = influxDB.getQueryApi(INFLUX_ORG);

    if (queryMode === "range") {
      // Try to get integrated energy for range mode
      // If no devices requested, return empty breakdown with zero totals
      if (!queryDevices || queryDevices.length === 0) {
        return Response.json({
          totalKwh: 0,
          source: "none",
          sourceField: null,
          devices: [],
          breakdown: {},
          timeRange: { from: queryFrom, to: queryTo },
          mode: "range",
        });
      }

      for (const fieldName of POWER_FIELDS) {
        try {
          const breakdown = {};
          let sumKwh = 0;
          let foundAny = false;

          for (const device of queryDevices) {
            try {
              const k = await getIntegratedEnergy(
                queryApi,
                TARGET_BUCKET,
                measurement,
                fieldName,
                startTime,
                stopTime,
                device
              );
              if (k !== null && k >= 0) {
                breakdown[device] = k;
                sumKwh += k;
                foundAny = true;
              } else {
                breakdown[device] = 0;
              }
            } catch (devErr) {
              console.error(`Error querying device ${device} field ${fieldName}:`, devErr);
              breakdown[device] = 0;
            }
          }

          if (foundAny) {
            return Response.json({
              totalKwh: sumKwh,
              source: "power-integrated-multi",
              sourceField: fieldName,
              devices: queryDevices,
              breakdown,
              timeRange: { from: queryFrom, to: queryTo },
              mode: "range",
            });
          }
        } catch (fieldError) {
          console.error(`Error querying field ${fieldName}:`, fieldError);
          // Continue to next field
        }
      }
      
      return Response.json(
        {
          error:
            "Tidak ada data daya aktif pada rentang waktu yang dipilih. Coba pilih rentang yang lebih dekat dengan data meter.",
          timeRange: { from: queryFrom, to: queryTo },
          mode: "range",
        },
        { status: 404 }
      );
    }

    if (queryMode === "devices") {
      const devices = await getAvailableDevices(queryApi, TARGET_BUCKET, measurement);
      return Response.json({ devices, count: devices.length, mode: "devices" });
    }

    for (const fieldName of POWER_FIELDS) {
      try {
        // handle empty device list
        if (!queryDevices || queryDevices.length === 0) {
          return Response.json({
            totalKwh: 0,
            source: "none",
            sourceField: null,
            devices: [],
            breakdown: {},
            timeRange: { from: queryFrom, to: queryTo },
            mode: "latest",
          });
        }

        const breakdown = {};
        let sumKwh = 0;
        let foundAny = false;

        for (const device of queryDevices) {
          try {
            const k = await getIntegratedEnergy(
              queryApi,
                TARGET_BUCKET,
              measurement,
              fieldName,
              startTime,
              stopTime,
              device
            );
            if (k !== null && k >= 0) {
              breakdown[device] = k;
              sumKwh += k;
              foundAny = true;
            } else {
              breakdown[device] = 0;
            }
          } catch (err) {
            console.error(`Error querying device ${device} for latest field ${fieldName}:`, err);
            breakdown[device] = 0;
          }
        }

        if (foundAny) {
          return Response.json({
            totalKwh: sumKwh,
            source: "power-integrated-multi",
            sourceField: fieldName,
            devices: queryDevices,
            breakdown,
            rawPowerKw: null,
            intervalMinutes: null,
            timeRange: { from: queryFrom, to: queryTo },
            mode: "latest",
          });
        }
      } catch (err) {
        console.error(`Error processing latest mode for field ${fieldName}:`, err);
      }
    }

    return Response.json({
      totalKwh: 0,
      source: "empty",
      sourceField: null,
      rawPowerKw: null,
      intervalMinutes: null,
      mode: queryMode,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to fetch data from InfluxDB.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG } = process.env;

  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG) {
    return Response.json(
      {
        error:
          "InfluxDB env is not fully configured. Set INFLUX_URL, INFLUX_TOKEN, and INFLUX_ORG.",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const totalKwh = Number(body?.totalKwh);
  const hargaPerKwh = Number(body?.hargaPerKwh);
  const totalBiaya = Number(body?.totalBiaya);
  const calculationMode = typeof body?.calculationMode === "string" ? body.calculationMode.trim() : "";
  const timeRange = body?.timeRange && typeof body.timeRange === "object" ? body.timeRange : null;
  const mdpSelected = Array.isArray(body?.mdpSelected)
    ? body.mdpSelected.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (![totalKwh, hargaPerKwh, totalBiaya].every((value) => Number.isFinite(value))) {
    return Response.json(
      {
        error: "totalKwh, hargaPerKwh, dan totalBiaya harus berupa angka yang valid.",
      },
      { status: 400 }
    );
  }

  try {
    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    const writeApi = influxDB.getWriteApi(INFLUX_ORG, TARGET_BUCKET, "s");
    const point = new Point(TARGET_MEASUREMENT)
      .floatField("total_kwh", totalKwh)
      .floatField("harga_per_kwh", hargaPerKwh)
      .floatField("total_biaya", totalBiaya)
      .tag("sumber", mdpSelected.length > 0 ? mdpSelected.join(",") : "none")
      .tag("mode", calculationMode || "unknown");

    if (timeRange?.from) {
      point.tag("range_from", String(timeRange.from));
    }

    if (timeRange?.to) {
      point.tag("range_to", String(timeRange.to));
    }

    writeApi.writePoint(point);
    await writeApi.close();

    return Response.json({
      ok: true,
      bucket: TARGET_BUCKET,
      measurement: TARGET_MEASUREMENT,
      totalKwh,
      hargaPerKwh,
      totalBiaya,
      mdpSelected,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to save data to InfluxDB.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getAvailableDevices(queryApi, bucket, measurement) {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "${measurement}")
      |> keep(columns: ["device"])
      |> distinct(column: "device")
  `;

  const rows = await queryApi.collectRows(fluxQuery);
  const devices = rows
    .map((r) => r.device || r._value)
    .filter(Boolean);

  return Array.from(new Set(devices));
}