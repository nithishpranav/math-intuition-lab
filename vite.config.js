import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to GitHub Pages at https://USER.github.io/REPO/
// set base to "/REPO/". For a custom domain or local use, keep "/".
export default defineConfig({
  plugins: [react()],
  base: "/math-intuition-lab/",
});
