export default async function handler(req, res) {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) return res.status(500).json({ error: "FINNHUB_API_KEY not set" });

  const finnhubSymbols = { VIX: "^VIX", SPX: "^GSPC", DXY: "DX-Y.NYB" };
  const yahooSymbols = { ZB: "ZB=F", ZN: "ZN=F", US10Y: "^TNX" };
  const results = {};
  const errors = {};

  await Promise.all(Object.entries(finnhubSymbols).map(async ([key, symbol]) => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
      const d = await r.json();
      if (d && typeof d.c === "number" && d.c !== 0) {
        results[key] = { value: +d.c.toFixed(2), change: +d.d.toFixed(2), changePct: +d.dp.toFixed(2), source: "finnhub" };
      } else { errors[key] = "no data"; }
    } catch (e) { errors[key] = String(e); }
  }));

  await Promise.all(Object.entries(yahooSymbols).map(async ([key, symbol]) => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`, { headers: { "User-Agent": "Mozilla/5.0" } });
      const d = await r.json();
      const meta = d?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === "number") {
        const current = meta.regularMarketPrice;
        const prev = meta.previousClose ?? meta.chartPreviousClose;
        const change = current - prev;
        results[key] = { value: +current.toFixed(3), change: +change.toFixed(3), changePct: +((change / prev) * 100).toFixed(2), source: "yahoo" };
      } else { errors[key] = "no data"; }
    } catch (e) { errors[key] = String(e); }
  }));

  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
  return res.status(200).json({ prices: results, errors, timestamp: Date.now() });
}
