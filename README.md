# ⬡ SecBridge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Version](https://img.shields.io/badge/version-3.2-blue.svg)](#)

> **Bridge the gap between your security devices and your SIEM — no paid middleware, no consultants.**

SecBridge is an open-source syslog collection and routing platform. It receives logs from any security device (firewalls, IDS, VPN), parses them into structured JSON, and ships them to your SIEM or XDR platform — all from a single Linux VM.

---

## What SecBridge Does

```
Sangfor NGAF  ──── UDP:514  ──┐
Fortinet FGT  ──── UDP:5140 ──┤
Cisco ASA     ──── TCP:5141 ──┤──► SecBridge VM ──► SentinelOne SDL
Palo Alto     ──── UDP:5142 ──┤                └──► Cisco XDR
[Any device]  ──── UDP:xxxx ──┘
```

Each device sends syslog to SecBridge on its own dedicated port. SecBridge parses the raw syslog into structured JSON fields and ships to your chosen destination(s).

---

## Supported Destinations

| Destination | Status | Notes |
|---|---|---|
| SentinelOne SDL | ✅ Stable | Via scalyr-agent-2 |
| Cisco XDR | ✅ Stable | Via CTIM Findings API |
| Both simultaneously | ✅ Supported | Run both shippers together |

---

## Repository Structure

```
secbridge/
│
├── web/                        ← Web UI (React + FastAPI)
│   ├── App.jsx                 ← Full React frontend
│   ├── backend.py              ← FastAPI REST API
│   ├── install.sh              ← Web UI installer
│   ├── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── requirements.txt
│
├── cisco_xdr_shipper.py        ← Cisco XDR shipping agent
├── cisco_xdr.json              ← Cisco XDR credentials config
├── deploy-cisco-xdr.sh         ← Cisco XDR deploy script
├── secbridge-cisco-xdr.service ← Cisco XDR systemd service
│
├── sangfor_parser.py           ← Sangfor NGAF log parser
├── sangfor-ngaf-parser.json    ← Sangfor parser field config
├── sources.json                ← All sources configuration
│
├── install.sh                  ← Main installer
├── manage-sources.sh           ← CLI source management
├── deploy-parser.sh            ← Parser service deployer
├── test-syslog.sh              ← Send test logs
│
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Teraz1/secbridge.git
cd secbridge
```

### 2. Install the Web UI

```bash
cd web
sudo bash install.sh
```

Opens at `http://YOUR_VM_IP:3000` — Default login: **admin / admin**

### 3. Run the Setup Wizard

Open the web UI → click **Setup Wizard** → follow the 4 steps:
1. Enter your SentinelOne SDL API key and ingest URL
2. Add your first source (name, port, protocol)
3. Verify connection
4. Done

### 4. Point your device at SecBridge

Configure your firewall/device to send syslog to:
- **IP:** Your SecBridge VM IP
- **Port:** The port you configured (default 514)
- **Protocol:** UDP or TCP

---

## Web UI

The web dashboard manages everything without touching the terminal.

### Pages

| Page | What it does |
|---|---|
| **Dashboard** | Live log throughput, agent status, recent events |
| **Sources** | Add / remove / toggle syslog sources. Apply config to activate ports |
| **Live Logs** | Real-time syslog stream per source |
| **Health Check** | Service status, port checks, SDL reachability |
| **Pipeline Map** | Visual end-to-end flow from device to SIEM |
| **Parsers** | Upload and manage vendor parser files |
| **Destination** | Configure SentinelOne SDL API key and ingest URL |
| **Users** | Role-based access (admin / analyst / viewer) |
| **Backup** | Download and restore full configuration |
| **Setup Wizard** | First-time guided setup |

### Important — Apply Config

After adding or removing a source in the UI, you **must click Apply Config**. This runs `manage-sources.sh apply` which:
- Rewrites `/etc/scalyr-agent-2/agent.json` with all active sources
- Opens the required syslog ports
- Restarts scalyr-agent-2

Without clicking Apply, new sources are saved to `sources.json` but the agent does not start listening.

### Service

The web UI runs as a single systemd service — backend (FastAPI) and frontend (React) are served together on port 3000:

```bash
systemctl status secbridge
journalctl -u secbridge -f
```

---

## Managing Sources (CLI)

Sources are also manageable from the terminal via `manage-sources.sh`.

```bash
# Add a source interactively
sudo bash manage-sources.sh add

# List all configured sources
bash manage-sources.sh list

# Apply changes — regenerates agent.json and opens ports
sudo bash manage-sources.sh apply

# Check status — port listening + recent logs
bash manage-sources.sh status

# Remove a source by ID
sudo bash manage-sources.sh remove 002
```

### sources.json

All sources are defined in `sources.json`. Example:

```json
{
  "secbridge": {
    "destination": {
      "type": "sentinelone_sdl",
      "ingest_url": "https://xdr.us1.sentinelone.net",
      "api_key": "YOUR_API_KEY"
    },
    "sources": [
      {
        "id": "001",
        "enabled": true,
        "name": "Sangfor NGAF",
        "product": "sangfor-ngaf",
        "syslog_port": 514,
        "protocol": "udp",
        "allowed_ips": [],
        "log_file": "sangfor-ngaf.log",
        "parsed_log_file": "sangfor-ngaf-parsed.log",
        "parser_script": "/opt/secbridge/sangfor_parser.py",
        "parser_name": "sangfor-ngaf"
      }
    ]
  }
}
```

