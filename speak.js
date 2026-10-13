// POST /api/speak  { text: "..." }  ->  audio/mpeg
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const text = String(req.body?.text || "").slice(0, 600);
  if (!text) return res.status(400).json({ error: "No text" });

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
      }
    );
    if (!r.ok) throw new Error("tts failed");
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: "Voice unavailable" });
  }
};
