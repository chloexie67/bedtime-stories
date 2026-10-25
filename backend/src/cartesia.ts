// Thin Cartesia REST client. Server-side only — never import from the frontend.
// Endpoints confirmed against docs.cartesia.ai (Cartesia-Version 2026-08-14):
//   POST   /voices/clone          multipart: clip, name, language, accent?, access
//   PATCH  /voices/{id}/accents   json: { accents: [...] }
//   GET    /voices/{id}
//   DELETE /voices/{id}
//   POST   /tts/sse               json -> SSE frames `data: <json>\n\n`, chunk.data is base64 PCM
//   POST   /stt                   multipart: file, model=ink-whisper, language, timestamp_granularities[]
import "dotenv/config";

const BASE = "https://api.cartesia.ai";
export const SAMPLE_RATE = 44100;

function headers(extra: Record<string, string> = {}) {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) throw new Error("CARTESIA_API_KEY is not set (copy .env.example to .env)");
  return {
    Authorization: `Bearer ${key}`,
    "Cartesia-Version": process.env.CARTESIA_VERSION || "2026-08-14",
    ...extra,
  };
}

async function check(res: Response, what: string) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${what} failed: HTTP ${res.status} ${body}`);
  }
  return res;
}

// ---------- Voices ----------

export interface CloneOpts {
  clip: Buffer;
  filename: string; // extension tells Cartesia the format, e.g. clip.webm
  name: string;
  language: string;
  accent?: string;
}

export async function cloneVoice(o: CloneOpts): Promise<{ id: string; [k: string]: unknown }> {
  const form = new FormData();
  form.append("clip", new Blob([new Uint8Array(o.clip)]), o.filename);
  form.append("name", o.name);
  form.append("language", o.language);
  if (o.accent) form.append("accent", o.accent);
  form.append("access", "private");
  const res = await check(
    await fetch(`${BASE}/voices/clone`, { method: "POST", headers: headers(), body: form }),
    "clone",
  );
  return res.json();
}

/** Make the voice speak these accents natively (e.g. ["general-american"]). Voice must have an accent on record. */
export async function addAccents(voiceId: string, accents: string[]) {
  const res = await check(
    await fetch(`${BASE}/voices/${voiceId}/accents`, {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ accents }),
    }),
    "add accents",
  );
  return res.json();
}

export async function getVoice(voiceId: string) {
  const res = await check(await fetch(`${BASE}/voices/${voiceId}`, { headers: headers() }), "get voice");
  return res.json();
}

export async function deleteVoice(voiceId: string) {
  await check(
    await fetch(`${BASE}/voices/${voiceId}`, { method: "DELETE", headers: headers() }),
    "delete voice",
  );
}

// ---------- TTS (SSE) ----------

export interface TTSOpts {
  voiceId: string;
  transcript: string;
  language?: string; // default "en"
  accent?: string; // only to force a deliberate accent; must be one of the voice's accents
  model?: string; // default sonic-3.6 (sonic-3.5 keeps deliberate accents stronger)
  phonemes?: boolean; // default true
  speed?: number; // 0.6–1.5
  emotion?: string; // generation_config.emotion, e.g. "calm"
  words?: boolean; // word-level timestamps (for highlighting)
}

export type TTSEvent =
  | { type: "chunk"; pcm: Buffer }
  | { type: "phonemes"; phonemes: string[]; start: number[]; end: number[] }
  | { type: "words"; words: string[]; start: number[]; end: number[] }
  | { type: "done" };

/** Streams PCM s16le mono @44.1kHz chunks and phoneme timestamps as they arrive. */
export async function* ttsStream(o: TTSOpts): AsyncGenerator<TTSEvent> {
  const body: Record<string, unknown> = {
    model_id: o.model || "sonic-3.6",
    transcript: o.transcript,
    voice: { id: o.voiceId },
    language: o.language || "en",
    output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: SAMPLE_RATE },
    add_phoneme_timestamps: o.phonemes ?? true,
  };
  if (o.accent) body.accent = o.accent;
  if (o.words) body.add_timestamps = true;
  const gen: Record<string, unknown> = {};
  if (o.speed) gen.speed = o.speed;
  if (o.emotion) gen.emotion = o.emotion;
  if (Object.keys(gen).length) body.generation_config = gen;

  const res = await check(
    await fetch(`${BASE}/tts/sse`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Accept: "text/event-stream" }),
      body: JSON.stringify(body),
    }),
    "tts",
  );
  if (!res.body) throw new Error("tts: empty body");

  const decoder = new TextDecoder();
  let buf = "";
  for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(part, { stream: true });
    let idx: number;
    while ((idx = buf.search(/\r?\n\r?\n/)) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx).replace(/^\r?\n\r?\n/, "");
      const data = frame
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      const ev = JSON.parse(data);
      switch (ev.type) {
        case "chunk":
          yield { type: "chunk", pcm: Buffer.from(ev.data, "base64") };
          break;
        case "phoneme_timestamps":
          yield { type: "phonemes", ...ev.phoneme_timestamps };
          break;
        case "done":
          yield { type: "done" };
          return;
        case "error":
          throw new Error(`tts error: ${ev.title}: ${ev.message} (request ${ev.request_id})`);
        case "timestamps":
          yield { type: "words", ...ev.word_timestamps };
          break;
      }
    }
  }
}

/** Convenience: collect a whole utterance. */
export async function ttsCollect(o: TTSOpts) {
  const chunks: Buffer[] = [];
  const phonemes: { p: string; start: number; end: number }[] = [];
  for await (const ev of ttsStream(o)) {
    if (ev.type === "chunk") chunks.push(ev.pcm);
    else if (ev.type === "phonemes")
      ev.phonemes.forEach((p, i) => phonemes.push({ p, start: ev.start[i], end: ev.end[i] }));
  }
  return { pcm: Buffer.concat(chunks), phonemes };
}

// ---------- STT (batch, ink-whisper) ----------

export async function transcribe(audio: Buffer, filename: string, language: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  form.append("model", "ink-whisper");
  form.append("language", language);
  const res = await check(
    await fetch(`${BASE}/stt`, { method: "POST", headers: headers(), body: form }),
    "stt",
  );
  return (await res.json()) as { text: string; language?: string; duration?: number };
}

// ---------- Helpers ----------

export function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
