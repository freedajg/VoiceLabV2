import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  // Two independent apps ship from this repo: VoiceLab at / and the JSMB
  // multi-agent prototype at /jsmb. Separate HTML entries keep their bundles,
  // stylesheets and React roots fully isolated.
  build: {
    rollupOptions: {
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        jsmb: new URL("./jsmb.html", import.meta.url).pathname,
      },
    },
  },
  server: { port: 5219, strictPort: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