**Key fields:**

| Field | Description |
|---|---|
| `syslog_port` | Must be unique per source |
| `allowed_ips` | Restrict syslog to specific device IPs (empty = allow all) |
| `parsed_log_file` | If set, parser outputs structured JSON here |
| `parser_script` | Path to the Python parser for this source |

---

## Log Parsing

### How it works

```
Device syslog ──► sangfor-ngaf.log (raw)
                        │
                sangfor_parser.py (systemd service)
                        │
                sangfor-ngaf-parsed.log (structured JSON)
                        │
                scalyr-agent-2 ships both files to SDL
```

### Deploy the Sangfor parser

```bash
sudo bash deploy-parser.sh
```

### Test the parser

```bash
python3 sangfor_parser.py --test
```

### Parser output example

```json
{
  "timestamp": "2026-03-09T09:00:00Z",
  "source": "sangfor_ngaf",
  "log_type": "APT detection",
  "src_ip": "10.8.2.201",
  "dst_ip": "8.8.8.8",
  "attack_type": "Botnet",
  "threat_level": "Critical",
  "severity": "Critical",
  "action": "Denied",
  "action_normalised": "BLOCK",
  "event_category": "threat",
  "url": "pool.hashvault.pro"
}
```

---

## Cisco XDR Integration

SecBridge can ship parsed events to Cisco XDR simultaneously alongside SentinelOne SDL.

### How it works

`cisco_xdr_shipper.py` runs as a separate systemd service. It tails the same parsed log files that scalyr-agent ships to SDL, maps them to CTIM Sighting objects, and POSTs them to the Cisco XDR Findings Intake API. Authentication uses OAuth2 — Client ID and Secret are exchanged for a Bearer token that auto-refreshes every hour.

### Deploy

```bash
sudo bash deploy-cisco-xdr.sh
```

### Configure

Edit `/opt/secbridge/config/cisco_xdr.json`:

```json
{
  "client_id":     "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "region":        "us"
}
```

Get credentials from: **XDR Console → Administration → API Clients → Add API Client**

Required scope: `private-intel:sighting:write`

Region options: `us` `eu` `apjc`

### Start

```bash
sudo systemctl start secbridge-cisco-xdr
journalctl -u secbridge-cisco-xdr -f
```

### Test

```bash
# Test CTIM mapping without hitting real API
python3 /opt/secbridge/cisco_xdr_shipper.py --test

# Test real authentication only
python3 /opt/secbridge/cisco_xdr_shipper.py --test-auth
```

---

## All Services at a Glance

| Service | Purpose | Command |
|---|---|---|
| `secbridge` | Web UI + API on port 3000 | `systemctl status secbridge` |
| `scalyr-agent-2` | Ships logs to SentinelOne SDL | `systemctl status scalyr-agent-2` |
| `sangfor-parser` | Parses Sangfor raw logs to JSON | `systemctl status sangfor-parser` |
| `secbridge-cisco-xdr` | Ships logs to Cisco XDR | `systemctl status secbridge-cisco-xdr` |

---

## File Paths on the VM

| Path | What it is |
|---|---|
| `/opt/secbridge/` | SecBridge install root |
| `/opt/secbridge/web/` | Web UI backend |
| `/opt/secbridge/config/sources.json` | All sources config |
| `/opt/secbridge/config/cisco_xdr.json` | Cisco XDR credentials |
| `/etc/scalyr-agent-2/agent.json` | Scalyr agent config (auto-generated) |
| `/var/log/scalyr-agent-2/` | All log files (raw + parsed) |
| `/var/log/secbridge/` | SecBridge service logs |

---

## Troubleshooting

### Logs not appearing in SDL

```bash
# Check agent is running
systemctl status scalyr-agent-2

# Check agent.json has your source
cat /etc/scalyr-agent-2/agent.json

# Check log file is being written
tail -f /var/log/scalyr-agent-2/sangfor-ngaf.log

# Re-apply config
sudo bash manage-sources.sh apply
```

### Port not listening

```bash
# Check which ports are open
ss -ulnp | grep -E '514|5140|5141'

# Re-apply to open ports
sudo bash manage-sources.sh apply
```

### Cisco XDR not receiving events

```bash
# Check shipper logs
journalctl -u secbridge-cisco-xdr -f

# Verify credentials work
python3 /opt/secbridge/cisco_xdr_shipper.py --test-auth

# Check parsed log has data
tail -f /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log
```

### Web UI login not working

```bash
# Check service is running
systemctl status secbridge

# Check logs
journalctl -u secbridge -n 30
```

---

## Roadmap

### Coming Soon
- [ ] Per-source destination routing (FW1 → SDL only, FW2 → XDR only, FW3 → both)
- [ ] Fortinet FortiGate parser
- [ ] Palo Alto PAN-OS parser
- [ ] Cisco ASA parser

### Future Destinations
- [ ] Microsoft Sentinel
- [ ] Elastic SIEM
- [ ] Splunk
- [ ] Wazuh

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Quick checklist before a PR:
- [ ] `bash -n install.sh` passes (no syntax errors)
- [ ] `python3 -m py_compile parser.py` passes
- [ ] `python3 parser.py --test` passes with real log samples
- [ ] Tested on Ubuntu 22.04/24.04 or Rocky Linux 9
- [ ] No hardcoded IPs or credentials

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE).

---

*Built by the community. Vendors don't have to be gatekeepers.*
