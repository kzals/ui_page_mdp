"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const KWH_FORMATTER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const WIB_TIME_ZONE = "Asia/Jakarta";
const RANGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatWibDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: WIB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function formatWibLabel(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function wibInputToIso(value) {
  if (!value) {
    return "";
  }

  return `${value}:00+07:00`;
}

const GRAFANA_PANEL_URL =
  "https://grafana.trisulatextile.com/public-dashboards/86f16a5a5ea84ae9a591c13ec10d0c0e";

export default function HomePage() {
  const [pricePerKwhInput, setPricePerKwhInput] = useState(1500);
  const [appliedPricePerKwh, setAppliedPricePerKwh] = useState(1500);
  const [totalKwh, setTotalKwh] = useState(0);
  // may be assigned by fetch but intentionally not referenced in some layouts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dataSource, setDataSource] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sourceField, setSourceField] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [grafanaLoaded, setGrafanaLoaded] = useState(false);
  const [grafanaTimedOut, setGrafanaTimedOut] = useState(false);
  const [breakdown, setBreakdown] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [queryMode, setQueryMode] = useState("latest");
  const [rangeStart, setRangeStart] = useState(() =>
    formatWibDateTime(new Date(Date.now() - RANGE_WINDOW_MS))
  );
  const [rangeEnd, setRangeEnd] = useState(() => formatWibDateTime(new Date()));
  const [timeRange, setTimeRange] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [appliedDevices, setAppliedDevices] = useState([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestIdRef.current;

    const fetchListrik = async () => {
      try {
        const params = new URLSearchParams();
        if (queryMode === "range") {
          params.append("mode", "range");
          params.append("from", wibInputToIso(rangeStart));
          params.append("to", wibInputToIso(rangeEnd));
          if (appliedDevices && appliedDevices.length > 0) {
            params.append("device", appliedDevices.join(","));
          } else {
            params.append("device", "__none__");
          }
        } else {
          params.append("mode", "latest");
          if (appliedDevices && appliedDevices.length > 0) {
            params.append("device", appliedDevices.join(","));
          } else {
            params.append("device", "__none__");
          }
        }

        const response = await fetch(`/api/listrik?${params}`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal mengambil data listrik.");
        }

        if (isMounted && requestId === requestIdRef.current) {
          setTotalKwh(Number(data.totalKwh) || 0);
          setDataSource(typeof data.source === "string" ? data.source : "");
          setSourceField(typeof data.sourceField === "string" ? data.sourceField : "");
          setTimeRange(data.timeRange || null);
          setBreakdown(typeof data.breakdown === "object" && data.breakdown ? data.breakdown : {});
          setErrorMessage("");
        }
      } catch (error) {
        if (isMounted && requestId === requestIdRef.current) {
          setErrorMessage(
            error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui."
          );
        }
      } finally {
        if (isMounted && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchListrik();
    const timer = setInterval(fetchListrik, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [queryMode, rangeStart, rangeEnd, appliedDevices]);

  // fetch available devices once
  useEffect(() => {
    let mounted = true;
    const fetchDevices = async () => {
      try {
        const resp = await fetch(`/api/listrik?mode=devices`, { cache: "no-store" });

        if (!resp.ok) {
          // try to read body safely (may be empty or non-json)
          const txt = await resp.text();
          let body = { error: resp.statusText };
          try {
            body = txt ? JSON.parse(txt) : body;
          } catch {
            body = { error: txt || resp.statusText };
          }
          console.error("Failed fetching devices:", body);
          if (mounted) setErrorMessage(body.error || "Gagal memuat daftar MDP dari server.");
          return;
        }

        const data = await resp.json();
        if (mounted) {
          const nextDevices = Array.isArray(data.devices) ? data.devices : [];
          setDevices(nextDevices);
          // select all by default and apply immediately on first load
          setSelectedDevices(nextDevices.slice());
          setAppliedDevices(nextDevices.slice());
        }
      } catch (e) {
        console.error("Error fetching devices:", e);
        if (mounted) setErrorMessage("Gagal memuat daftar MDP: " + (e instanceof Error ? e.message : String(e)));
      }
    };

    fetchDevices();
    return () => {
      mounted = false;
    };
  }, []);

  function toggleDevice(device) {
    setSelectedDevices((prev) => {
      if (prev.includes(device)) return prev.filter((d) => d !== device);
      return [...prev, device];
    });
  }

  function selectAllDevices() {
    setSelectedDevices(devices.slice());
  }

  function clearAllDevices() {
    setSelectedDevices([]);
  }

  const totalCost = useMemo(() => totalKwh * appliedPricePerKwh, [totalKwh, appliedPricePerKwh]);

  const STAMP_DUTY = 10000; // fixed materai
  const PJU_RATE = 0.03; // 3%
  const pjuAmount = useMemo(() => (queryMode === "range" ? totalCost * PJU_RATE : 0), [totalCost, queryMode]);
  const overallTotal = useMemo(() => totalCost + (queryMode === "range" ? STAMP_DUTY + pjuAmount : 0), [totalCost, pjuAmount, queryMode]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function simpanKeDatabase() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/listrik", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalKwh,
          hargaPerKwh: appliedPricePerKwh,
          totalBiaya: totalCost,
          mdpSelected: selectedDevices,
        }),
      });

      const responseText = await response.text();
      let payload = null;
      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      const errorDetail = payload?.details ? ` Detail: ${payload.details}` : "";

      if (!response.ok) {
        const message = `${payload?.error || responseText || "Gagal menyimpan data ke InfluxDB."}${errorDetail}`;
        setSaveMessage(message);
        alert(message);
        return;
      }

      const successMessage = "Data berhasil disimpan ke InfluxDB.";
      setSaveMessage(successMessage);
      alert(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan data ke InfluxDB.";
      setSaveMessage(message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function terapkanHargaListrik() {
    const nextPrice = Math.max(0, Number(pricePerKwhInput) || 0);
    const snapshotMode = queryMode;
    const snapshotTotalKwh = totalKwh;
    const snapshotTimeRange = timeRange;
    const snapshotDevices = [...new Set(selectedDevices)].sort();

    setAppliedPricePerKwh(nextPrice);
    setAppliedDevices(snapshotDevices);

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const nextTotalBiaya = snapshotTotalKwh * nextPrice;
      const response = await fetch("/api/listrik", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalKwh: snapshotTotalKwh,
          hargaPerKwh: nextPrice,
          totalBiaya: nextTotalBiaya,
          mdpSelected: snapshotDevices,
          calculationMode: snapshotMode,
          timeRange: snapshotTimeRange,
        }),
      });

      const responseText = await response.text();
      let payload = null;
      try {
        payload = responseText ? JSON.parse(responseText) : null;
      } catch {
        payload = null;
      }

      const errorDetail = payload?.details ? ` Detail: ${payload.details}` : "";

      if (!response.ok) {
        const message = `${payload?.error || responseText || "Gagal menyimpan data ke InfluxDB."}${errorDetail}`;
        setSaveMessage(message);
        alert(message);
        return;
      }

      const successMessage = "Harga diterapkan dan data berhasil disimpan ke InfluxDB.";
      setSaveMessage(successMessage);
      alert(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan data ke InfluxDB.";
      setSaveMessage(message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!grafanaLoaded) {
        setGrafanaTimedOut(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [grafanaLoaded]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-5 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 xl:max-w-7xl">
        <section className="rounded-2xl border border-white/10 bg-white/95 p-5 shadow-2xl backdrop-blur md:p-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Dashboard Konsumsi Listrik
          </h1>
          <div className="mt-6 space-y-5">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Mode Penghitungan
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQueryMode("latest")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      queryMode === "latest"
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                      24 Jam Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueryMode("range")}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      queryMode === "range"
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Jarak Waktu Tertentu
                  </button>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Pilih MDP untuk Perhitungan
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllDevices}
                      className="rounded-md bg-slate-200 px-2 py-1 text-sm"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={clearAllDevices}
                      className="rounded-md bg-slate-200 px-2 py-1 text-sm"
                    >
                      Kosongkan
                    </button>
                  </div>
                  <div className="flex items-center justify-start gap-3 overflow-x-auto whitespace-nowrap">
                    {devices.length === 0 ? (
                      <div className="text-xs text-slate-500">Memuat daftar MDP...</div>
                    ) : (
                      devices.map((d) => (
                        <label key={d} className="inline-flex min-w-fit items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedDevices.includes(d)}
                            onChange={() => toggleDevice(d)}
                            className="rounded"
                          />
                          <span>{d}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </label>
            </div>

            {queryMode === "range" && (
              <div className="space-y-3 rounded-lg bg-slate-100 p-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">Dari Waktu WIB:</span>
                  <input
                    type="datetime-local"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <p className="mt-1 text-xs text-slate-500">Format waktu mengikuti WIB.</p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">Sampai Waktu WIB:</span>
                  <input
                    type="datetime-local"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <p className="mt-1 text-xs text-slate-500">Waktu saat ini dalam WIB.</p>
                </label>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Harga Listrik per kWh (Rupiah)
              </span>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  value={pricePerKwhInput}
                  onChange={(e) => setPricePerKwhInput(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
                <button
                  type="button"
                  onClick={terapkanHargaListrik}
                  disabled={isSaving || isLoading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Menerapkan..." : "Terapkan MDP & Harga"}
                </button>
              </div>
            </label>

            
            

            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {queryMode === "range"
                  ? "Total Energi"
                  : "Total Energi"}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isLoading ? "Memuat..." : `${KWH_FORMATTER.format(totalKwh)} kWh`}
              </p>
              {timeRange && (
                <p className="mt-1 text-xs text-slate-500">
                  {queryMode === "range"
                    ? `Dari Tanggal ${formatWibLabel(timeRange.from)} WIB hingga ${formatWibLabel(timeRange.to)} WIB`
                    : `24 jam terakhir: ${formatWibLabel(timeRange.from)} WIB hingga ${formatWibLabel(timeRange.to)} WIB`}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-cyan-600 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
                Total Biaya ({queryMode === "range" ? "Rupiah" : "Rupiah"})
              </p>
              <p className="mt-1 text-3xl font-extrabold">
                {RUPIAH_FORMATTER.format(totalCost)}
              </p>
              {saveMessage ? (
                <p className="mt-2 text-xs font-medium text-cyan-50/90">{saveMessage}</p>
              ) : null}
            </div>

            {queryMode === "range" && (
              <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/95 p-4 text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Materai</span>
                  <span className="font-medium">{RUPIAH_FORMATTER.format(STAMP_DUTY)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">PJU ({Math.round(PJU_RATE * 100)}%)</span>
                  <span className="font-medium">{RUPIAH_FORMATTER.format(pjuAmount)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Biaya Keseluruhan</span>
                  <span className="text-lg font-bold">{RUPIAH_FORMATTER.format(overallTotal)}</span>
                </div>
              </div>
            )}

            {breakdown && Object.keys(breakdown).length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md bg-white/90 p-3 text-slate-900">
                <h3 className="mb-2 text-sm font-semibold">Rincian per MDP</h3>
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-2 py-1">MDP</th>
                      <th className="px-2 py-1">Energi (kWh)</th>
                      <th className="px-2 py-1">Biaya (IDR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(breakdown).map((dev) => {
                      const energy = Number(breakdown[dev] || 0);
                      const cost = energy * appliedPricePerKwh;
                      return (
                        <tr key={dev} className="border-t">
                          <td className="px-2 py-2">{dev}</td>
                          <td className="px-2 py-2">{KWH_FORMATTER.format(energy)}</td>
                          <td className="px-2 py-2">{RUPIAH_FORMATTER.format(cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="px-2 py-2">Total</td>
                      <td className="px-2 py-2">
                        {KWH_FORMATTER.format(Object.values(breakdown || {}).reduce((s, v) => s + Number(v || 0), 0))}
                      </td>
                      <td className="px-2 py-2">
                        {RUPIAH_FORMATTER.format(
                          Object.values(breakdown || {}).reduce((s, v) => s + Number(v || 0), 0) *
                            appliedPricePerKwh
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Grafana Panel</h2>
            <p className="mt-1 text-sm text-slate-300">
              Panel berikut tampil langsung di halaman yang sama.
            </p>
          </div>
          <div className="relative">
            <div className="border-b border-white/10 bg-slate-950 px-4 py-2 text-xs text-slate-400 break-all">
              {GRAFANA_PANEL_URL}
            </div>
            {!grafanaLoaded || grafanaTimedOut ? (
              <div className="border-b border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                {grafanaTimedOut ? (
                  <div className="space-y-2">
                    <p className="font-medium text-amber-300">
                      Grafana tidak tampil di dalam iframe.
                    </p>
                    <p className="text-slate-300">
                      Ini biasanya bukan karena layout, tetapi karena pembatasan embed dari
                      sisi Grafana, browser, atau koneksi jaringan.
                    </p>
                    <a
                      href={GRAFANA_PANEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-md bg-cyan-500 px-3 py-1.5 font-medium text-white hover:bg-cyan-400"
                    >
                      Buka Grafana di tab ini
                    </a>
                  </div>
                ) : (
                  <p>Memuat panel Grafana...</p>
                )}
              </div>
            ) : null}
            <iframe
              src={GRAFANA_PANEL_URL}
              title="Grafana Monitoring Panel"
              className="h-[520px] w-full bg-slate-950 md:h-[760px]"
              style={{ border: "0" }}
              allow="fullscreen"
              loading="eager"
              onLoad={() => {
                setGrafanaLoaded(true);
                setGrafanaTimedOut(false);
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
