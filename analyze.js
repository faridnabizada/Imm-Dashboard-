export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { score, signalSummary, timeStr } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: `You are an institutional NQ futures trading analyst using ICT/SMC methodology.
Analyze the Institutional Market Matrix and return ONLY a JSON object, no markdown, no preamble:
{
  "bias": "LONG" | "SHORT" | "NEUTRAL",
  "conviction": "HIGH" | "MEDIUM" | "LOW",
  "headline": "one punchy sentence under 12 words",
  "ict_setup": "specific ICT pattern to look for on NQ",
  "key_driver": "the single most important signal",
  "liquidity_target": "where institutions are hunting stops",
  "invalidation": "what would invalidate this bias",
  "session": "AM" | "PM" | "PRE" | "AVOID",
  "session_note": "brief timing note",
  "risk": "one key risk to this bias"
}`,
        messages: [{ role: "user", content: `Matrix Score: ${score}/6\n\nLive Signals:\n${signalSummary}\n\nNY Time: ${timeStr}\n\nProvide trading analysis.` }]
      })
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || "{}";
    return res.status(200).json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
