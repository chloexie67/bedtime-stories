import "dotenv/config";
import express from "express";
import cors from "cors";
import { LANGUAGES } from "./languages.js";
import { VOCAB, getWord } from "./vocab.js";
import { STORIES, getStory, personalize, isRelation, RELATIONS } from "./stories.js";
import { identifyObject } from "./identify.js";
import { ttsStream, deleteVoice, addAccents, getVoice, SAMPLE_RATE, type TTSOpts } from "./cartesia.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "8mb" })); // camera frames

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    // Report presence only — never echo key values.
    cartesiaKey: Boolean(process.env.CARTESIA_API_KEY),
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

app.get("/languages", (_req, res) => {
  res.json(LANGUAGES.map(({ code, name, native }) => ({ code, name, native })));
});
app.get("/vocab", (_req, res) => res.json(VOCAB));
app.get("/stories", (req, res) => {
  const rel = isRelation(req.query.relation) ? req.query.relation : "nainai";
  res.json(STORIES.map((s) => personalize(s, rel)));
});
app.get("/relations", (_req, res) => res.json(RELATIONS));

// ---------- Point-and-name ----------
app.post("/identify", async (req, res) => {
  const image = String(req.body?.image || "").replace(/^data:image\/\w+;base64,/, "");
  if (!image) return res.status(400).json({ error: "image (base64 jpeg) required" });
  try {
    const result = await identifyObject(image);
    res.json({ ...result, word: result.id === "none" ? null : getWord(result.id) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---------- Speak an APPROVED line in the cloned voice ----------
// The client sends ids, never text, so the cloned voice can only say approved content.
// Body (story):  { voiceId, storyId, line, relation? }  (relation: nainai | waipo | yeye | waigong | mama | baba)
// Body (word):   { voiceId, wordId, part: "zh" | "en", wordOnly?, mode?: "warm" | "clear", speed? }
// Streams NDJSON: {type:"meta"} {type:"audio",data} {type:"phonemes",...} {type:"words",...} {type:"done"}
type Timing = { phonemes?: string[]; words?: string[]; start: number[]; end: number[] };
type Cached = { pcm: Buffer[]; timings: Timing[] };
const cache = new Map<string, Cached>();

function resolveLine(b: Record<string, unknown>): TTSOpts & { error?: string } {
  const voiceId = String(b.voiceId || "");
  if (!voiceId) return { voiceId, transcript: "", error: "voiceId required" };
  if (b.storyId) {
    const story = getStory(String(b.storyId), isRelation(b.relation) ? b.relation : "nainai");
    const line = story?.lines[Number(b.line)];
    if (!line) return { voiceId, transcript: "", error: "unknown storyId/line" };
    return { voiceId, transcript: line.zh, language: "zh", emotion: line.emotion, speed: 0.9, words: true };
  }
  const word = getWord(String(b.wordId));
  if (!word || (b.part !== "zh" && b.part !== "en")) return { voiceId, transcript: "", error: "unknown wordId/part" };
  const opts: TTSOpts = { voiceId, language: b.part, words: true, transcript: "" };
  if (b.part === "zh") opts.transcript = b.wordOnly ? word.zh : word.zhLine;
  else {
    opts.transcript = b.wordOnly ? word.en : word.enLine;
    if (b.mode === "warm") opts.accent = "mandarin";
  }
  if (typeof b.speed === "number") opts.speed = Math.min(1.5, Math.max(0.6, b.speed));
  return opts;
}

app.post("/speak", async (req, res) => {
  const opts = resolveLine(req.body || {});
  if (opts.error) return res.status(400).json({ error: opts.error });

  const key = JSON.stringify([opts.voiceId, opts.transcript, opts.language, opts.accent, opts.speed, opts.emotion]);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  const send = (o: unknown) => res.write(JSON.stringify(o) + "\n");
  send({ type: "meta", sampleRate: SAMPLE_RATE, transcript: opts.transcript, cloned: true });

  const hit = cache.get(key);
  if (hit) {
    hit.timings.forEach((t) => send({ type: t.phonemes ? "phonemes" : "words", ...t }));
    hit.pcm.forEach((b) => send({ type: "audio", data: b.toString("base64") }));
    send({ type: "done", cached: true });
    return res.end();
  }

  let sentAudio = false;
  const run = async (o: TTSOpts) => {
    const rec: Cached = { pcm: [], timings: [] };
    for await (const ev of ttsStream(o)) {
      if (ev.type === "chunk") {
        rec.pcm.push(ev.pcm);
        sentAudio = true;
        send({ type: "audio", data: ev.pcm.toString("base64") });
      } else if (ev.type === "phonemes" || ev.type === "words") {
        const { type, ...t } = ev;
        rec.timings.push(t);
        send({ type, ...t });
      }
    }
    cache.set(key, rec);
  };

  try {
    try {
      await run(opts);
    } catch (e) {
      // Optional extras (deliberate accent, emotion) can be rejected for some voices: retry once without them.
      if (sentAudio || (!opts.accent && !opts.emotion)) throw e;
      console.warn(`retrying without accent/emotion: ${(e as Error).message}`);
      await run({ ...opts, accent: undefined, emotion: undefined });
    }
    send({ type: "done" });
  } catch (e) {
    console.error(e);
    send({ type: "error", message: (e as Error).message });
  }
  res.end();
});

// ---------- Parent voice: make an English-speaking voice read Mandarin natively ----------
app.post("/voices/:id/mandarin", async (req, res) => {
  try {
    await addAccents(req.params.id, ["mandarin"]);
    const v = await getVoice(req.params.id);
    for (const k of cache.keys()) if (k.includes(req.params.id)) cache.delete(k);
    res.json({ ok: true, accents: v.accents ?? null });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---------- Delete my voice (responsible use) ----------
app.delete("/voices/:id", async (req, res) => {
  try {
    await deleteVoice(req.params.id);
    for (const k of cache.keys()) if (k.includes(req.params.id)) cache.delete(k);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`backend listening on http://localhost:${port}`));
