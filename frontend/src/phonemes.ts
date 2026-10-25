// Phoneme (IPA from Cartesia) -> mouth shape for the cartoon, plus the "tricky sounds" the articulation
// coach teaches. Cartesia's phonemes look like ["h","ə","l","oʊ"]; we strip stress/length marks.

export type Mouth = "rest" | "mbp" | "fv" | "th" | "l" | "o" | "a" | "e" | "etc";

export const normalize = (p: string) => p.replace(/[ˈˌː0-9]/g, "").toLowerCase().trim();

export function mouthFor(raw: string): Mouth {
  const p = normalize(raw);
  if (!p) return "rest";
  if (["m", "b", "p"].includes(p)) return "mbp";
  if (["f", "v"].includes(p)) return "fv";
  if (["θ", "ð"].includes(p)) return "th";
  if (p === "l" || p === "ɫ") return "l";
  if (["w", "u", "ʊ", "oʊ", "o", "ɔ", "ɔɪ", "aʊ", "ɹ", "r", "ɚ", "ɝ", "y", "ɥ", "ou", "uo"].includes(p)) return "o";
  if (["a", "æ", "ɑ", "ʌ", "aɪ", "ɒ", "ai", "ao", "an", "aŋ"].includes(p)) return "a";
  if (["e", "ɛ", "i", "ɪ", "eɪ", "j", "ə", "ɤ", "ɨ", "ei", "ie"].includes(p)) return "e";
  // Mandarin often comes as syllables/finals (e.g. "ao", "iang"): fall back on the first vowel.
  const v = p.match(/[aeiouyæɑɔəɛɤɨʊ]/)?.[0];
  if (v) return "aæɑ".includes(v) ? "a" : "ouyɔʊ".includes(v) ? "o" : "e";
  return "etc";
}

export interface Tricky {
  key: string;
  label: string; // shown on the chip
  example: string;
  tip: string;
  tipZh: string; // short version for the grandparent
}

// Sounds that commonly differ between Mandarin and English.
export const TRICKY: Record<string, Tricky> = {
  θ: {
    key: "θ",
    label: "th (soft)",
    example: "toothbrush, three",
    tip: "Put the tip of your tongue between your teeth and blow air gently. Not “s” or “f”.",
    tipZh: "舌尖放在上下牙之间，轻轻吹气。",
  },
  ð: {
    key: "ð",
    label: "th (buzzy)",
    example: "this, the",
    tip: "Same tongue between your teeth, but hum while you blow. Not “z” or “d”.",
    tipZh: "舌尖放在牙齿之间，同时发声。",
  },
  v: {
    key: "v",
    label: "v",
    example: "very, love",
    tip: "Rest your top teeth on your bottom lip and hum. Not “w”.",
    tipZh: "上牙轻碰下唇，同时发声。",
  },
  ɹ: {
    key: "ɹ",
    label: "r",
    example: "orange, flower",
    tip: "Pull your tongue back without touching the roof of your mouth, and round your lips a little.",
    tipZh: "舌头向后卷，不碰上颚，嘴唇微圆。",
  },
  l: {
    key: "l",
    label: "l",
    example: "ball, flower",
    tip: "Touch the tip of your tongue to the bump behind your top teeth.",
    tipZh: "舌尖抵住上牙后面。",
  },
  æ: {
    key: "æ",
    label: "a (apple)",
    example: "apple, banana",
    tip: "Drop your jaw and open wide, like a big smile with your mouth open.",
    tipZh: "嘴巴张大，下巴往下。",
  },
};

export function trickyFor(raw: string): Tricky | undefined {
  const p = normalize(raw);
  if (p === "r" || p === "ɚ" || p === "ɝ") return TRICKY["ɹ"];
  if (p === "ɫ") return TRICKY["l"];
  return TRICKY[p];
}
