import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served at celestialvisibility.com (custom domain on GitHub Pages, via the
// CNAME file in public/). Base is "/" because the app lives at the apex.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
