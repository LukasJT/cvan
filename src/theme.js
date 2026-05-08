/* Theme system: dark (default), light, red (preserves dark adaptation).
   Applies CSS custom properties on :root via data-theme attribute. */

export const THEMES = ["dark", "light", "red"];

const PALETTES = {
  dark: {
    "--bg-base":         "#02040a",
    "--bg-grad-from":    "#0d1b3d",
    "--bg-grad-mid":     "#050914",
    "--bg-grad-to":      "#02040a",
    "--text-primary":    "#e8d9a8",
    "--text-secondary":  "#a8b5cd",
    "--text-muted":      "#8a9bb8",
    "--text-subtle":     "#5a6a85",
    "--accent-gold":     "#d4b86a",
    "--accent-gold-dim": "#a8924f",
    "--accent-green":    "#6dffb0",
    "--accent-purple":   "#c39bff",
    "--accent-blue":     "#6d9bff",
    "--accent-warm":     "#ffd56a",
    "--panel-bg-from":   "rgba(20,30,60,0.55)",
    "--panel-bg-to":     "rgba(10,15,35,0.70)",
    "--panel-border":    "rgba(212,184,106,0.25)",
    "--frame-border":    "rgba(212,184,106,0.4)",
    "--input-bg":        "rgba(0,0,0,0.3)",
    "--strip-bg":        "rgba(20,30,60,0.3)",
    "--warning":         "#ff9b6d",
    "--error":           "#ff5b5b",
    "--moon-fill":       "#e8d9a8",
    "--star-color":      "#ffffff",
    "--map-tile-filter": "invert(0.92) hue-rotate(180deg) brightness(0.85) contrast(0.95) saturate(0.6)",
  },
  light: {
    "--bg-base":         "#f5f1e6",
    "--bg-grad-from":    "#e8e0c8",
    "--bg-grad-mid":     "#ddd2b3",
    "--bg-grad-to":      "#cec0a0",
    "--text-primary":    "#2a1f0e",
    "--text-secondary":  "#4a3d28",
    "--text-muted":      "#6a5a40",
    "--text-subtle":     "#8a7a5a",
    "--accent-gold":     "#7a5f1f",
    "--accent-gold-dim": "#5a4515",
    "--accent-green":    "#1a6a3a",
    "--accent-purple":   "#5a2a8a",
    "--accent-blue":     "#1a3a8a",
    "--accent-warm":     "#9a6a1a",
    "--panel-bg-from":   "rgba(255,250,235,0.85)",
    "--panel-bg-to":     "rgba(232,224,200,0.90)",
    "--panel-border":    "rgba(122,95,31,0.35)",
    "--frame-border":    "rgba(122,95,31,0.5)",
    "--input-bg":        "rgba(255,255,255,0.7)",
    "--strip-bg":        "rgba(255,250,235,0.55)",
    "--warning":         "#a04020",
    "--error":           "#a01020",
    "--moon-fill":       "#5a4515",
    "--star-color":      "#5a4515",
    "--map-tile-filter": "none",
  },
  red: {
    /* Deep red on near-black to preserve dark-adapted vision (astronomy convention). */
    "--bg-base":         "#0a0000",
    "--bg-grad-from":    "#260000",
    "--bg-grad-mid":     "#150000",
    "--bg-grad-to":      "#0a0000",
    "--text-primary":    "#ff4040",
    "--text-secondary":  "#cc2a2a",
    "--text-muted":      "#a02020",
    "--text-subtle":     "#601515",
    "--accent-gold":     "#ff5050",
    "--accent-gold-dim": "#cc2a2a",
    "--accent-green":    "#ff4040",
    "--accent-purple":   "#ff4040",
    "--accent-blue":     "#ff4040",
    "--accent-warm":     "#ff4040",
    "--panel-bg-from":   "rgba(40,0,0,0.55)",
    "--panel-bg-to":     "rgba(20,0,0,0.70)",
    "--panel-border":    "rgba(255,80,80,0.25)",
    "--frame-border":    "rgba(255,80,80,0.4)",
    "--input-bg":        "rgba(40,0,0,0.5)",
    "--strip-bg":        "rgba(40,0,0,0.3)",
    "--warning":         "#ff4040",
    "--error":           "#ff4040",
    "--moon-fill":       "#ff4040",
    "--star-color":      "#ff4040",
    "--map-tile-filter": "invert(1) hue-rotate(180deg) saturate(0) sepia(1) hue-rotate(-50deg) saturate(8) brightness(0.45)",
  },
};

const STORAGE_KEY = "cvan-theme";

export function loadTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(v)) return v;
  } catch {/* localStorage unavailable */}
  return "dark";
}

export function applyTheme(name) {
  const palette = PALETTES[name] || PALETTES.dark;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v);
  root.setAttribute("data-theme", name);
  try { localStorage.setItem(STORAGE_KEY, name); } catch {/* ignore */}
}
