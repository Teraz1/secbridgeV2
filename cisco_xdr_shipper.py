#!/usr/bin/env python3
"""
=============================================================================
SecBridge — Cisco XDR Shipper  v1.1
=============================================================================
Tails SecBridge parsed log files and ships events to Cisco XDR via the
CTIM Sightings API.

Flow:
  sangfor-ngaf-parsed.log  ──► cisco_xdr_shipper.py ──► Cisco XDR API

Config:  /opt/secbridge/config/cisco_xdr.json
State:   /opt/secbridge/config/cisco_xdr_state.json

Run as service:
  sudo systemctl start secbridge-cisco-xdr

Test mode:
  python3 cisco_xdr_shipper.py --test
  python3 cisco_xdr_shipper.py --test-auth
=============================================================================
"""

import json
import os
import sys
import time
import logging
import requests
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Config paths ────────────────────────────────────────────────────────────
BASE_DIR      = "/opt/secbridge"
SOURCES_JSON  = f"{BASE_DIR}/config/sources.json"
XDR_CONFIG    = f"{BASE_DIR}/config/cisco_xdr.json"
STATE_FILE    = f"{BASE_DIR}/config/cisco_xdr_state.json"
LOG_DIR_AGENT = "/var/log/scalyr-agent-2"
LOG_DIR_SVC   = "/var/log/secbridge"

# Local timezone (Asia/Kuala_Lumpur = UTC+8)
TZ_LOCAL = timezone(timedelta(hours=8))

# ── Logging ──────────────────────────────────────────────────────────────────
os.makedirs(LOG_DIR_SVC, exist_ok=True)
handlers = [logging.StreamHandler(sys.stdout)]
svc_log = f"{LOG_DIR_SVC}/cisco-xdr-shipper.log"
try:
    handlers.append(logging.FileHandler(svc_log))
except Exception:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
)
logger = logging.getLogger("cisco-xdr-shipper")

# ── Cisco XDR region endpoints ───────────────────────────────────────────────
REGIONS = {
    "us": {
        "token_url":    "https://visibility.amp.cisco.com/iroh/oauth2/token",
        "sighting_url": "https://private.intel.amp.cisco.com/ctia/sighting",
    },
    "eu": {
        "token_url":    "https://visibility.eu.amp.cisco.com/iroh/oauth2/token",
        "sighting_url": "https://private.intel.eu.amp.cisco.com/ctia/sighting",
    },
    "apjc": {
        "token_url":    "https://visibility.apjc.amp.cisco.com/iroh/oauth2/token",
        "sighting_url": "https://private.intel.apjc.amp.cisco.com/ctia/sighting",
    },
}

# ── CTIM severity mapping ─────────────────────────────────────────────────────
SEVERITY_MAP = {
    "critical":      "Critical",
    "high":          "High",
    "medium":        "Medium",
    "low":           "Low",
    "info":          "Info",
    "information":   "Info",
    "informational": "Info",
    "warning":       "Medium",
    "unknown":       "Unknown",
}

# ── CTIM confidence mapping ───────────────────────────────────────────────────
CONFIDENCE_MAP = {
    "threat":         "High",
    "intrusion":      "High",
    "malware":        "High",
    "dos_attack":     "High",
    "web_filter":     "Medium",
    "app_control":    "Medium",
    "authentication": "Medium",
    "traffic":        "Low",
    "vpn":            "Low",
    "nat":            "Low",
    "system":         "Low",
    "firewall":       "Low",
}


