// Go/no-go test: real clip -> ink-whisper -> clone -> Sonic TTS (native language + English, accented & native).
//
// Usage:
//   npm run roundtrip -- --clip ./grandma.webm --lang zh
//   options: --accent mandarin             (default: per-language default in src/languages.ts)
//            --en "This is an apple."      (English test line)
//            --native "这是苹果。"          (native-language test line; default: first part of the transcript)
//            --voice <id>                   (reuse an existing clone instead of cloning again)
//            --delete                       (delete the voice at the end)
import "dotenv/config";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import {
  addAccents,
  cloneVoice,
  deleteVoice,
  getVoice,
  pcmToWav,
  SAMPLE_RATE,
  transcribe,
  ttsStream,
  type TTSOpts,
} from "../src/cartesia.js";
import { getLang } from "../src/languages.js";

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const clipPath = arg("clip");
const langCode = arg("lang", "zh")!;
const lang = getLang(langCode);
if (!lang) throw new Error(`Language "${langCode}" is not in the clone ∩ ink-whisper list (src/languages.ts)`);
const accent = arg("accent", lang.accent)!;
const enText = arg("en", "This is an apple. Grandma loves you very much. Can you say apple?")!;
const outDir = join(process.cwd(), "out", `${langCode}-${Date.now()}`);
mkdirSync(outDir, { recursive: true });

const t0 = () => performance.now();
const ms = (start: number) => `${Math.round(performance.now() - start)}ms`;

async function speak(file: string, o: TTSOpts) {
  const start = t0();
  let firstChunk = 0;
  const chunks: Buffer[] = [];
  const phonemes: { p: string; start: number; end: number }[] = [];
  for await (const ev of ttsStream(o)) {
    if (ev.type === "chunk") {
      if (!firstChunk) firstChunk = performance.now() - start;
      chunks.push(ev.pcm);
    } else if (ev.type === "phonemes") {
      ev.phonemes.forEach((p, i) => phonemes.push({ p, start: ev.start[i], end: ev.end[i] }));
    }
  }
  const pcm = Buffer.concat(chunks);
  writeFileSync(join(outDir, `${file}.wav`), pcmToWav(pcm));
  writeFileSync(join(outDir, `${file}.phonemes.json`), JSON.stringify(phonemes, null, 2));
  const audioSec = pcm.length / 2 / SAMPLE_RATE;
  console.log(
    `  ✓ ${file}.wav  audio ${audioSec.toFixed(2)}s · first chunk ${Math.round(firstChunk)}ms · total ${ms(start)} · ${phonemes.length} phonemes`,
  );
  return phonemes;
}

async function main() {
  let voiceId = arg("voice");
  console.log(`Output: ${outDir}\nLanguage: ${lang!.name} (${langCode}), accent: ${accent}\n`);

  // 1. STT on the original clip — checks ink-whisper on this speaker/language (pipeline step 2 risk).
  let transcript = "";
  if (clipPath) {
    const clip = readFileSync(clipPath);
    const mb = statSync(clipPath).size / 1e6;
    if (mb > 16) throw new Error(`Clip is ${mb.toFixed(1)} MB; Cartesia max is 16 MB`);
    const filename = basename(clipPath) || `clip${extname(clipPath)}`;

    console.log("1. ink-whisper transcription of your clip");
    let s = t0();
    const stt = await transcribe(clip, filename, langCode);
    transcript = stt.text.trim();
    console.log(`  ✓ ${ms(s)} · ${stt.duration?.toFixed(1) ?? "?"}s of audio\n  "${transcript}"\n`);
    writeFileSync(join(outDir, "transcript.txt"), transcript);

    // 2. Clone
    if (!voiceId) {
      console.log("2. Cloning voice (private)");
      s = t0();
      const v = await cloneVoice({
        clip,
        filename,
        name: `roundtrip-${langCode}-${Date.now()}`,
        language: langCode,
        accent,
      });
      voiceId = v.id;
      console.log(`  ✓ ${ms(s)} · voice_id ${voiceId}\n`);
    }
  }
  if (!voiceId) throw new Error("Pass --clip <file> (to clone) or --voice <id> (to reuse)");

  // 3. Native language — does it sound like them?
  const nativeText = arg("native", transcript.split(/(?<=[.!?。！？])\s*/).slice(0, 2).join(" ").slice(0, 200));
  if (nativeText) {
    console.log(`3. ${lang!.name} line in cloned voice: "${nativeText}"`);
    await speak("1-native-language", { voiceId, transcript: nativeText, language: langCode });
    console.log();
  }

  // Parent voice (English speaker): test reading a Mandarin story natively instead.
  if (langCode === "en") {
    const zhText = arg("zh", "天黑了，小月亮出来了。晚安，宝宝。")!;
    console.log(`4. Mandarin in the parent's voice BEFORE adding the mandarin accent: "${zhText}"`);
    await speak("2-zh-english-accent", { voiceId, transcript: zhText, language: "zh" });
    console.log("\n5. Adding mandarin accent");
    try {
      await addAccents(voiceId, ["mandarin"]);
      console.log("6. Mandarin, native accent");
      const ph = await speak("3-zh-native", { voiceId, transcript: zhText, language: "zh" });
      console.log("   phoneme inventory:", [...new Set(ph.map((x) => x.p))].join(" "));
    } catch (e) {
      console.log(`  ✗ ${(e as Error).message}`);
    }
    console.log(`\nVoice ${voiceId}. Listen to the files in ${outDir}`);
    return;
  }

  // 4. English before adding accents -> falls back to the speaker's original accent.
  console.log(`4. English, speaker's own accent (before adding accents): "${enText}"`);
  await speak("2-en-accented", { voiceId, transcript: enText });

  // 5. Add a native General American accent to the same voice_id.
  console.log("\n5. Adding general-american accent");
  try {
    await addAccents(voiceId, ["general-american"]);
    const v = await getVoice(voiceId);
    console.log(`  ✓ accents now: ${JSON.stringify(v.accents ?? "(none reported)")}\n`);

    console.log("6. English, native American accent");
    const ph = await speak("3-en-native", { voiceId, transcript: enText });
    console.log("   phoneme inventory:", [...new Set(ph.map((x) => x.p))].join(" "));

    // After adding accents, "en" defaults to native; force the warm/accented mode explicitly.
    console.log(`\n7. English, deliberate ${accent} accent after adding accents (for the "warm" mode)`);
    await speak("4-en-warm-sonic3.6", { voiceId, transcript: enText, accent });
    await speak("5-en-warm-sonic3.5", { voiceId, transcript: enText, accent, model: "sonic-3.5" });
  } catch (e) {
    console.log(`  ✗ ${(e as Error).message}\n  (skipping native-accent outputs)`);
  }

  if (flag("delete")) {
    await deleteVoice(voiceId);
    console.log(`\nDeleted voice ${voiceId}`);
  } else {
    console.log(`\nKept voice ${voiceId}. Reuse with --voice ${voiceId}; delete with: npm run delete-voice -- ${voiceId}`);
  }
  console.log(`\nListen to the files in ${outDir}`);
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
