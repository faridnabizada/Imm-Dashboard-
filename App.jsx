import { useState, useEffect, useCallback } from "react";

const T = {
  bg: "#080C10", surface: "#0D1117", card: "#111820", border: "#1C2A36",
  bull: "#00E676", bear: "#FF3D57", gold: "#FFD600", neut: "#546E7A",
  text: "#CFD8DC", dim: "#37474F",
};

const INSTRUMENTS = [
  { id: "ZB",    label: "ZB — 30Y Bond Futures", dir: "normal",   bullNote: "Long-end demand → risk-on → NQ up",       bearNote: "Long-end selling → risk-off → NQ down" },
  { id: "ZN",    label: "ZN — 10Y Bond Futures", dir: "normal",   bullNote: "Money into bonds → yields fall → NQ up",  bearNote: "Bonds selling off → yields rise → NQ down" },
  { id: "US10Y", label: "US10Y Yield",            dir: "inverted", bullNote: "Yield falling → growth trade on",         bearNote: "Yield rising → pressure on Nasdaq" },
  { id: "DXY",   label: "DXY — Dollar Index",     dir: "inverted", bullNote: "Weak dollar → risk assets rally",         bearNote: "Strong dollar → headwinds for NQ" },
  { id: "VIX",   label: "VIX — Fear Index",       dir: "inverted", bullNote: "Low fear → institutional buying",         bearNote: "Elevated fear → sell bias" },
  { id: "SPX",   label: "SPX — S&P 500",          dir: "normal",   bullNote: "SPX leading higher → NQ follows",        bearNote: "SPX breaking down → NQ follows" },
];

const FALLBACK = {
  ZB: { value: 112.15, change: 0 }, ZN: { value: 109.20, change: 0 },
  US10Y: { value: 4.49, change: 0 }, DXY: { value: 101.27, change: 0 },
  VIX: { value: 16.59, change: 0 }, SPX: { value: 7483, change: 0 },
};

function getSignal(id, prices) {
  const p = prices[id];
  if (!p) return 0;
  const inverted = id === "US10Y" || id === "DXY" || id === "VIX";
  if (inverted) return p.change < 0 ? 1 : p.change > 0 ? -1 : 0;
  return p.change > 0 ? 1 : p.change < 0 ? -1 : 0;
}

function useLivePrices() {
  const [prices, setPrices] = useState(FALLBACK);
  const [status, setStatus] = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchPrices = useCallback(async () => {
    try {
      const r = await fetch("/api/prices");
      const data = await r.json();
      const liveKeys = Object.keys(data.prices || {});
      if (liveKeys.length === 6) { setPrices(data.prices); setStatus("live"); }
      else if (liveKeys.length > 0) { setPrices(p => ({ ...p, ...data.prices })); setStatus("partial"); }
      else setStatus("fallback");
      setLastUpdate(new Date());
    } catch { setStatus("fallback"); }
  }, []);

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 30000);
    return () => clearInterval(t);
  }, [fetchPrices]);

  return { prices, status, lastUpdate, refresh: fetchPrices };
}

