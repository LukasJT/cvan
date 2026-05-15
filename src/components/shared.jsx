import React, { useEffect, useMemo, useRef, useState } from "react";
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

/* Forward-only time offset slider in 1-hour steps. Fits inside a panel
   header strip — labels show NOW vs the previewed local time at the
   user's location. `tzName` is optional; when provided, the previewed
   time renders in that timezone instead of the browser's. */
/* Slider whose first stop is "now" (e.g. 12:48) and every subsequent stop
   snaps to the next 15-minute clock boundary (1:00, 1:15, 1:30, …) out to
   `maxHours` ahead. Callers store either null (= now) or an absolute Date
   in `previewTime`; the slider maps that to a slot index internally and
   the parent always gets a concrete instant to render. */
export function TimeOffsetSlider({ now, previewTime, setPreviewTime, maxHours, tzName, label = "Forecast Time" }) {
  // Recompute slots whenever a new clock-minute lands, but ONLY structurally
  // (count + first/last visible label changes once per hour). Listing key by
  // current hour keeps the array reference stable for sub-hour ticks.
  const nowMs = now.getTime();
  const hourKey = Math.floor(nowMs / 3600000);
  const slots = useMemo(() => {
    const out = [now];
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    const cutoffMs = nowMs + maxHours * 3600000;
    let t = next;
    while (t.getTime() <= cutoffMs) {
      out.push(t);
      t = new Date(t.getTime() + 15 * 60000);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourKey, maxHours]);

  // Map current preview to a slot index. previewTime null/now → slot 0;
  // otherwise pick the slot closest in time.
  const idx = useMemo(() => {
    if (!previewTime) return 0;
    const target = previewTime.getTime();
    let best = 0, bestD = Infinity;
    for (let i = 0; i < slots.length; i++) {
      const d = Math.abs(slots[i].getTime() - target);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }, [previewTime, slots]);

  const fmt = (d, opts) =>
    tzName ? d.toLocaleString([], { ...opts, timeZone: tzName })
           : d.toLocaleString([], opts);
  const labelFor = (i) => {
    if (i === 0) return `NOW · ${fmt(slots[0], { hour: "2-digit", minute: "2-digit" })}`;
    return fmt(slots[i], { weekday: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase();
  };

  const onChange = (e) => {
    const i = parseInt(e.target.value);
    setPreviewTime(i === 0 ? null : slots[i]);
  };
  const onNow = () => setPreviewTime(null);

  const isNow = idx === 0;
  const offsetMs = isNow ? 0 : slots[idx].getTime() - nowMs;
  const offsetH = offsetMs / 3600000;
  const offsetLabel = isNow
    ? null
    : offsetH < 1 ? `+${Math.round(offsetMs / 60000)}m`
    : offsetH < 24 ? `+${offsetH.toFixed(2)}h`
    : `+${Math.floor(offsetH / 24)}d ${Math.round(offsetH % 24)}h`;

  const days = Math.floor(maxHours / 24);
  return (
    <div className="frame p-3 mb-3">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="mono text-xs uppercase tracking-widest muted">{label}</span>
          <span className="display gold text-sm">{labelFor(idx)}</span>
          {offsetLabel && <span className="mono text-xs subtle">{offsetLabel}</span>}
        </div>
        <button
          className="ghost"
          onClick={onNow}
          disabled={isNow}
          style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem", opacity: isNow ? 0.4 : 1 }}
        >
          NOW
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, slots.length - 1)}
        step={1}
        value={idx}
        onChange={onChange}
        style={{ width: "100%" }}
      />
      <div className="mono text-xs flex justify-between mt-1 subtle">
        <span>now</span>
        <span>+{Math.floor(maxHours / 2 / 24) || 0}d {(maxHours / 2) % 24 ? `${(maxHours / 2) % 24}h` : ""}</span>
        <span>+{days}d</span>
      </div>
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

/* Settings cog (top-left). Click toggles a popover. The popover itself
   contains a small "Theme" cog (opens a sub-popover with the swatches)
   and an "i" info button at the bottom that routes to the in-app
   citations / About page. */
export function SettingsCog({ theme, setTheme, onOpenInfo }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
      setOpen(false);
      setThemeOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); setThemeOpen(false); } };
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
            minWidth: 240,
            background: "linear-gradient(180deg, var(--panel-bg-from) 0%, var(--panel-bg-to) 100%)",
            border: "1px solid var(--frame-border)",
            borderRadius: 4,
            padding: "0.75rem",
            backdropFilter: "blur(6px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div className="mono text-xs uppercase tracking-widest mb-2 muted">Settings</div>

          {/* Theme — represented as a sub-cog row that flips out the swatches */}
          <button
            className="ghost"
            onClick={() => setThemeOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              width: "100%",
              padding: "0.5rem",
              border: "1px solid var(--frame-border)",
              borderColor: themeOpen ? "var(--accent-gold)" : "var(--frame-border)",
              background: themeOpen ? "var(--strip-bg)" : "transparent",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, color: "var(--accent-gold)",
            }}>
              <CogIcon spinning={themeOpen} small />
            </span>
            <span className="display gold" style={{ fontSize: "0.78rem" }}>Color theme</span>
            <span className="mono muted" style={{ marginLeft: "auto", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {theme}
            </span>
          </button>
          {themeOpen && (
            <div className="flex flex-col gap-1 mt-1" style={{ paddingLeft: "0.5rem" }}>
              {THEMES.map((t) => (
                <ThemeOption
                  key={t}
                  value={t}
                  current={theme}
                  onPick={(v) => { setTheme(v); }}
                />
              ))}
              <div className="mono subtle mt-1" style={{ fontSize: "0.62rem" }}>
                Red mode preserves dark adaptation for field use.
              </div>
            </div>
          )}

          {/* Info / About + citations */}
          <button
            className="ghost"
            onClick={() => { onOpenInfo?.(); setOpen(false); setThemeOpen(false); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              width: "100%",
              marginTop: "0.6rem",
              padding: "0.5rem",
              border: "1px solid var(--frame-border)",
              cursor: "pointer",
              borderRadius: 2,
            }}
            title="About CVAN, methodology, and full citations"
          >
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22,
              border: "1px solid var(--accent-gold)", borderRadius: "50%",
              color: "var(--accent-gold)",
              fontFamily: "Cormorant Garamond, serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "0.85rem",
              lineHeight: 1,
            }}>i</span>
            <span className="display gold" style={{ fontSize: "0.78rem" }}>About &amp; sources</span>
          </button>
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

function CogIcon({ spinning, small }) {
  const sz = small ? 14 : 18;
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease", transform: spinning ? "rotate(60deg)" : "none" }}>
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
