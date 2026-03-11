#!/usr/bin/env bash
# =============================================================================
# SecBridge — Deploy Sangfor Parser as Systemd Service  v1.1
# =============================================================================
# NOTE: This script is superseded by deploy-cisco-xdr.sh which deploys
# both the parser AND the XDR shipper together.
# Run this only if you want the parser standalone (SentinelOne only).
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

DEPLOY_LOG="/var/log/secbridge-deploy.log"

init_logfile() {
  mkdir -p "$(dirname "$DEPLOY_LOG")" 2>/dev/null || true
  touch "$DEPLOY_LOG" 2>/dev/null || DEPLOY_LOG="/dev/null"
}

log()   { echo -e "${GREEN}[OK]${NC}  $1" | tee -a "$DEPLOY_LOG"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$DEPLOY_LOG"; }
error() { echo -e "${RED}[ERR]${NC} $1" | tee -a "$DEPLOY_LOG"; exit 1; }
info()  { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOY_LOG"; }

init_logfile

[[ "$EUID" -ne 0 ]] && error "Run as root: sudo bash deploy-parser.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/secbridge"
SERVICE_FILE="/etc/systemd/system/secbridge-parser.service"

# Detect python3 path reliably
PYTHON_BIN=$(command -v python3 || command -v python3.11 || command -v python3.9 || echo "")
[[ -z "$PYTHON_BIN" ]] && error "python3 not found. Install it first."
info "Using Python: $PYTHON_BIN ($($PYTHON_BIN --version))"

# Create install dir
mkdir -p "$INSTALL_DIR/config"
log "Install dir ready: $INSTALL_DIR"

# Copy parser
cp "$SCRIPT_DIR/sangfor_parser.py" "$INSTALL_DIR/sangfor_parser.py"
chmod +x "$INSTALL_DIR/sangfor_parser.py"
log "sangfor_parser.py installed"

# Copy sources.json
cp "$SCRIPT_DIR/sources.json" "$INSTALL_DIR/config/sources.json"
log "sources.json installed"

# Ensure log files exist
mkdir -p /var/log/scalyr-agent-2
touch /var/log/scalyr-agent-2/sangfor-ngaf.log
touch /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log

# Write service file with correct python path
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=SecBridge — SangforNGAF Parser
Documentation=https://github.com/Teraz1/secbridge
After=network.target scalyr-agent-2.service
Wants=scalyr-agent-2.service

[Service]
Type=simple
User=root
ExecStart=$PYTHON_BIN $INSTALL_DIR/sangfor_parser.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=secbridge-parser
MemoryMax=128M
CPUQuota=10%

[Install]
WantedBy=multi-user.target
EOF

log "Systemd service written: $SERVICE_FILE"

systemctl daemon-reload
systemctl enable secbridge-parser
systemctl restart secbridge-parser
sleep 3

if systemctl is-active --quiet secbridge-parser; then
    log "secbridge-parser service is running."
else
    error "Parser failed to start. Check: journalctl -u secbridge-parser -n 30"
fi

# Self-test
info "Running parser self-test..."
if $PYTHON_BIN "$INSTALL_DIR/sangfor_parser.py" --test > /dev/null 2>&1; then
    log "Parser self-test passed."
else
    warn "Parser self-test had issues. Check: $PYTHON_BIN $INSTALL_DIR/sangfor_parser.py --test"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  PARSER DEPLOYED${NC}"
echo "============================================================"
echo ""
echo "  Self-test:   $PYTHON_BIN $INSTALL_DIR/sangfor_parser.py --test"
echo "  Live raw:    tail -f /var/log/scalyr-agent-2/sangfor-ngaf.log"
echo "  Live parsed: tail -f /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log"
echo "  Logs:        journalctl -u secbridge-parser -f"
echo ""
