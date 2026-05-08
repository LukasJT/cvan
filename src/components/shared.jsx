import React, { useEffect, useRef, useState } from "react";
import { THEMES } from "../theme.js";

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

/* Settings cog (top-left). Click toggles a popover with theme picker.
   Designed to grow as more app-level settings get added later. */
export function SettingsCog({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        aria-label="Settings"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "1px solid var(--frame-border)",
          color: "var(--accent-gold)",
          width: 36,
          height: 36,
          padding: 0,
          borderRadius: 2,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <CogIcon spinning={open} />
      </button>
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 100,
            minWidth: 220,
            background: "linear-gradient(180deg, var(--panel-bg-from) 0%, var(--panel-bg-to) 100%)",
            border: "1px solid var(--frame-border)",
            borderRadius: 4,
            padding: "0.75rem",
            backdropFilter: "blur(6px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div className="mono text-xs uppercase tracking-widest mb-2 muted">Theme</div>
          <div className="flex flex-col gap-1">
            {THEMES.map((t) => (
              <ThemeOption
                key={t}
                value={t}
                current={theme}
                onPick={(v) => { setTheme(v); setOpen(false); }}
              />
            ))}
          </div>
          <div className="mt-2 mono text-xs subtle" style={{ borderTop: "1px solid var(--panel-border)", paddingTop: "0.5rem" }}>
            Red mode preserves dark adaptation for nighttime field use.
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeOption({ value, current, onPick }) {
  const labels = {
    dark: { name: "Dark", desc: "Default night-sky theme" },
    light: { name: "Light", desc: "Daytime / planning use" },
    red: { name: "Red night-vision", desc: "Astronomy red light" },
  };
  const swatchFill = {
    dark: "linear-gradient(135deg, #0d1b3d, #02040a)",
    light: "linear-gradient(135deg, #f5f1e6, #cec0a0)",
    red: "linear-gradient(135deg, #260000, #0a0000)",
  };
  const swatchAccent = { dark: "#d4b86a", light: "#7a5f1f", red: "#ff4040" };
  const active = value === current;
  return (
    <button
      onClick={() => onPick(value)}
      className="ghost"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.4rem 0.5rem",
        background: active ? "var(--strip-bg)" : "transparent",
        borderColor: active ? "var(--accent-gold)" : "var(--frame-border)",
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 2,
        background: swatchFill[value],
        border: `1px solid ${swatchAccent[value]}`,
        display: "inline-block",
        flexShrink: 0,
      }} />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span className="display gold" style={{ fontSize: "0.8rem" }}>{labels[value].name}</span>
        <span className="mono muted" style={{ fontSize: "0.65rem", letterSpacing: "0.05em" }}>{labels[value].desc}</span>
      </span>
      {active && <span className="mono gold" style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>}
    </button>
  );
}

function CogIcon({ spinning }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease", transform: spinning ? "rotate(60deg)" : "none" }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
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
