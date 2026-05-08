import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Repo is LukasJT/cvan, so Pages serves at /cvan/
export default defineConfig({
  plugins: [react()],
  base: "/cvan/",
});