function ScorePulse({ score }) {
  const abs = Math.abs(score);
  const color = abs >= 5 ? (score > 0 ? T.bull : T.bear) : abs >= 3 ? (score > 0 ? "#69F0AE" : "#FF6D00") : T.neut;
  const label = abs >= 5 ? (score > 0 ? "STRONG LONG" : "STRONG SHORT") : abs >= 3 ? (score > 0 ? "LONG BIAS" : "SHORT BIAS") : "NO BIAS";
  const r = 70, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="80" cy="80" r={r} fill="none" stroke={T.border} strokeWidth="8" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - abs / 6)} strokeLinecap="round"
            style={{ transition: "all 0.8s ease", filter: abs >= 4 ? `drop-shadow(0 0 8px ${color})` : "none" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{score > 0 ? "+" : ""}{score}</span>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: T.dim, letterSpacing: 2 }}>OUT OF 6</span>
        </div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color, letterSpacing: 3 }}>{label}</div>
      <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${(abs / 6) * 100}%`, background: color, borderRadius: 2, transition: "all 0.8s ease" }} />
      </div>
    </div>
  );
}

function InstrumentRow({ inst, signal, price }) {
  const color = signal === 1 ? T.bull : signal === -1 ? T.bear : T.neut;
  const chgColor = price?.change > 0 ? T.bull : price?.change < 0 ? T.bear : T.neut;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 8, background: T.card, border: `1px solid ${signal !== 0 ? color + "30" : T.border}`, transition: "border-color 0.4s" }}>
      <div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: T.text, fontWeight: 600 }}>{inst.label}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: T.dim, marginTop: 2 }}>{signal === 1 ? inst.bullNote : signal === -1 ? inst.bearNote : "Watching..."}</div>
      </div>
      <div style={{ fontFamily: "monospace", textAlign: "right", minWidth: 65 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{price?.value}</div>
        <div style={{ fontSize: 11, color: chgColor }}>{price?.change > 0 ? "+" : ""}{price?.change}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 88 }}>
        <span style={{ fontSize: 14, color }}>{signal === 1 ? "▲" : signal === -1 ? "▼" : "—"}</span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color, fontWeight: 700, letterSpacing: 1 }}>{signal === 1 ? "BULLISH" : signal === -1 ? "BEARISH" : "NEUTRAL"}</span>
      </div>
    </div>
  );
}

function ICTChecklist({ score, signals }) {
  const isLong = score > 0, isShort = score < 0;
  const items = isLong ? [
    { label: "Matrix score >= +4", done: score >= 4 },
    { label: "ZB + ZN rising", done: signals.ZB === 1 && signals.ZN === 1 },
    { label: "US10Y falling", done: signals.US10Y === 1 },
    { label: "DXY falling", done: signals.DXY === 1 },
    { label: "VIX below 20 or falling", done: signals.VIX === 1 },
    { label: "SPX trending up", done: signals.SPX === 1 },
    { label: "NQ sweeps SSL (sell-side liquidity)", done: false, manual: true },
    { label: "Bullish MSS confirmed on NQ", done: false, manual: true },
    { label: "Bullish FVG present as entry", done: false, manual: true },
  ] : isShort ? [
    { label: "Matrix score <= -4", done: score <= -4 },
    { label: "ZB + ZN falling", done: signals.ZB === -1 && signals.ZN === -1 },
    { label: "US10Y rising", done: signals.US10Y === -1 },
    { label: "DXY rising", done: signals.DXY === -1 },
    { label: "VIX above 20 or rising", done: signals.VIX === -1 },
    { label: "SPX trending down", done: signals.SPX === -1 },
    { label: "NQ sweeps BSL (buy-side liquidity)", done: false, manual: true },
    { label: "Bearish MSS confirmed on NQ", done: false, manual: true },
    { label: "Bearish FVG present as entry", done: false, manual: true },
  ] : [];

  if (!items.length) return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: T.dim, letterSpacing: 3 }}>ICT ENTRY CHECKLIST</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: T.dim, textAlign: "center", padding: "20px 0" }}>Matrix neutral — no setup active</div>
    </div>
  );

  const auto = items.filter(i => !i.manual);
  const confirmed = auto.filter(i => i.done).length;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: T.dim, letterSpacing: 3 }}>ICT ENTRY CHECKLIST</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: T.gold }}>{confirmed}/{auto.length} AUTO</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: item.done ? T.bull : "transparent", border: `1.5px solid ${item.done ? T.bull : item.manual ? T.dim : T.neut}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.done && <span style={{ color: T.bg, fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: item.done ? T.text : item.manual ? T.dim : T.neut }}>
              {item.label}{item.manual && <span style={{ color: T.dim }}> — check chart</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel({ analysis, loading, onRefresh }) {
  const biasColor = analysis?.bias === "LONG" ? T.bull : analysis?.bias === "SHORT" ? T.bear : T.neut;
  const convColor = analysis?.conviction === "HIGH" ? T.gold : analysis?.conviction === "MEDIUM" ? "#FF9800" : T.neut;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: T.dim, letterSpacing: 3 }}>AI ANALYSIS</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: T.text, marginTop: 2 }}>Institutional Signal Intelligence</div>
        </div>
        <button onClick={onRefresh} disabled={loading} style={{ fontFamily: "monospace", fontSize: 11, color: T.gold, background: "transparent", border: `1px solid ${T.gold}40`, borderRadius: 6, padding: "6px 12px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
          {loading ? "ANALYZING..." : "REFRESH"}
        </button>
      </div>
      {loading && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
          <span style={{ fontFamily: "monospace", fontSize: 11, color: T.dim }}>Reading the matrix...</span>
        </div>
      )}
      {analysis && !loading && !analysis.error && (
        <>
          <div style={{ padding: "12px 16px", background: `${biasColor}12`, border: `1px solid ${biasColor}30`, borderRadius: 8 }}>
            <div style={{ fontFamily: "monospace", fontSize: 14, color: biasColor, fontWeight: 700 }}>{analysis.headline}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[{ label: "BIAS", value: analysis.bias, color: biasColor }, { label: "CONVICTION", value: analysis.conviction, color: convColor }, { label: "SESSION", value: analysis.session, color: T.text }].map(item => (
              <div key={item.label} style={{ background: T.surface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}` }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: T.dim, letterSpacing: 2 }}>{item.label}</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: item.color, fontWeight: 700, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {[{ label: "ICT SETUP", value: analysis.ict_setup }, { label: "KEY DRIVER", value: analysis.key_driver }, { label: "LIQUIDITY TARGET", value: analysis.liquidity_target }, { label: "INVALIDATION", value: analysis.invalidation }, { label: "RISK", value: analysis.risk }, { label: "SESSION NOTE", value: analysis.session_note }].map(item => item.value && (
            <div key={item.label}>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: T.dim, letterSpacing: 2, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: T.text, lineHeight: 1.5 }}>{item.value}</div>
            </div>
          ))}
        </>
      )}
      {!analysis && !loading && <div style={{ fontFamily: "monospace", fontSize: 12, color: T.dim, textAlign: "center", padding: "20px 0" }}>Click REFRESH to get AI analysis</div>}
      {analysis?.error && <div style={{ fontFamily: "monospace", fontSize: 12, color: T.bear }}>Error: {analysis.error}</div>}
    </div>
  );
}

export default function App() {
  const { prices, status, lastUpdate, refresh } = useLivePrices();
  const [analysis, setAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [estTime, setEstTime] = useState("");

  const signals = {};
  INSTRUMENTS.forEach(inst => { signals[inst.id] = getSignal(inst.id, prices); });
  const score = Object.values(signals).reduce((a, b) => a + b, 0);
  const scoreColor = score >= 4 ? T.bull : score <= -4 ? T.bear : score > 0 ? "#69F0AE" : score < 0 ? "#FF6D00" : T.neut;

  useEffect(() => {
    const upd = () => setEstTime(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    upd(); const t = setInterval(upd, 1000); return () => clearInterval(t);
  }, []);

  const estHour = parseInt(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const isAM = estHour >= 9 && estHour < 11;
  const isPM = estHour >= 14 && estHour < 16;
  const isPre = estHour >= 8 && estHour < 9;
  const session = isAM ? { label: "AM KILL ZONE — PRIME", color: T.bull } : isPM ? { label: "PM KILL ZONE — PRIME", color: T.bull } : isPre ? { label: "PRE-MARKET — PREP TIME", color: T.gold } : { label: "OFF WINDOW", color: T.neut };

  const statusMap = { connecting: { color: T.gold, label: "CONNECTING..." }, live: { color: T.bull, label: "LIVE DATA" }, partial: { color: "#FF9800", label: "PARTIAL LIVE" }, fallback: { color: T.bear, label: "FALLBACK PRICES" } };
  const st = statusMap[status] || statusMap.connecting;

  const refreshAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const signalSummary = INSTRUMENTS.map(inst => {
        const sig = signals[inst.id], p = prices[inst.id];
        return `${inst.id}: ${p?.value} (${p?.change >= 0 ? "+" : ""}${p?.change}) → ${sig === 1 ? "BULLISH" : sig === -1 ? "BEARISH" : "NEUTRAL"}`;
      }).join("\n");
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score, signalSummary, timeStr: estTime }) });
      setAnalysis(await r.json());
    } catch (e) { setAnalysis({ error: String(e) }); }
    setAiLoading(false);
  }, [score, signals, prices, estTime]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "monospace" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, position: "sticky", top: 0, background: T.bg, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>INSTITUTIONAL MARKET MATRIX</div>
          <div style={{ fontSize: 9, color: T.dim, letterSpacing: 1 }}>NQ · NASDAQ 100 FUTURES · ICT/SMC</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: st.color, animation: status === "live" ? "pulse 2s ease-in-out infinite" : "none" }} />
          <span style={{ fontFamily: "monospace", fontSize: 10, color: st.color }}>{st.label}</span>
          <button onClick={refresh} style={{ fontFamily: "monospace", fontSize: 9, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>↻</button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>{estTime} <span style={{ fontSize: 9, color: T.dim }}>EST</span></div>
          <div style={{ fontSize: 9, color: session.color }}>{session.label}</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${scoreColor}30`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 10, color: T.dim, letterSpacing: 3, alignSelf: "flex-start" }}>MATRIX SCORE</div>
            <ScorePulse score={score} />
            {lastUpdate && <div style={{ fontSize: 9, color: T.dim }}>Updated: {lastUpdate.toLocaleTimeString()}</div>}
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, color: T.dim, letterSpacing: 3, marginBottom: 12 }}>LIVE INSTRUMENTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {INSTRUMENTS.map(inst => <InstrumentRow key={inst.id} inst={inst} signal={signals[inst.id]} price={prices[inst.id]} />)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, color: T.dim, letterSpacing: 3, marginBottom: 12 }}>NY SESSION WINDOWS</div>
            {[{ label: "PRE-MARKET + 8:30 NEWS", time: "8:00 — 9:30 AM", active: isPre, note: "Watch 8:30 spike — it's the manipulation" }, { label: "AM KILL ZONE", time: "9:30 — 11:00 AM", active: isAM, note: "Highest institutional activity. Best probability." }, { label: "PM KILL ZONE", time: "2:00 — 4:00 PM", active: isPM, note: "Reversal or continuation setups" }].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: s.active ? `${T.bull}15` : T.surface, border: `1px solid ${s.active ? T.bull : T.border}`, marginBottom: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.active ? T.bull : T.dim, flexShrink: 0, animation: s.active ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.active ? T.bull : T.text }}>{s.label} · {s.time}</div>
                  <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>{s.note}</div>
                </div>
                {s.active && <div style={{ fontSize: 9, color: T.bull, fontWeight: 700 }}>LIVE</div>}
              </div>
            ))}
          </div>
          <ICTChecklist score={score} signals={signals} />
          <AIPanel analysis={analysis} loading={aiLoading} onRefresh={refreshAI} />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 20px", display: "flex", justifyContent: "space-between", fontSize: 9, color: T.dim, flexWrap: "wrap", gap: 6 }}>
        <span>ZB → ZN → US10Y → DXY → VIX → SPX → NQ</span>
        <span>Bias only · Confirm on price · Manage risk</span>
      </div>
    </div>
  );
}
