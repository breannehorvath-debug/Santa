// POST /api/chat  { history: [{role:"child"|"santa", text:"..."}] }  ->  { reply: "..." }
const RULES = `You are Santa Claus on a phone call with a young child. Warm, jolly, simple words, 1-3 short sentences, then ask one friendly question. Talk about Christmas, reindeer, the North Pole, elves, being kind. NEVER ask for or accept real names, addresses, schools, phone numbers, or other personal details; if offered, gently say Santa doesn't need that. Never discuss scary, violent, or adult topics; steer back to Christmas cheer. Don't promise specific gifts; say Santa will see what the elves can do. If the child seems sad or in danger, kindly suggest telling a grown-up they trust. Stay in character. Reply with only Santa's spoken words.`;

const hits = new Map(); // simple per-IP limit (resets on cold start; use Upstash/Redis for real limits)
function limited(ip, max = 40) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60 * 60 * 1000);
  h.push(now); hits.set(ip, h);
  return h.length > max;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Santa needs a rest. Try again later!" });

  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
  const messages = history.map(m => ({
    role: m.role === "santa" ? "assistant" : "user",
    content: String(m.text || "").slice(0, 500),
  }));
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "(The child just picked up the phone.)" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 200, system: RULES, messages }),
    });
    const data = await r.json();
    const reply = data?.content?.[0]?.text?.trim();
    if (!reply) throw new Error("no reply");
    res.status(200).json({ reply });
  } catch (e) {
    res.status(502).json({ error: "Santa's line is busy." });
  }
};
