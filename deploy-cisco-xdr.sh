#!/usr/bin/env bash
# =============================================================================
# SecBridge — Cisco XDR Shipper Deploy Script  v1.1
# =============================================================================
# Usage: sudo bash deploy-cisco-xdr.sh
# Run from the secbridge directory.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BLUE='\033[0;34m'; NC='\033[0m'
log()   { echo -e "${GREEN}[OK]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }

[[ "$EUID" -ne 0 ]] && error "Run as root: sudo bash deploy-cisco-xdr.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/secbridge"
CONFIG_DIR="$INSTALL_DIR/config"

echo ""
echo "============================================================"
echo "  SecBridge — Cisco XDR Shipper Installer  v1.1"
echo "============================================================"
echo ""

# ── Create install dirs ───────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR"
log "Install directories ready: $INSTALL_DIR"

# ── Install Python requests if missing ───────────────────────────────────
if ! python3 -c "import requests" 2>/dev/null; then
    info "Installing python3-requests..."
    pip3 install requests --break-system-packages 2>/dev/null || \
    pip3 install requests 2>/dev/null || \
    apt-get install -y python3-requests 2>/dev/null || \
    dnf install -y python3-requests 2>/dev/null || \
    error "Could not install python3-requests. Install manually: pip3 install requests"
    log "python3-requests installed"
else
    log "python3-requests already available"
fi

# ── Copy shipper and parser scripts ──────────────────────────────────────
cp "$SCRIPT_DIR/cisco_xdr_shipper.py" "$INSTALL_DIR/cisco_xdr_shipper.py"
chmod +x "$INSTALL_DIR/cisco_xdr_shipper.py"
log "cisco_xdr_shipper.py installed to $INSTALL_DIR/"

cp "$SCRIPT_DIR/sangfor_parser.py" "$INSTALL_DIR/sangfor_parser.py"
chmod +x "$INSTALL_DIR/sangfor_parser.py"
log "sangfor_parser.py installed to $INSTALL_DIR/"

# ── Copy sources.json ─────────────────────────────────────────────────────
cp "$SCRIPT_DIR/sources.json" "$CONFIG_DIR/sources.json"
log "sources.json installed to $CONFIG_DIR/"

# ── Copy config template (don't overwrite if exists) ─────────────────────
XDR_CONFIG="$CONFIG_DIR/cisco_xdr.json"
if [[ ! -f "$XDR_CONFIG" ]]; then
    cp "$SCRIPT_DIR/cisco_xdr.json" "$XDR_CONFIG"
    log "Config template created: $XDR_CONFIG"
    warn "Edit $XDR_CONFIG with your Cisco XDR client_id and client_secret"
else
    log "Config already exists — not overwriting: $XDR_CONFIG"
fi

# ── Ensure log files exist ────────────────────────────────────────────────
mkdir -p /var/log/scalyr-agent-2 /var/log/secbridge
touch /var/log/scalyr-agent-2/sangfor-ngaf.log
touch /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log
log "Log files ready"

# ── Install parser systemd service ───────────────────────────────────────
cp "$SCRIPT_DIR/secbridge-parser.service" /etc/systemd/system/secbridge-parser.service
log "secbridge-parser.service installed"

# ── Install XDR shipper systemd service ──────────────────────────────────
cp "$SCRIPT_DIR/secbridge-cisco-xdr.service" /etc/systemd/system/secbridge-cisco-xdr.service
log "secbridge-cisco-xdr.service installed"

systemctl daemon-reload
systemctl enable secbridge-parser secbridge-cisco-xdr
log "Services enabled"

# ── Start parser service ──────────────────────────────────────────────────
systemctl restart secbridge-parser
sleep 2
if systemctl is-active --quiet secbridge-parser; then
    log "secbridge-parser service started"
else
    error "Parser failed to start. Check: journalctl -u secbridge-parser -n 30"
fi

# ── Check if XDR config is filled in ─────────────────────────────────────
if grep -q "YOUR_CLIENT_ID" "$XDR_CONFIG"; then
    echo ""
    echo "============================================================"
    echo -e "${YELLOW}  ACTION REQUIRED${NC}"
    echo "============================================================"
    echo ""
    echo "  Edit your Cisco XDR credentials:"
    echo -e "  ${CYAN}nano $XDR_CONFIG${NC}"
    echo ""
    echo "  Get credentials from:"
    echo "  XDR Console → Administration → API Clients → Add API Client"
    echo "  Scopes needed: Private Intel, Security Events, Inspect:Read"
    echo "  Region: apjc (for Asia Pacific)"
    echo ""
    echo "  After editing, start the XDR shipper:"
    echo -e "  ${CYAN}sudo systemctl start secbridge-cisco-xdr${NC}"
    echo ""
else
    # Config filled — start XDR shipper
    systemctl restart secbridge-cisco-xdr
    sleep 2
    if systemctl is-active --quiet secbridge-cisco-xdr; then
        log "secbridge-cisco-xdr service started"
    else
        error "XDR shipper failed to start. Check: journalctl -u secbridge-cisco-xdr -n 30"
    fi
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  DEPLOY COMPLETE${NC}"
echo "============================================================"
echo ""
echo "  Useful commands:"
echo "    systemctl status secbridge-parser"
echo "    systemctl status secbridge-cisco-xdr"
echo "    journalctl -u secbridge-cisco-xdr -f"
echo "    journalctl -u secbridge-parser -f"
echo "    tail -f /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log"
echo "    python3 $INSTALL_DIR/cisco_xdr_shipper.py --test-auth"
echo ""
