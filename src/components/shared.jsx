import React from "react";

export function DataCell({ label, value, sub }) {
  return (
    <div className="frame p-3">
      <div className="mono text-xs muted">{label}</div>
      <div className="display gold text-xl mt-1">{value}</div>
      {sub && <div className="body text-xs italic secondary">{sub}</div>}
    </div>
  );
}

export function ScoreRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="muted">{label}</span>
      <span className="gold mono text-xs">{value}</span>
    </div>
  );
}

export function Legend({ color, label, dashed }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ display: "inline-block", width: 20, height: 2, background: dashed ? "transparent" : color, borderTop: dashed ? `2px dashed ${color}` : "none" }} />
      <span>{label}</span>
    </div>
  );
}

export function VerdictCard({ title, verdict, icon }) {
  return (
    <div className="panel corner p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="display gold text-2xl">{icon}</span>
        <span className="display gold text-sm uppercase tracking-widest">{title}</span>
      </div>
      <div className="mono text-xs uppercase mb-1" style={{ color: verdict.color }}>{verdict.rating}</div>
      <div className="body text-sm primary">{verdict.text}</div>
      {verdict.note && <div className="body text-xs mt-2 muted italic">{verdict.note}</div>}
    </div>
  );
}

export function FactorRow({ label, status, note }) {
  const colors = {
    good: "var(--accent-green)",
    fair: "var(--accent-gold)",
    bad: "var(--error)",
    unknown: "var(--text-muted)",
  };
  return (
    <div className="frame p-3">
      <div className="flex items-center gap-3 mb-1">
        <span className="pill mono" style={{ background: colors[status], color: "var(--bg-base)" }}>{status.toUpperCase()}</span>
        <span className="display gold text-sm">{label}</span>
      </div>
      <div className="body text-sm secondary">{note}</div>
    </div>
  );
}

/* Composite visibility dial — full circle, fill proportional to score. */
export function ScoreDial({ score, label = "/ 100" }) {
  const v = Math.max(0, Math.min(100, score ?? 0));
  const r = 80;
  const circumference = 2 * Math.PI * r;
  const filled = (v / 100) * circumference;
  const color = v > 70 ? "var(--accent-green)" : v > 40 ? "var(--accent-gold)" : v > 15 ? "var(--warning)" : "var(--error)";
  return (
    <div style={{ width: "180px", height: "180px", margin: "0 auto" }}>
      <svg viewBox="0 0 200 200" width="180" height="180">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--panel-border)" strokeWidth="10" />
        {filled > 0.1 && (
          <circle
            cx="100" cy="100" r={r}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        )}
        <text x="100" y="108" textAnchor="middle" fontSize="42" fontFamily="Cinzel" fill={color}>{Math.round(v)}</text>
        <text x="100" y="132" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill="var(--text-muted)" letterSpacing="2">{label}</text>
      </svg>
    </div>
  );
}

export function OutOfRangeNotice({ what, horizon }) {
  return (
    <div className="frame p-3 my-2" style={{ borderColor: "var(--warning)" }}>
      <div className="mono text-xs uppercase tracking-widest" style={{ color: "var(--warning)" }}>
        Forecast out of range
      </div>
      <div className="body text-sm secondary mt-1">
        {what} is unavailable beyond {horizon}. Astronomical factors (sun, moon, Milky Way core position, twilight) are still computed; weather is excluded from the score.
      </div>
    </div>
  );
}

export function Insignia() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <radialGradient id="cvan-insig-sky" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--bg-grad-from)" />
          <stop offset="100%" stopColor="var(--bg-base)" />
        </radialGradient>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#cvan-insig-sky)" stroke="var(--accent-gold)" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-grad-from)" strokeWidth="2" />
      <path d="M 8 32 Q 14 18 20 30 Q 26 14 32 28 Q 40 12 48 30" fill="none" stroke="var(--accent-green)" strokeWidth="1.2" opacity="0.7" />
      <path d="M 10 36 Q 18 24 24 34 Q 32 20 40 32 Q 46 22 50 34" fill="none" stroke="var(--accent-purple)" strokeWidth="1" opacity="0.5" />
      <circle cx="28" cy="22" r="1.4" fill="var(--star-color)" />
      <circle cx="20" cy="18" r="0.8" fill="var(--star-color)" />
      <circle cx="36" cy="20" r="0.8" fill="var(--star-color)" />
      <circle cx="42" cy="26" r="0.6" fill="var(--star-color)" />
      <path d="M 8 42 L 20 38 L 28 42 L 36 38 L 48 42 L 48 50 L 8 50 Z" fill="var(--bg-base)" stroke="var(--bg-grad-from)" />
    </svg>
  );
}