# ══════════════════════════════════════════════════════════════════════════════
# TIMESTAMP HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def normalise_timestamp(ts: str) -> str:
    """
    Convert any ISO timestamp to UTC Z format for CTIM.
    Handles: +08:00, +00:00, Z, or naive (assumed UTC).
    """
    if not ts:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    try:
        # Already has timezone info
        if ts.endswith("Z"):
            return ts if "." in ts else ts[:-1] + ".000Z"

        if "+" in ts[10:]:  # Has offset like +08:00
            # Parse the offset
            offset_idx = ts.index("+", 10)
            dt_str = ts[:offset_idx]
            offset_str = ts[offset_idx+1:]
            h, m = map(int, offset_str.split(":"))
            offset = timedelta(hours=h, minutes=m)
            # Parse datetime
            fmt = "%Y-%m-%dT%H:%M:%S.%f" if "." in dt_str else "%Y-%m-%dT%H:%M:%S"
            dt_local = datetime.strptime(dt_str, fmt)
            # Convert to UTC
            dt_utc = dt_local - offset
            return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        # No timezone - assume UTC
        fmt = "%Y-%m-%dT%H:%M:%S.%f" if "." in ts else "%Y-%m-%dT%H:%M:%S"
        dt = datetime.strptime(ts, fmt)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


# ══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════════════

def load_xdr_config() -> dict:
    """Load Cisco XDR credentials from cisco_xdr.json."""
    if not os.path.exists(XDR_CONFIG):
        logger.error(f"XDR config not found: {XDR_CONFIG}")
        logger.error("Create it with: client_id, client_secret, region")
        sys.exit(1)
    with open(XDR_CONFIG) as f:
        cfg = json.load(f)
    required = ["client_id", "client_secret", "region"]
    for k in required:
        if not cfg.get(k):
            logger.error(f"Missing required field in cisco_xdr.json: {k}")
            sys.exit(1)
    if cfg["region"] not in REGIONS:
        logger.error(f"Invalid region '{cfg['region']}'. Must be: us, eu, apjc")
        sys.exit(1)
    return cfg


def load_sources() -> list:
    """Load sources from sources.json, return only those with parsed_log_file."""
    if not os.path.exists(SOURCES_JSON):
        logger.warning(f"sources.json not found: {SOURCES_JSON}")
        return []
    with open(SOURCES_JSON) as f:
        data = json.load(f)
    sources = data.get("secbridge", {}).get("sources", [])
    active = [
        s for s in sources
        if s.get("enabled", True) and s.get("parsed_log_file")
    ]
    logger.info(f"Loaded {len(active)} sources with parsed logs from sources.json")
    return active


# ══════════════════════════════════════════════════════════════════════════════
# AUTH — OAuth2 token management
# ══════════════════════════════════════════════════════════════════════════════

