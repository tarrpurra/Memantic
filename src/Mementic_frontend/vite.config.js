import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from monorepo root if that's your layout
dotenv.config({ path: "../../.env" });
// Also load from frontend .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// 👉 If frontend lives at: <repo>/frontend and declarations at <repo>/src/declarations
//    set this to path.resolve(__dirname, "../declarations") only if your
//    declarations folder is sibling to frontend. Adjust to your structure.
const DECS_PATH = path.resolve(__dirname, "src/declarations");
// If you keep the DFX default (generated folder at <repo>/src/declarations),
// use: const DECS_PATH = path.resolve(__dirname, "../../src/declarations");

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    host: true, // optional: allow LAN access
    https: false, // Force HTTP for development
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // If you actually read these in code, keep them:
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    environment("all", { prefix: "VITE_" }),
  ],
  resolve: {
    alias: [
      // ✅ Separate alias entries
      { find: "@", replacement: path.resolve(__dirname, "src") },

      // ✅ One stable alias for generated declarations
      { find: "~declarations", replacement: DECS_PATH },

      // (Optional) Keep "declarations" too if you’ve used it already,
      // but prefer "~declarations" to avoid collisions with other libs.
      { find: "declarations", replacement: DECS_PATH },
    ],
    dedupe: ["@dfinity/agent"],
  },
});
