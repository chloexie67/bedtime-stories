// "Bao", an original steamed-bun teacher. Mouth swaps between shapes driven by phonemes; idle blinking via CSS.
import type { Mouth } from "./phonemes";

const MOUTHS: Record<Mouth, JSX.Element> = {
  rest: <path d="M86 132 Q100 140 114 132" stroke="#5a2e1f" strokeWidth="4" fill="none" strokeLinecap="round" />,
  mbp: <path d="M86 134 L114 134" stroke="#5a2e1f" strokeWidth="5" strokeLinecap="round" />,
  etc: (
    <g>
      <ellipse cx="100" cy="134" rx="13" ry="6" fill="#5a2e1f" />
      <rect x="90" y="129" width="20" height="4" rx="2" fill="#fff" />
    </g>
  ),
  e: (
    <g>
      <ellipse cx="100" cy="134" rx="17" ry="7" fill="#5a2e1f" />
      <rect x="86" y="128" width="28" height="4" rx="2" fill="#fff" />
    </g>
  ),
  a: (
    <g>
      <ellipse cx="100" cy="137" rx="15" ry="14" fill="#5a2e1f" />
      <ellipse cx="100" cy="145" rx="9" ry="5" fill="#e8737d" />
    </g>
  ),
  o: (
    <g>
      <ellipse cx="100" cy="135" rx="8" ry="10" fill="#5a2e1f" stroke="#c9605a" strokeWidth="3" />
    </g>
  ),
  fv: (
    <g>
      <ellipse cx="100" cy="135" rx="14" ry="6" fill="#5a2e1f" />
      <rect x="89" y="128" width="22" height="6" rx="2" fill="#fff" />
    </g>
  ),
  th: (
    <g>
      <ellipse cx="100" cy="135" rx="14" ry="8" fill="#5a2e1f" />
      <rect x="89" y="127" width="22" height="4" rx="2" fill="#fff" />
      <ellipse cx="100" cy="136" rx="8" ry="4" fill="#e8737d" />
    </g>
  ),
  l: (
    <g>
      <ellipse cx="100" cy="136" rx="13" ry="11" fill="#5a2e1f" />
      <rect x="91" y="126" width="18" height="4" rx="2" fill="#fff" />
      <path d="M95 141 Q100 128 105 141 Z" fill="#e8737d" />
    </g>
  ),
};

export function Teacher({ mouth, speaking }: { mouth: Mouth; speaking: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={`teacher ${speaking ? "speaking" : ""}`} aria-label="Bao the teacher">
      {/* body */}
      <path d="M30 120 Q30 52 100 46 Q170 52 170 120 Q170 178 100 180 Q30 178 30 120 Z" fill="#fff6e6" stroke="#e8cfa7" strokeWidth="3" />
      {/* bun pleats */}
      <path d="M82 52 Q100 30 118 52" stroke="#e8cfa7" strokeWidth="3" fill="none" />
      <path d="M90 50 Q100 38 110 50" stroke="#e8cfa7" strokeWidth="3" fill="none" />
      {/* cheeks */}
      <ellipse cx="62" cy="122" rx="12" ry="7" fill="#f7b6b6" opacity="0.8" />
      <ellipse cx="138" cy="122" rx="12" ry="7" fill="#f7b6b6" opacity="0.8" />
      {/* eyes */}
      <g className="eyes">
        <ellipse cx="76" cy="102" rx="7" ry="9" fill="#3b2418" />
        <ellipse cx="124" cy="102" rx="7" ry="9" fill="#3b2418" />
        <circle cx="78" cy="99" r="2.4" fill="#fff" />
        <circle cx="126" cy="99" r="2.4" fill="#fff" />
      </g>
      {MOUTHS[mouth]}
    </svg>
  );
}
