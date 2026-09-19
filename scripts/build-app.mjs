import { build } from "vite";
import react from "@vitejs/plugin-react";

// Programmatic config keeps the production build deterministic and avoids
// environment-specific config discovery. vite.config.js remains the dev
// server's source of truth and intentionally mirrors these values.
await build({
  configFile: false,
  base: "/",
  plugins: [react()],
});
