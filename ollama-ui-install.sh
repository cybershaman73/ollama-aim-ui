#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Settings (override via env if you like)
# ──────────────────────────────────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/cybershaman73/ollama-aim-ui}"
BASE_DIR="${BASE_DIR:-$HOME}"
REPO_NAME="ollama-aim-ui"
REPO_DIR="${BASE_DIR}/${REPO_NAME}"
SESSION_NAME="${SESSION_NAME:-ollama-ui}"
DEFAULT_DEV_PORT="${DEV_PORT:-8880}"

manage_tmux() {
  case "${1:-}" in
    start|restart)
      echo "🚀 Starting tmux session '${SESSION_NAME}'..."
      if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
        tmux kill-session -t "${SESSION_NAME}" || true
      fi
      cd "${REPO_DIR}" && tmux new -s "${SESSION_NAME}" -d "npm run dev"
      echo "✅ Vite running in tmux session '${SESSION_NAME}'"
      echo "   Attach: tmux attach -t ${SESSION_NAME}"
      ;;
    stop)
      echo "🛑 Stopping tmux session '${SESSION_NAME}'..."
      tmux kill-session -t "${SESSION_NAME}" || echo "  • No session found."
      ;;
    attach)
      tmux attach -t "${SESSION_NAME}" || echo "  • No session found. Start it first."
      ;;
    *)
      echo "Usage: bash $(basename "$0") [start|stop|attach|restart]"
      ;;
  esac
}

# If user only wants to control tmux, do that and exit
if [[ "${1:-}" =~ ^(start|stop|attach|restart)$ ]]; then
  manage_tmux "$1"
  exit 0
fi

# ──────────────────────────────────────────────────────────────────────────────
# Inputs
# ──────────────────────────────────────────────────────────────────────────────
echo "=== HyperCycle Ollama AIM UI — Installer ==="
read -rp "AIM host IP (e.g. 172.27.126.244): " AIM_IP
read -rp "AIM slot index (e.g. 0): " AIM_SLOT
read -rp "Ollama UI Server port [${DEFAULT_DEV_PORT}]: " USER_PORT || true
DEV_PORT="${USER_PORT:-$DEFAULT_DEV_PORT}"

if ! [[ "${AIM_IP}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "ERROR: '${AIM_IP}' is not a valid IPv4 address."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# Prereqs
# ──────────────────────────────────────────────────────────────────────────────
if command -v apt >/dev/null 2>&1; then
  sudo apt update -y
  sudo apt install -y mkcert libnss3-tools git tmux curl
fi

command -v npm >/dev/null 2>&1 || { echo "ERROR: npm required (Node >= 18)."; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
# Clone/update repo
# ──────────────────────────────────────────────────────────────────────────────
if [[ -d "${REPO_DIR}/.git" ]]; then
  echo "=== Pulling latest in ${REPO_DIR} ==="
  git -C "${REPO_DIR}" pull --ff-only || true
else
  echo "=== Cloning ${REPO_URL} → ${REPO_DIR} ==="
  git clone --depth=1 "${REPO_URL}" "${REPO_DIR}"
fi

cd "${REPO_DIR}"

# ──────────────────────────────────────────────────────────────────────────────
# SSL (mkcert) — certs live in repo root next to vite.config.ts
# ──────────────────────────────────────────────────────────────────────────────
mkcert -install || true

KEY_FILE="./${AIM_IP}-key.pem"
CRT_FILE="./${AIM_IP}.pem"
[[ -f "${KEY_FILE}" && -f "${CRT_FILE}" ]] || mkcert "${AIM_IP}"

# ──────────────────────────────────────────────────────────────────────────────
# Modify vite.config.ts per env and set for hybrid chat operations
# ──────────────────────────────────────────────────────────────────────────────
VITE_CFG="${REPO_DIR}/vite.config.ts"
cat > "${VITE_CFG}" <<EOF
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
      port: ${DEV_PORT},
      https: {
        key: fs.readFileSync("./${AIM_IP}-key.pem"),
        cert: fs.readFileSync("./${AIM_IP}.pem"),
      },
      proxy: {
        "/aim": {
          target: "http://${AIM_IP}:8006",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\\/aim/, "/api/aim"),
        },
        "/balance":     { target: "http://${AIM_IP}:8000", changeOrigin: true },
        "/info":        { target: "http://${AIM_IP}:8000", changeOrigin: true },
        "/health":      { target: "http://${AIM_IP}:8000", changeOrigin: true },
        "/nonce":       { target: "http://${AIM_IP}:8000", changeOrigin: true },
        "/auth":        { target: "http://${AIM_IP}:8000", changeOrigin: true },
        "/auth/nonce":  { target: "http://${AIM_IP}:8000", changeOrigin: true },

        // Stream server on port 4001 — support BOTH styles
        // 1) Direct /stream and /chat
        "/stream": { target: "http://${AIM_IP}:4001", changeOrigin: true },
        "/chat":   { target: "http://${AIM_IP}:4001", changeOrigin: true },

        // 2) Legacy /stream/chat -> /chat
        "/stream/chat": {
          target: "http://${AIM_IP}:4001",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\\/stream\\/chat/, "/chat"),
        },
      },
    },
  };
});
EOF

# ──────────────────────────────────────────────────────────────────────────────
# .env.local
# ──────────────────────────────────────────────────────────────────────────────
ENV_FILE="${REPO_DIR}/.env.local"
cat > "${ENV_FILE}" <<EOF
# Node Manager / AIM API endpoint
VITE_NODE_URL=https://${AIM_IP}:${DEV_PORT}

# AIM slot index
VITE_AIM_SLOT=${AIM_SLOT}

# AIM action used to request generation or token
VITE_AIM_URI=/request

# Stream server used for real-time responses
VITE_STREAM_HOST=https://${AIM_IP}:${DEV_PORT}

# Base route for router
VITE_BASE_ROUTE=/
EOF

echo "=== .env.local ==="
cat "${ENV_FILE}"

# ──────────────────────────────────────────────────────────────────────────────
# Install deps quietly (suppress noise + peer issues)
# ──────────────────────────────────────────────────────────────────────────────
export npm_config_fund=false
export npm_config_audit=false
export npm_config_loglevel=error

if [[ -f package-lock.json ]]; then
  (npm ci --legacy-peer-deps --no-audit --no-fund --quiet || npm install --legacy-peer-deps --no-audit --no-fund --quiet)
else
  npm install --legacy-peer-deps --no-audit --no-fund --quiet
fi

# ──────────────────────────────────────────────────────────────────────────────
# Start Ollama UI Server in tmux
# ──────────────────────────────────────────────────────────────────────────────
manage_tmux start

echo
echo "✅ Setup complete!"
echo "UI:    https://${AIM_IP}:${DEV_PORT}/"
echo
echo "🧭 tmux controls:"
echo "  • Attach:   tmux attach -t ${SESSION_NAME}"
echo "  • Detach:   Ctrl+b, then d"
echo "  • Restart:  bash $(basename "$0") restart"
echo "  • Stop:     bash $(basename "$0") stop"
echo "  • Start:    bash $(basename "$0") start"
