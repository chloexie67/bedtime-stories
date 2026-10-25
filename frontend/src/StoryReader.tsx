// Bedtime story mode: reads an approved Mandarin story line by line in the cloned voice,
// highlights each character as it's spoken, and stops at the end (nothing plays during sleep).
import { useEffect, useRef, useState } from "react";
import { type Relation, type Story, type Word } from "./api";
import { player, StoppedError, wordRanges } from "./player";
import { Teacher } from "./Teacher";
import { GoodnightRoom, gnName } from "./GoodnightRoom";
import type { Mouth } from "./phonemes";

const PAUSE_MS = 700;

function prefetch(voiceId: string, storyId: string, line: number, relation: Relation) {
  // Warm the server cache for the next line so lines flow without a gap.
  fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voiceId, storyId, line, relation }),
  })
    .then((r) => r.arrayBuffer())
    .catch(() => {});
}

export function StoryReader({
  stories,
  voiceId,
  relation,
  whoLabel,
  mouth,
  onError,
}: {
  stories: Story[];
  voiceId: string;
  relation: Relation;
  whoLabel: string;
  mouth: Mouth;
  onError: (msg: string) => void;
}) {
  const [phase, setPhase] = useState<"goodnight" | "stories">("goodnight");
  const [said, setSaid] = useState<Word[]>([]);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [wordIdx, setWordIdx] = useState(-1);
  const [ranges, setRanges] = useState<([number, number] | null)[]>([]);
  const stopped = useRef(false);
  const story = stories.find((s) => s.id === storyId) ?? null;

  // Follow the audio clock for highlighting.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setWordIdx(player.currentWordIndex());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => player.stop(), []);

  async function readFrom(start: number) {
    if (!story) return;
    if (!voiceId) return onError("Add a voice ID first (top of the page).");
    stopped.current = false;
    setFinished(false);
    setPlaying(true);
    try {
      for (let i = start; i < story.lines.length; i++) {
        setLineIdx(i);
        setRanges([]);
        if (i + 1 < story.lines.length) prefetch(voiceId, story.id, i + 1, relation);
        const speaking = player.speak({ voiceId, storyId: story.id, line: i, relation });
        // Word timestamps arrive with the audio; compute character ranges once they're in.
        const iv = setInterval(() => setRanges(wordRanges(story.lines[i].zh, player.currentWords())), 100);
        try {
          await speaking;
        } finally {
          clearInterval(iv);
          setRanges(wordRanges(story.lines[i].zh, player.currentWords()));
        }
        await new Promise((r) => setTimeout(r, PAUSE_MS));
        if (stopped.current) throw new StoppedError();
      }
      setFinished(true);
    } catch (e) {
      if (!(e instanceof StoppedError)) onError((e as Error).message);
    }
    setPlaying(false);
  }

  function stop() {
    stopped.current = true;
    player.stop();
  }

  if (!story && phase === "goodnight") {
    return (
      <GoodnightRoom
        voiceId={voiceId}
        whoLabel={whoLabel}
        mouth={mouth}
        onError={onError}
        onDone={(w) => (setSaid(w), setPhase("stories"))}
      />
    );
  }

  if (!story) {
    return (
      <section className="night">
        <h2>Bedtime stories 睡前故事</h2>
        <p className="muted-night">Read by {whoLabel}'s voice, in Mandarin. Pick tonight's story:</p>
        <div className="story-list">
          {stories.map((s) => (
            <button key={s.id} className="story-pick" onClick={() => (setStoryId(s.id), setLineIdx(0), setFinished(false))}>
              <span className="emoji">{s.emoji}</span>
              <span className="story-title">{s.title}</span>
              <span className="muted-night">{s.titlePinyin}</span>
              <span className="muted-night">{s.titleEn}</span>
            </button>
          ))}
        </div>
        <button className="ghost" onClick={() => setPhase("goodnight")}>
          🌙 Say goodnight to the room {said.length ? "again" : "first"}
        </button>
        <p className="fineprint-night">
          Reading the same story a few nights in a row is fine — repetition is part of how little ones learn words.
        </p>
      </section>
    );
  }

  const line = story.lines[lineIdx];
  const current = wordIdx >= 0 ? ranges[wordIdx] : null;
  const readUpTo = ranges.slice(0, Math.max(0, wordIdx)).reduce((m, r) => (r ? Math.max(m, r[1]) : m), 0);

  return (
    <section className="night">
      <div className="night-top">
        <button className="ghost" onClick={() => (stop(), setStoryId(null))}>
          ← Stories
        </button>
        <div className="story-head">
          <span className="emoji">{story.emoji}</span> {story.title}
        </div>
        <label className="en-toggle">
          <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} /> English (for parents)
        </label>
      </div>

      <div className="stage">
        <Teacher mouth={mouth} speaking={playing} />
      </div>

      {!finished ? (
        <div className="page">
          <div className="pinyin">{line.pinyin}</div>
          <div className="hanzi" lang="zh">
            {[...line.zh].map((ch, i) => {
              const now = current && i >= current[0] && i < current[1];
              const done = !now && i < readUpTo;
              return (
                <span key={i} className={now ? "now" : done ? "done" : ""}>
                  {ch}
                </span>
              );
            })}
          </div>
          {showEn && <div className="gloss">{line.en}</div>}
          <div className="dots">
            {story.lines.map((_, i) => (
              <span key={i} className={i === lineIdx ? "on" : i < lineIdx ? "past" : ""} />
            ))}
          </div>
        </div>
      ) : (
        <div className="page">
          <div className="hanzi">晚安 🌙</div>
          <p className="muted-night">The end. The story stops here — nothing plays while your child sleeps.</p>
          {said.length > 0 && (
            <div className="hanzi gn-end" lang="zh">
              {said.map((w) => w.emoji).join(" ")} {said.map(gnName).join("、")}也睡觉了
              <div className="muted-night gn-end-en">
                {said.map((w) => w.en).join(", ")} — all asleep too.
              </div>
            </div>
          )}
          <div className="recap">
            <div className="recap-title">Tomorrow morning, ask: do you remember…?</div>
            {story.keyWords.map((k) => (
              <span key={k.zh} className="recap-word">
                {k.zh} <small>{k.pinyin}</small> <small className="muted-night">{k.en}</small>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="controls">
        {playing ? (
          <button className="big" onClick={stop}>
            ⏹ Stop
          </button>
        ) : (
          <>
            <button className="big" onClick={() => readFrom(finished ? 0 : lineIdx)}>
              {finished ? "↺ Read it again" : lineIdx === 0 ? "▶ Read to me" : "▶ Keep reading"}
            </button>
            {lineIdx > 0 && !finished && (
              <button className="ghost" onClick={() => (setLineIdx(0), setRanges([]))}>
                ↺ Start over
              </button>
            )}
          </>
        )}
      </div>

      <div className="badge-night">🔊 AI clone of {whoLabel}'s voice — not a real recording</div>
    </section>
  );
}
