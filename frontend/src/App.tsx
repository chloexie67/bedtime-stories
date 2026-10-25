import { useEffect, useRef, useState } from "react";
import {
  deleteVoice,
  getStories,
  getVocab,
  makeMandarin,
  RELATION_LABELS,
  type Relation,
  type Story,
  type Word,
} from "./api";
import { player, StoppedError } from "./player";
import { mouthFor, type Mouth } from "./phonemes";
import { Teacher } from "./Teacher";
import { StoryReader } from "./StoryReader";

const read = (k: string, d = "") => {
  try {
    return localStorage.getItem(k) || d;
  } catch {
    return d;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

type Tab = "story" | "words";

export default function App() {
  const [voiceId, setVoiceId] = useState(read("voiceId"));
  const [relation, setRelation] = useState<Relation>(read("relation", "nainai") as Relation);
  const [tab, setTab] = useState<Tab>("story");
  const [stories, setStories] = useState<Story[]>([]);
  const [vocab, setVocab] = useState<Word[]>([]);
  const [word, setWord] = useState<Word | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [mouth, setMouth] = useState<Mouth>("rest");
  const raf = useRef(0);
  const who = RELATION_LABELS[relation];
  const whoLabel = `${who.en.replace(/ \(.*\)/, "")} ${who.zh}`;
  const isParent = relation === "mama" || relation === "baba";

  useEffect(() => write("voiceId", voiceId), [voiceId]);
  useEffect(() => write("relation", relation), [relation]);

  useEffect(() => {
    getVocab().then(setVocab).catch(() => setError("Backend not reachable — is it running on :8787?"));
  }, []);
  useEffect(() => {
    getStories(relation).then(setStories).catch(() => {});
  }, [relation]);

  // Drive Bao's mouth from the audio clock.
  useEffect(() => {
    const tick = () => {
      const cur = player.currentPhoneme();
      setMouth(cur ? mouthFor(cur.text) : "rest");
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  function switchTab(t: Tab) {
    player.stop();
    setTab(t);
  }

  // Point-and-name / word list: the child hears the MANDARIN word in the family member's voice.
  async function teach(w: Word) {
    if (!voiceId) return setError("Add a voice ID first.");
    setWord(w);
    setError("");
    setBusy(true);
    try {
      await player.speak({ voiceId, wordId: w.id, part: "zh", wordOnly: true });
      await new Promise((r) => setTimeout(r, 400));
      await player.speak({ voiceId, wordId: w.id, part: "zh" });
    } catch (e) {
      if (!(e instanceof StoppedError)) setError((e as Error).message);
    }
    setBusy(false);
  }

  async function sayAgain() {
    if (!word) return;
    setBusy(true);
    try {
      await player.speak({ voiceId, wordId: word.id, part: "zh", wordOnly: true, speed: 0.75 });
    } catch (e) {
      if (!(e instanceof StoppedError)) setError((e as Error).message);
    }
    setBusy(false);
  }

  async function nativeMandarin() {
    try {
      setNote("Adding a native Mandarin accent…");
      await makeMandarin(voiceId);
      setNote("Done — this voice now reads Mandarin with a native accent.");
    } catch (e) {
      setNote("");
      setError((e as Error).message);
    }
  }

  async function removeVoice() {
    if (!voiceId || !confirm("Permanently delete this cloned voice from Cartesia?")) return;
    try {
      player.stop();
      await deleteVoice(voiceId);
      setVoiceId("");
      setWord(null);
      setNote("Voice deleted.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Bedtime Stories</h1>
        <div className="voice">
          <select value={relation} onChange={(e) => setRelation(e.target.value as Relation)} aria-label="Whose voice">
            {(Object.keys(RELATION_LABELS) as Relation[]).map((r) => (
              <option key={r} value={r}>
                {RELATION_LABELS[r].zh} · {RELATION_LABELS[r].en}
              </option>
            ))}
          </select>
          <input placeholder="Voice ID" value={voiceId} onChange={(e) => setVoiceId(e.target.value.trim())} />
          {voiceId && isParent && (
            <button onClick={nativeMandarin} title="For a parent who speaks English: make their voice read Mandarin fluently">
              Make voice fluent in Mandarin
            </button>
          )}
          {voiceId && (
            <button className="danger" onClick={removeVoice}>
              Delete my voice
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error" onClick={() => setError("")}>
          {error}
        </div>
      )}
      {note && <div className="note">{note}</div>}

      <nav className="tabs">
        <button className={tab === "story" ? "on" : ""} onClick={() => switchTab("story")}>
          🌙 Bedtime story
        </button>
        <button className={tab === "words" ? "on" : ""} onClick={() => switchTab("words")}>
          Words
        </button>
      </nav>

      {tab === "story" ? (
        <StoryReader
          stories={stories}
          voiceId={voiceId}
          relation={relation}
          whoLabel={whoLabel}
          mouth={mouth}
          onError={setError}
        />
      ) : (
        <main>
          <div className="left">
            <div className="grid">
              {vocab.map((w) => (
                <button key={w.id} onClick={() => teach(w)} disabled={busy}>
                  <span className="emoji">{w.emoji}</span>
                  <span lang="zh">{w.zh}</span>
                  <span className="muted">{w.pinyin}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="right">
            <Teacher mouth={mouth} speaking={busy} />
            {word && (
              <div className="card">
                <span className="emoji">{word.emoji}</span>
                <div>
                  <div className="zhword" lang="zh">
                    {word.zh} <span className="muted">{word.pinyin}</span>
                  </div>
                  <div className="muted">{word.en}</div>
                </div>
                <button onClick={sayAgain} disabled={busy}>
                  🐢 Say it slowly
                </button>
              </div>
            )}
            {word && <div className="badge">🔊 AI clone of {whoLabel}'s voice — not a real recording</div>}
          </div>
        </main>
      )}
    </div>
  );
}
