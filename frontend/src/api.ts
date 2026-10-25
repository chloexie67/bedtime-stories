// All network calls go to our backend (/api is proxied by Vite). The browser never sees API keys.

export interface Word {
  id: string;
  emoji: string;
  en: string;
  enLine: string;
  zh: string;
  pinyin: string;
  zhLine: string;
}

export interface StoryLine {
  zh: string;
  pinyin: string;
  en: string;
}

export interface Story {
  id: string;
  title: string;
  titlePinyin: string;
  titleEn: string;
  emoji: string;
  keyWords: { zh: string; pinyin: string; en: string }[];
  lines: StoryLine[];
}

const err = async (r: Response) => (await r.json().catch(() => ({}))).error || `HTTP ${r.status}`;

export async function getVocab(): Promise<Word[]> {
  const r = await fetch("/api/vocab");
  if (!r.ok) throw new Error(await err(r));
  return r.json();
}

export type Relation = "nainai" | "waipo" | "yeye" | "waigong" | "mama" | "baba";

export const RELATION_LABELS: Record<Relation, { zh: string; en: string }> = {
  nainai: { zh: "奶奶", en: "Grandma (dad's side)" },
  waipo: { zh: "外婆", en: "Grandma (mom's side)" },
  yeye: { zh: "爷爷", en: "Grandpa (dad's side)" },
  waigong: { zh: "外公", en: "Grandpa (mom's side)" },
  mama: { zh: "妈妈", en: "Mom" },
  baba: { zh: "爸爸", en: "Dad" },
};

export async function getStories(relation: Relation): Promise<Story[]> {
  const r = await fetch(`/api/stories?relation=${relation}`);
  if (!r.ok) throw new Error(await err(r));
  return r.json();
}

export async function identify(jpegDataUrl: string): Promise<{ id: string; word: Word | null }> {
  const r = await fetch("/api/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: jpegDataUrl }),
  });
  if (!r.ok) throw new Error(await err(r));
  return r.json();
}

export async function deleteVoice(voiceId: string) {
  const r = await fetch(`/api/voices/${encodeURIComponent(voiceId)}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await err(r));
}

/** For a parent's English-language clone: add a native Mandarin accent so stories sound fluent. */
export async function makeMandarin(voiceId: string) {
  const r = await fetch(`/api/voices/${encodeURIComponent(voiceId)}/mandarin`, { method: "POST" });
  if (!r.ok) throw new Error(await err(r));
  return r.json();
}

export type SpeakReq =
  | { voiceId: string; storyId: string; line: number; relation: Relation }
  | { voiceId: string; wordId: string; part: "zh" | "en"; wordOnly?: boolean; speed?: number };

export type SpeakEvent =
  | { type: "meta"; sampleRate: number; transcript: string }
  | { type: "audio"; data: string }
  | { type: "phonemes"; phonemes: string[]; start: number[]; end: number[] }
  | { type: "words"; words: string[]; start: number[]; end: number[] }
  | { type: "done" }
  | { type: "error"; message: string };

/** Streams NDJSON events from /speak. */
export async function* speakStream(req: SpeakReq, signal?: AbortSignal): AsyncGenerator<SpeakEvent> {
  const r = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(await err(r));
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) yield JSON.parse(line);
    }
  }
}
