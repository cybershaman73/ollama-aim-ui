/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    test: { environment: "jsdom", globals: true },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    base: env.VITE_BASE_ROUTE || "/",
    server: {
      host: "0.0.0.0",
      port: 8880,
      https: {
        key: fs.readFileSync("./172.27.126.244-key.pem"),
        cert: fs.readFileSync("./172.27.126.244.pem"),
      },
      proxy: {
        // AIM API on port 8006 → expose under /aim
        "/aim": {
          target: "http://172.27.126.244:8006",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/aim/, "/api/aim"),
        },

        // Node Manager core on port 8000
        "/balance": { target: "http://172.27.126.244:8000", changeOrigin: true },
        "/info":    { target: "http://172.27.126.244:8000", changeOrigin: true },
        "/health":  { target: "http://172.27.126.244:8000", changeOrigin: true },

        // Auth & nonce endpoints needed by hypercyclejs signing
        "/nonce":      { target: "http://172.27.126.244:8000", changeOrigin: true },
        "/auth":       { target: "http://172.27.126.244:8000", changeOrigin: true },
        "/auth/nonce": { target: "http://172.27.126.244:8000", changeOrigin: true },

        // Stream server on port 4001 — support BOTH styles
        // 1) Direct /chat
        "/stream": {
          target: "http://172.27.126.244:4001",
          changeOrigin: true,
        },
        "/chat": {
          target: "http://172.27.126.244:4001",
          changeOrigin: true,
        },
        // 2) Legacy /stream/chat -> /chat
        "/stream/chat": {
          target: "http://172.27.126.244:4001",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/stream\/chat/, "/chat"),
        },
      },
    },
  };
});
