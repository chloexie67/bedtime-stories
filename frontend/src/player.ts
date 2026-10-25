// Plays streamed PCM s16le with Web Audio and keeps phoneme + word timestamps on the same clock,
// so the cartoon's mouth and the text highlighting follow audioContext.currentTime exactly.
import { speakStream, type SpeakReq } from "./api";

export interface Timed {
  text: string;
  start: number; // seconds, relative to utterance start
  end: number;
}

export class StoppedError extends Error {
  constructor() {
    super("stopped");
  }
}

export class SpeechPlayer {
  ctx: AudioContext | null = null;
  private utteranceStart = 0; // ctx time when the current utterance's first sample plays
  private phonemes: Timed[] = [];
  private words: Timed[] = [];
  private active = false;
  private sources: AudioBufferSourceNode[] = [];
  private abort: AbortController | null = null;
  private wake: (() => void) | null = null;

  private ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private now() {
    return this.ctx ? this.ctx.currentTime - this.utteranceStart : 0;
  }

  /** Phoneme currently being heard, or null. */
  currentPhoneme(): Timed | null {
    if (!this.active) return null;
    const t = this.now();
    return this.phonemes.find((x) => t >= x.start && t < x.end) ?? null;
  }

  /** Index of the word currently being heard (or the last one started), -1 before the first. */
  currentWordIndex(): number {
    if (!this.active) return -1;
    const t = this.now();
    let idx = -1;
    this.words.forEach((w, i) => {
      if (t >= w.start) idx = i;
    });
    return idx;
  }

  currentWords(): Timed[] {
    return this.words;
  }

  /** Stop playback immediately and abandon any in-flight request. */
  stop() {
    this.abort?.abort();
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.sources = [];
    this.active = false;
    this.wake?.();
  }

  /** Speak one approved line; resolves when the audio has finished. Throws StoppedError if stop() is called. */
  async speak(req: SpeakReq): Promise<void> {
    this.stop();
    const ctx = this.ensureCtx();
    const abort = new AbortController();
    this.abort = abort;
    let sampleRate = 44100;
    let nextTime = 0;
    let started = false;
    this.phonemes = [];
    this.words = [];

    try {
      for await (const ev of speakStream(req, abort.signal)) {
        if (ev.type === "meta") sampleRate = ev.sampleRate;
        else if (ev.type === "error") throw new Error(ev.message);
        else if (ev.type === "phonemes") {
          ev.phonemes.forEach((p, i) => this.phonemes.push({ text: p, start: ev.start[i], end: ev.end[i] }));
        } else if (ev.type === "words") {
          ev.words.forEach((w, i) => this.words.push({ text: w, start: ev.start[i], end: ev.end[i] }));
        } else if (ev.type === "audio") {
          const bytes = Uint8Array.from(atob(ev.data), (c) => c.charCodeAt(0));
          const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
          if (!samples.length) continue;
          const buf = ctx.createBuffer(1, samples.length, sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          if (!started) {
            nextTime = ctx.currentTime + 0.08; // small buffer against network jitter
            this.utteranceStart = nextTime;
            this.active = true;
            started = true;
          }
          // If the network fell behind, shift the rest of the utterance (and its timing clock) forward.
          if (nextTime < ctx.currentTime) {
            this.utteranceStart += ctx.currentTime - nextTime;
            nextTime = ctx.currentTime;
          }
          src.start(nextTime);
          this.sources.push(src);
          nextTime += buf.duration;
        }
      }
    } catch (e) {
      if (abort.signal.aborted) throw new StoppedError();
      throw e;
    }
    if (abort.signal.aborted) throw new StoppedError();
    if (started) {
      await new Promise<void>((r) => {
        const t = setTimeout(r, Math.max(0, (nextTime - ctx.currentTime) * 1000));
        this.wake = () => {
          clearTimeout(t);
          r();
        };
      });
    }
    this.wake = null;
    if (abort.signal.aborted) throw new StoppedError();
    this.active = false;
    this.sources = [];
  }
}

export const player = new SpeechPlayer();

/** Character ranges [start, end) in `text` for each timed word, matched in order. */
export function wordRanges(text: string, words: Timed[]): ([number, number] | null)[] {
  let cursor = 0;
  return words.map((w) => {
    const t = w.text.trim();
    if (!t) return null;
    const i = text.indexOf(t, cursor);
    if (i === -1) return null;
    cursor = i + t.length;
    return [i, cursor];
  });
}
