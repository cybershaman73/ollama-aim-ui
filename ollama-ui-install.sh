#!/usr/bin/env bash
# --- CHECK: Does the current user have sudo privileges? -----------------------
if ! groups "$(whoami)" | grep -qw "sudo"; then
  echo "ERROR: This install script requires a user with sudo privileges."
  echo "Please run this script as a user that is a member of the 'sudo' group."
  echo ""
  echo "If you meant to run with sudo, try:"
  echo "    sudo $0"
  exit 1
fi
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
echo "=== HyperCycle Ollama AIM UI — Installer (split-host ready) ==="
read -rp "UI host IP (public address where the UI will be served, e.g. 172.27.126.244): " UI_IP
read -rp "AIM/Node Manager host IP (backend target, e.g. 10.1.2.3): " AIM_HOST
read -rp "AIM slot index (e.g. 0): " AIM_SLOT
read -rp "Ollama UI Server port [${DEFAULT_DEV_PORT}]: " USER_PORT || true
DEV_PORT="${USER_PORT:-$DEFAULT_DEV_PORT}"

is_ipv4() { [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; }
if ! is_ipv4 "${UI_IP}"; then echo "ERROR: UI host '${UI_IP}' is not a valid IPv4."; exit 1; fi
if ! is_ipv4 "${AIM_HOST}"; then echo "ERROR: AIM host '${AIM_HOST}' is not a valid IPv4."; exit 1; fi

# ──────────────────────────────────────────────────────────────────────────────
# Prereqs
# ──────────────────────────────────────────────────────────────────────────────
if command -v apt >/dev/null 2>&1; then
  sudo apt update -y
  sudo apt install -y git tmux curl
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
# mkcert auto-install (ARM64-aware)
# ──────────────────────────────────────────────────────────────────────────────
ensure_mkcert() {
  if command -v mkcert >/dev/null 2>&1; then
    echo "mkcert already installed."
    return 0
  fi

  echo "=== Installing mkcert (trying apt first) ==="
  if command -v apt >/dev/null 2>&1; then
    sudo apt update -y || true
    sudo apt install -y software-properties-common || true
    sudo add-apt-repository -y universe || true
    sudo apt update -y || true
    if sudo apt install -y mkcert libnss3-tools ca-certificates; then
      mkcert -install
      return 0
    fi
    echo "apt install failed; trying Homebrew…"
  fi

  if ! command -v brew >/dev/null 2>&1; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> "$HOME/.bashrc"
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" || true
  fi

  if command -v brew >/dev/null 2>&1; then
    if brew install mkcert nss; then
      mkcert -install
      return 0
    fi
    echo "brew install failed; trying manual binary…"
  fi

  echo "=== Installing mkcert via standalone binary ==="
  VER="v1.4.4"
  ARCH="$(uname -m)"
  case "$ARCH" in
    aarch64|arm64)  PKG="mkcert-${VER}-linux-arm64" ;;
    x86_64|amd64)   PKG="mkcert-${VER}-linux-amd64" ;;
    *) echo "Unsupported arch: $ARCH"; return 1 ;;
  esac

  curl -L -o mkcert "https://github.com/FiloSottile/mkcert/releases/download/${VER}/${PKG}" || return 1
  chmod +x mkcert
  sudo mv mkcert /usr/local/bin/ || return 1
  mkcert -install
}