class XDRAuth:
    """
    Manages Cisco XDR OAuth2 Bearer token.
    Automatically refreshes before expiry.
    Thread-safe.
    """

    def __init__(self, client_id: str, client_secret: str, region: str):
        self.client_id     = client_id
        self.client_secret = client_secret
        self.token_url     = REGIONS[region]["token_url"]
        self._token        = None
        self._expires_at   = 0
        self._lock         = threading.Lock()

    def get_token(self) -> str:
        """Return a valid Bearer token, refreshing if needed."""
        with self._lock:
            if time.time() >= self._expires_at - 60:
                self._refresh()
            return self._token

    def _refresh(self):
        """Fetch a new token from Cisco XDR OAuth2 endpoint."""
        logger.info("Fetching new Cisco XDR OAuth2 token...")
        try:
            resp = requests.post(
                self.token_url,
                data={
                    "grant_type":    "client_credentials",
                    "client_id":     self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            self._token      = data["access_token"]
            expires_in       = data.get("expires_in", 3600)
            self._expires_at = time.time() + expires_in
            logger.info(f"Token obtained. Expires in {expires_in}s.")
        except requests.RequestException as e:
            logger.error(f"Failed to get XDR token: {e}")
            raise


# ══════════════════════════════════════════════════════════════════════════════
# CTIM MAPPING — parsed JSON → Cisco XDR Sighting
# ══════════════════════════════════════════════════════════════════════════════

def map_to_sighting(event: dict, source_name: str) -> dict:
    """
    Map a SecBridge parsed log event to a Cisco XDR CTIM Sighting object.
    """

    # ── Timestamp ──────────────────────────────────────────────────────────
    raw_ts = event.get("timestamp", "")
    ts = normalise_timestamp(raw_ts)

    # ── Severity ───────────────────────────────────────────────────────────
    raw_sev = event.get("severity", event.get("threat_level", "unknown")).lower()
    ctim_severity = SEVERITY_MAP.get(raw_sev, "Unknown")

    # ── Confidence from event category ─────────────────────────────────────
    category   = event.get("event_category", "firewall")
    confidence = CONFIDENCE_MAP.get(category, "Low")

    # ── Observables (IPs, URLs, usernames) ─────────────────────────────────
    observables = []
    for field in ["src_ip", "dst_ip", "nat_src_ip", "nat_dst_ip"]:
        val = event.get(field)
        if val and val not in ("0.0.0.0", "255.255.255.255"):
            observables.append({"type": "ip", "value": val})

    url = event.get("url")
    if url:
        observables.append({"type": "url", "value": url})

    username = event.get("username") or event.get("vpn_user")
    if username:
        observables.append({"type": "user", "value": username})

    # Deduplicate
    seen = set()
    unique_obs = []
    for o in observables:
        key = f"{o['type']}:{o['value']}"
        if key not in seen:
            seen.add(key)
            unique_obs.append(o)

    # ── Description ────────────────────────────────────────────────────────
    parts = []
    if event.get("log_type"):
        parts.append(event["log_type"])
    if event.get("attack_type"):
        parts.append(f"Attack: {event['attack_type']}")
    if event.get("src_ip") and event.get("dst_ip"):
        parts.append(f"src {event['src_ip']} → dst {event['dst_ip']}")
    if event.get("action_normalised"):
        parts.append(f"Action: {event['action_normalised']}")
    description = " | ".join(parts) if parts else event.get("raw", "SecBridge event")[:200]

    # ── Relations (src→dst connection) ─────────────────────────────────────
    relations = []
    if event.get("src_ip") and event.get("dst_ip"):
        relations.append({
            "origin":   f"SecBridge - {source_name}",
            "relation": "Connected_To",
            "source":   {"type": "ip", "value": event["src_ip"]},
            "related":  {"type": "ip", "value": event["dst_ip"]},
        })

    # ── Build CTIM Sighting ─────────────────────────────────────────────────
    sighting = {
        "type":           "sighting",
        "schema_version": "1.0.22",
        "source":         f"SecBridge - {source_name}",
        "source_uri":     "https://github.com/Teraz1/secbridge",
        "title":          f"{event.get('log_type', 'Firewall Event')} — {source_name}",
        "description":    description,
        "observed_time":  {"start_time": ts, "end_time": ts},
        "confidence":     confidence,
        "severity":       ctim_severity,
        "count":          1,
        "tlp":            "green",
        "sensor":         "network.firewall",
    }

    if unique_obs:
        sighting["observables"] = unique_obs

    if relations:
        sighting["relations"] = relations

    if event.get("action_normalised"):
        sighting["resolution"] = "detected" if event["action_normalised"] == "ALLOW" else "blocked"

    return sighting


# ══════════════════════════════════════════════════════════════════════════════
# SHIPPER — POST sightings to XDR one at a time
# ══════════════════════════════════════════════════════════════════════════════

class XDRShipper:
    """
    Handles batching and shipping Sightings to Cisco XDR.
    Ships each sighting individually (not bulk) for reliability.
    """

    BATCH_SIZE    = 100
    RETRY_LIMIT   = 3
    RETRY_BACKOFF = [5, 15, 60]

    def __init__(self, auth: XDRAuth, region: str):
        self.auth         = auth
        self.sighting_url = REGIONS[region]["sighting_url"]
        self._buffer      = []
        self._shipped     = 0
        self._failed      = 0

    def add(self, sighting: dict):
        """Buffer a sighting. Auto-flushes when batch is full."""
        self._buffer.append(sighting)
        if len(self._buffer) >= self.BATCH_SIZE:
            self.flush()

    def flush(self):
        """Ship all buffered sightings to XDR."""
        if not self._buffer:
            return
        batch = self._buffer[:]
        self._buffer = []
        self._ship_batch(batch)

    def _ship_batch(self, batch: list):
        """POST each sighting individually with retry logic."""
        for sighting in batch:
            self._ship_one(sighting)

    def _ship_one(self, sighting: dict):
        """POST a single sighting with retry logic."""
        for attempt in range(self.RETRY_LIMIT):
            try:
                token = self.auth.get_token()
                resp  = requests.post(
                    self.sighting_url,
                    json=sighting,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type":  "application/json",
                    },
                    timeout=30,
                )

                if resp.status_code in (200, 201):
                    self._shipped += 1
                    if self._shipped % 100 == 0:
                        logger.info(f"Shipped 100 sightings to XDR. Total: {self._shipped}")
                    return

                elif resp.status_code == 401:
                    logger.warning("XDR returned 401 — refreshing token and retrying")
                    self.auth._refresh()

                elif resp.status_code == 429:
                    wait = int(resp.headers.get("Retry-After", self.RETRY_BACKOFF[attempt]))
                    logger.warning(f"XDR rate limited. Waiting {wait}s...")
                    time.sleep(wait)

                else:
                    logger.error(f"XDR API error {resp.status_code}: {resp.text[:200]}")

            except requests.Timeout:
                logger.warning(f"XDR request timed out (attempt {attempt+1})")
            except requests.ConnectionError as e:
                logger.warning(f"XDR connection error (attempt {attempt+1}): {e}")
            except Exception as e:
                logger.error(f"Unexpected error shipping to XDR: {e}")

            if attempt < self.RETRY_LIMIT - 1:
                wait = self.RETRY_BACKOFF[attempt]
                time.sleep(wait)

        self._failed += 1
        logger.error(f"Failed to ship sighting after {self.RETRY_LIMIT} attempts. Total failed: {self._failed}")


# ══════════════════════════════════════════════════════════════════════════════
# STATE — track file positions
# ══════════════════════════════════════════════════════════════════════════════

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# ══════════════════════════════════════════════════════════════════════════════
# TAIL WORKER — one thread per parsed log file
# ══════════════════════════════════════════════════════════════════════════════

class LogTailer(threading.Thread):
    """
    Tails a single parsed log file and feeds events to the XDR shipper.
    One instance per source. Runs in its own thread.
    """

    POLL_INTERVAL = 2

    def __init__(self, source: dict, shipper: XDRShipper, state: dict):
        super().__init__(daemon=True)
        self.source      = source
        self.shipper     = shipper
        self.state       = state
        self.product     = source["product"]
        self.source_name = source["name"]
        self.log_file    = os.path.join(LOG_DIR_AGENT, source["parsed_log_file"])
        self.state_key   = f"pos_{self.product}"

    def run(self):
        logger.info(f"[{self.product}] Tailing: {self.log_file}")
        last_pos   = self.state.get(self.state_key, 0)
        last_inode = None
        processed  = 0

        while True:
            try:
                if not os.path.exists(self.log_file):
                    time.sleep(5)
                    continue

                current_inode = os.stat(self.log_file).st_ino

                if last_inode is not None and current_inode != last_inode:
                    logger.info(f"[{self.product}] Log rotation detected — resetting offset")
                    last_pos = 0

                last_inode = current_inode

                with open(self.log_file, "r", errors="replace") as f:
                    f.seek(0, 2)
                    size = f.tell()
                    if last_pos > size:
                        last_pos = 0

                    f.seek(last_pos)

                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            event    = json.loads(line)
                            sighting = map_to_sighting(event, self.source_name)
                            self.shipper.add(sighting)
                            processed += 1
                        except json.JSONDecodeError:
                            pass
                        except Exception as e:
                            logger.warning(f"[{self.product}] Mapping error: {e}")

                    last_pos = f.tell()

                self.state[self.state_key] = last_pos
                save_state(self.state)
                self.shipper.flush()

            except Exception as e:
                logger.error(f"[{self.product}] Tailer error: {e}")

            time.sleep(self.POLL_INTERVAL)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    logger.info("=" * 60)
    logger.info("  SecBridge — Cisco XDR Shipper v1.1")
    logger.info("=" * 60)

    cfg     = load_xdr_config()
    region  = cfg["region"]
    sources = load_sources()

    if not sources:
        logger.error("No active sources with parsed log files found in sources.json")
        sys.exit(1)

    logger.info(f"Region:  {region}")
    logger.info(f"Sources: {[s['product'] for s in sources]}")

    auth = XDRAuth(cfg["client_id"], cfg["client_secret"], region)
    try:
        auth.get_token()
        logger.info("Cisco XDR authentication successful")
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        sys.exit(1)

    shipper = XDRShipper(auth, region)
    state   = load_state()

    tailers = []
    for source in sources:
        t = LogTailer(source, shipper, state)
        t.start()
        tailers.append(t)
        logger.info(f"Started tailer for: {source['product']} → {source['parsed_log_file']}")

    logger.info(f"Shipper running. Watching {len(tailers)} source(s).")
    logger.info(f"Shipping to: {REGIONS[region]['sighting_url']}")

    try:
        while True:
            time.sleep(300)
            logger.info(f"Stats — Shipped: {shipper._shipped} | Failed: {shipper._failed}")
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        shipper.flush()


# ══════════════════════════════════════════════════════════════════════════════
# TEST MODE
# ══════════════════════════════════════════════════════════════════════════════

def test_mode():
    print("\n=== Cisco XDR Shipper — Test Mode ===\n")
    sample_events = [
        {
            "timestamp":        "2026-03-10T13:35:04+08:00",
            "source":           "sangfor_ngaf",
            "log_type":         "application control",
            "src_ip":           "10.56.78.100",
            "dst_ip":           "192.111.4.188",
            "action":           "Allow",
            "action_normalised":"ALLOW",
            "event_category":   "app_control",
            "severity":         "Info",
        },
        {
            "timestamp":        "2026-03-10T13:35:04+08:00",
            "source":           "sangfor_ngaf",
            "log_type":         "APT detection",
            "src_ip":           "10.8.2.201",
            "dst_ip":           "8.8.8.8",
            "attack_type":      "Botnet",
            "threat_level":     "Critical",
            "severity":         "Critical",
            "action":           "Denied",
            "action_normalised":"BLOCK",
            "event_category":   "threat",
        },
    ]

    for i, event in enumerate(sample_events, 1):
        sighting = map_to_sighting(event, "Sangfor NGAF Test")
        print(f"Sample {i} — {event['log_type']}:")
        print(json.dumps(sighting, indent=2))
        print()

    print("Mapping looks correct. To test real API auth, use --test-auth flag.")


def test_auth_mode():
    print("\n=== Testing Cisco XDR Authentication ===\n")
    cfg  = load_xdr_config()
    auth = XDRAuth(cfg["client_id"], cfg["client_secret"], cfg["region"])
    try:
        token = auth.get_token()
        print(f"SUCCESS — Token obtained (first 20 chars): {token[:20]}...")
        print(f"Region:    {cfg['region']}")
        print(f"Token URL: {REGIONS[cfg['region']]['token_url']}")
    except Exception as e:
        print(f"FAILED — {e}")


if __name__ == "__main__":
    if "--test" in sys.argv:
        test_mode()
    elif "--test-auth" in sys.argv:
        test_auth_mode()
    else:
        main()
