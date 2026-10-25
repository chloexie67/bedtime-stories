// Articulation coach: shows a close-up mouth diagram the moment a tricky sound plays (driven by Cartesia
// phoneme timestamps), and afterwards lists the tricky sounds in the word with a slow practice replay.
import type { Tricky } from "./phonemes";

function Diagram({ k }: { k: string }) {
  // Front-view close-ups: lips, teeth, tongue. Simple on purpose.
  const lips = "#d9636b";
  const tongue = "#f19aa3";
  const dark = "#4a1f1a";
  switch (k) {
    case "θ":
    case "ð":
      return (
        <svg viewBox="0 0 160 100" className="diagram">
          <ellipse cx="80" cy="50" rx="60" ry="26" fill={lips} />
          <ellipse cx="80" cy="50" rx="48" ry="15" fill={dark} />
          <rect x="44" y="35" width="72" height="11" rx="3" fill="#fff" />
          <rect x="44" y="55" width="72" height="9" rx="3" fill="#fff" />
          <ellipse cx="80" cy="51" rx="24" ry="7" fill={tongue} stroke="#c66" />
          {k === "ð" && <text x="132" y="22" fontSize="14">〰️</text>}
          <text x="132" y="95" fontSize="12" fill="#666">air →</text>
        </svg>
      );
    case "v":
      return (
        <svg viewBox="0 0 160 100" className="diagram">
          <path d="M20 46 Q80 18 140 46 Z" fill={lips} />
          <rect x="44" y="40" width="72" height="12" rx="3" fill="#fff" />
          <path d="M20 54 Q80 82 140 54 Q80 48 20 54 Z" fill={lips} />
          <text x="18" y="95" fontSize="12" fill="#666">top teeth on bottom lip + hum</text>
        </svg>
      );
    case "ɹ":
      return (
        <svg viewBox="0 0 160 100" className="diagram">
          <circle cx="80" cy="50" r="26" fill={lips} />
          <circle cx="80" cy="50" r="13" fill={dark} />
          <path d="M70 58 Q80 44 90 58" fill={tongue} opacity="0.6" />
          <text x="22" y="95" fontSize="12" fill="#666">round lips, tongue pulled back</text>
        </svg>
      );
    case "l":
      return (
        <svg viewBox="0 0 160 100" className="diagram">
          <ellipse cx="80" cy="50" rx="46" ry="30" fill={lips} />
          <ellipse cx="80" cy="50" rx="36" ry="20" fill={dark} />
          <rect x="54" y="30" width="52" height="8" rx="3" fill="#fff" />
          <path d="M66 70 Q80 30 94 70 Z" fill={tongue} />
          <text x="20" y="97" fontSize="12" fill="#666">tongue tip up behind top teeth</text>
        </svg>
      );
    default: // æ
      return (
        <svg viewBox="0 0 160 100" className="diagram">
          <ellipse cx="80" cy="48" rx="58" ry="38" fill={lips} />
          <ellipse cx="80" cy="48" rx="48" ry="28" fill={dark} />
          <rect x="46" y="22" width="68" height="8" rx="3" fill="#fff" />
          <ellipse cx="80" cy="68" rx="30" ry="7" fill={tongue} />
        </svg>
      );
  }
}

export function ArticulationCoach({
  live,
  found,
  onPractice,
  busy,
}: {
  live: Tricky | null; // sound playing right now
  found: Tricky[]; // tricky sounds in the last English line
  onPractice: () => void;
  busy: boolean;
}) {
  const show = live ?? found[0] ?? null;
  return (
    <section className="coach">
      <h3>Mouth coach</h3>
      {!show && <p className="muted">Tricky English sounds will show up here while Bao talks.</p>}
      {show && (
        <div className={`coach-card ${live ? "live" : ""}`}>
          <Diagram k={show.key} />
          <div>
            <div className="coach-label">
              {show.label} <span className="muted">as in {show.example}</span>
            </div>
            <p>{show.tip}</p>
            <p className="zh">{show.tipZh}</p>
          </div>
        </div>
      )}
      {found.length > 0 && (
        <div className="chips">
          <span className="muted">In this word:</span>
          {found.map((t) => (
            <span key={t.key} className={`chip ${live?.key === t.key ? "on" : ""}`}>
              {t.label}
            </span>
          ))}
          <button onClick={onPractice} disabled={busy}>
            🐢 Practice slowly
          </button>
        </div>
      )}
    </section>
  );
}