ensure_mkcert || { echo "mkcert installation failed"; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
# SSL (mkcert) — certs live in repo root next to vite.config.ts (FOR UI_IP)
# ──────────────────────────────────────────────────────────────────────────────
mkcert -install || true

KEY_FILE="./${UI_IP}-key.pem"
CRT_FILE="./${UI_IP}.pem"
[[ -f "${KEY_FILE}" && -f "${CRT_FILE}" ]] || mkcert "${UI_IP}"

# ──────────────────────────────────────────────────────────────────────────────
# Generate vite.config.ts that supports split-hosts via env
# ──────────────────────────────────────────────────────────────────────────────
VITE_CFG="${REPO_DIR}/vite.config.ts"
cat > "${VITE_CFG}" <<'EOF'
/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // UI host IP used for mkcert files (e.g., 172.27.126.244)
  const UI_IP = env.VITE_UI_IP || "127.0.0.1";
  // AIM / Node Manager host (can be same or different from UI)
  const AIM_HOST = env.VITE_AIM_HOST || UI_IP;

  // Resolve mkcert filenames like: <UI_IP>.pem and <UI_IP>-key.pem
  const keyPath = `./${UI_IP}-key.pem`;
  const crtPath = `./${UI_IP}.pem`;

  return {
    plugins: [react(), tailwindcss()],
    test: { environment: "jsdom", globals: true },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    base: env.VITE_BASE_ROUTE || "/",
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT || env.VITE_PORT || 8880),
      https:
        fs.existsSync(keyPath) && fs.existsSync(crtPath)
          ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(crtPath) }
          : undefined,
      proxy: {
        // Node Manager / AIM control-plane (port 8000)
        "/balance":    { target: `http://${AIM_HOST}:8000`, changeOrigin: true },
        "/info":       { target: `http://${AIM_HOST}:8000`, changeOrigin: true },
        "/health":     { target: `http://${AIM_HOST}:8000`, changeOrigin: true },
        "/nonce":      { target: `http://${AIM_HOST}:8000`, changeOrigin: true },
        "/auth":       { target: `http://${AIM_HOST}:8000`, changeOrigin: true },
        "/auth/nonce": { target: `http://${AIM_HOST}:8000`, changeOrigin: true },

        // AIM invoke via Node Manager (port 8006 → /api/aim)
        "/aim": {
          target: `http://${AIM_HOST}:8006`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/aim/, "/api/aim"),
        },

        // Stream server (port 4001) — support BOTH styles without breaking /stream
        // 1) direct /chat
        "/chat": { target: `http://${AIM_HOST}:4001`, changeOrigin: true },

        // 2) legacy /stream/chat -> /chat
        "/stream/chat": {
          target: `http://${AIM_HOST}:4001`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/stream\/chat/, "/chat"),
        },

        // 3) /stream passthrough (NO rewrite) — needed when server advertises /stream
        "/stream": {
          target: `http://${AIM_HOST}:4001`,
          changeOrigin: true,
        },
      },
    },
  };
});
EOF

# ──────────────────────────────────────────────────────────────────────────────
# .env.local (drives both vite.config.ts and frontend)
# ──────────────────────────────────────────────────────────────────────────────
ENV_FILE="${REPO_DIR}/.env.local"
cat > "${ENV_FILE}" <<EOF
# UI server public URL (served by Vite on the UI host)
VITE_NODE_URL=https://${UI_IP}:${DEV_PORT}

# Stream server URL as seen by the browser (still the UI/Vite endpoint)
VITE_STREAM_HOST=https://${UI_IP}:${DEV_PORT}

# AIM slot index
VITE_AIM_SLOT=${AIM_SLOT}

# AIM action used to request generation or token
VITE_AIM_URI=/request

# Router base
VITE_BASE_ROUTE=/

# Split-host variables read by vite.config.ts
VITE_UI_IP=${UI_IP}
VITE_AIM_HOST=${AIM_HOST}

# (optional) bind port override for vite (mirrors DEV_PORT)
VITE_PORT=${DEV_PORT}
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
echo "UI:    https://${UI_IP}:${DEV_PORT}/"
echo
echo "🧭 tmux controls:"
echo "  • Attach:   tmux attach -t ${SESSION_NAME}"
echo "  • Detach:   Ctrl+b, then d"
echo "  • Restart:  bash $(basename "$0") restart"
echo "  • Stop:     bash $(basename "$0") stop"
echo "  • Start:    bash $(basename "$0") start"
