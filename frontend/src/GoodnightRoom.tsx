// "Say goodnight to your room": the bedtime ritual before the story.
// The child points the camera at things in their room; Claude picks the object from the approved list,
// and the family member's cloned voice says "晚安，小熊。" (Good night, teddy bear). Then the story starts.
import { useState } from "react";
import type { Word } from "./api";
import { player, StoppedError } from "./player";
import { CameraNamer } from "./CameraNamer";
import { Teacher } from "./Teacher";
import type { Mouth } from "./phonemes";

/** The name used when saying goodnight: "晚安，小熊。" -> "小熊". */
export const gnName = (w: Word) => w.gnLine.replace(/^晚安，/, "").replace(/。$/, "");

export function GoodnightRoom({
  voiceId,
  whoLabel,
  mouth,
  onDone,
  onError,
}: {
  voiceId: string;
  whoLabel: string;
  mouth: Mouth;
  onDone: (said: Word[]) => void;
  onError: (msg: string) => void;
}) {
  const [said, setSaid] = useState<Word[]>([]);
  const [last, setLast] = useState<Word | null>(null);
  const [busy, setBusy] = useState(false);

  async function goodnight(w: Word) {
    if (!voiceId) return onError("Add a voice ID first (top of the page).");
    setLast(w);
    setSaid((s) => (s.some((x) => x.id === w.id) ? s : [...s, w]));
    setBusy(true);
    try {
      await player.speak({ voiceId, wordId: w.id, part: "gn" });
    } catch (e) {
      if (!(e instanceof StoppedError)) onError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <section className="night">
      <div className="night-top">
        <h2>Say goodnight to your room 和房间说晚安</h2>
        <button className="ghost" onClick={() => (player.stop(), onDone(said))}>
          Skip to the story →
        </button>
      </div>

      <div className="gn-layout">
        <div className="gn-camera">
          <CameraNamer
            onFound={goodnight}
            busy={busy}
            label="🌙 晚安! Say goodnight"
            notSure="Bao can't see that one clearly. Try your teddy, your pillow, or the lamp — up close."
          />
        </div>

        <div className="gn-side">
          <div className="stage">
            <Teacher mouth={mouth} speaking={busy} />
          </div>
          {last ? (
            <div className="page">
              <div className="pinyin">{last.gnPinyin}</div>
              <div className="hanzi gn-line" lang="zh">
                {last.gnLine}
              </div>
              <div className="muted-night">
                {last.emoji} Good night, {last.en}
              </div>
            </div>
          ) : (
            <p className="muted-night center">
              Point the camera at something in your room — {whoLabel} will say goodnight to it.
            </p>
          )}

          {said.length > 0 && (
            <div className="gn-said">
              <span className="muted-night">Said goodnight to:</span>
              {said.map((w) => (
                <span key={w.id} className="recap-word">
                  {w.emoji} {gnName(w)}
                </span>
              ))}
            </div>
          )}

          <div className="controls">
            <button className="big" onClick={() => (player.stop(), onDone(said))} disabled={busy}>
              {said.length ? "📖 Story time →" : "📖 Go to the story"}
            </button>
          </div>
        </div>
      </div>

      <div className="badge-night">🔊 AI clone of {whoLabel}'s voice — not a real recording</div>
    </section>
  );
}
