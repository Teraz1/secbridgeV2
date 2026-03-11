#!/usr/bin/env python3
"""
=============================================================================
SecBridge — Sangfor NGAF Parser  v1.1
=============================================================================
Parses Sangfor NGAF raw syslog lines into structured JSON.
Supports both CEF format and legacy fwlog format (auto-detected).

Reads from:  /var/log/scalyr-agent-2/sangfor-ngaf.log  (live tail)
Writes to:   /var/log/scalyr-agent-2/sangfor-ngaf-parsed.log

The Scalyr Agent ships the PARSED log to SentinelOne SDL.
The cisco_xdr_shipper.py ships the PARSED log to Cisco XDR.

Run as a service:
  sudo systemctl start secbridge-parser
=============================================================================
"""

import re
import json
import time
import sys
import os
import logging
from datetime import datetime, timezone, timedelta

# ── Timezone (Asia/Kuala_Lumpur = UTC+8) ─────────────────────────────────────
TZ_LOCAL = timezone(timedelta(hours=8))

# ── Logging setup ─────────────────────────────────────────────────────────────
LOG_DIR = "/var/log/scalyr-agent-2"
handlers = [logging.StreamHandler(sys.stdout)]
if os.path.isdir(LOG_DIR):
    handlers.append(logging.FileHandler(f"{LOG_DIR}/sangfor-parser-service.log"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
)
logger = logging.getLogger("sangfor-parser")

# ── File paths ────────────────────────────────────────────────────────────────
INPUT_LOG  = "/var/log/scalyr-agent-2/sangfor-ngaf.log"
OUTPUT_LOG = "/var/log/scalyr-agent-2/sangfor-ngaf-parsed.log"
STATE_FILE = "/var/log/scalyr-agent-2/sangfor-parser.state"

# ── Severity mapping ──────────────────────────────────────────────────────────
SEVERITY_MAP = {
    "critical":      "CRITICAL",
    "high":          "HIGH",
    "medium":        "MEDIUM",
    "low":           "LOW",
    "information":   "INFO",
    "informational": "INFO",
    "info":          "INFO",
    "warning":       "WARNING",
}

# CEF severity number → label
CEF_SEVERITY_MAP = {
    0: "INFO", 1: "INFO", 2: "INFO",
    3: "LOW",  4: "LOW",
    5: "MEDIUM", 6: "MEDIUM",
    7: "HIGH",   8: "HIGH",
    9: "CRITICAL", 10: "CRITICAL",
}

# ── Log type → event category ─────────────────────────────────────────────────
CATEGORY_MAP = {
    "apt detection":      "threat",
    "ips":                "intrusion",
    "traffic audit":      "traffic",
    "application control":"app_control",
    "url filter":         "web_filter",
    "user auth":          "authentication",
    "vpn":                "vpn",
    "nat":                "nat",
    "system":             "system",
    "anti-virus":         "malware",
    "antivirus":          "malware",
    "dos":                "dos_attack",
    "service control":    "app_control",
}

# ── fwlog field extraction patterns ──────────────────────────────────────────
FWLOG_PATTERNS = {
    "log_type":     re.compile(r"Log [Tt]ype[:\s]+([^,\n]+?)(?:,|$)"),
    "policy_name":  re.compile(r"policy name[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "rule_id":      re.compile(r"rule ID[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "src_ip":       re.compile(r"src IP[:\s]+(\d{1,3}(?:\.\d{1,3}){3})"),
    "src_port":     re.compile(r"src port[:\s]+(\d+)"),
    "dst_ip":       re.compile(r"dst IP[:\s]+(\d{1,3}(?:\.\d{1,3}){3})"),
    "dst_port":     re.compile(r"dst port[:\s]+(\d+)"),
    "attack_type":  re.compile(r"attack type[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "threat_level": re.compile(r"threat level[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "action":       re.compile(r"action[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "url":          re.compile(r"\bURL:([^\s,\n]+)"),
    "username":     re.compile(r"[Uu]sername(?:/[Hh]ost)?[:\s]+([^,\n]+?)(?:,|$)"),
    "app_category": re.compile(r"App [Cc]ategory[:\s]+([^,\n]+?)(?:,|$)"),
    "outbound":     re.compile(r"[Oo]utbound\(B\)[:\s]+(\d+)"),
    "inbound":      re.compile(r"[Ii]nbound\(B\)[:\s]+(\d+)"),
    "protocol":     re.compile(r"proto(?:col)?[:\s]+([^,\n]+?)(?:,|$)", re.I),
    "nat_src_ip":   re.compile(r"NAT src IP[:\s]+(\d{1,3}(?:\.\d{1,3}){3})", re.I),
    "nat_dst_ip":   re.compile(r"NAT dst IP[:\s]+(\d{1,3}(?:\.\d{1,3}){3})", re.I),
    "vpn_user":     re.compile(r"VPN [Uu]ser[:\s]+([^,\n]+?)(?:,|$)"),
    "ips_rule":     re.compile(r"IPS rule[:\s]+([^,\n]+?)(?:,|$)", re.I),
}


# ══════════════════════════════════════════════════════════════════════════════
# CEF PARSER
# ══════════════════════════════════════════════════════════════════════════════

def parse_cef_extensions(ext_str: str) -> dict:
    """Parse CEF extension key=value pairs into a dict."""
    fields = {}
    # Match key=value pairs, values may contain spaces until next key=
    pattern = re.compile(r'(\w+)=((?:(?!\w+=).)*)')
    for m in pattern.finditer(ext_str):
        key = m.group(1).strip()
        val = m.group(2).strip()
        if key and val:
            fields[key] = val
    return fields


def parse_cef_line(raw_line: str) -> dict:
    """
    Parse a Sangfor NGAF CEF format syslog line.
    CEF format: CEF:Version|DeviceVendor|DeviceProduct|...|Name|Severity|Extensions
    Returns a structured dict.
    """
    # Default timestamp in local time
    event = {
        "timestamp":    datetime.now(TZ_LOCAL).isoformat(),
        "raw":          raw_line,
        "source":       "sangfor_ngaf",
        "parser":       "sangfor-ngaf-cef",
    }

    # Find CEF header
    cef_match = re.search(r'CEF:(\d+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)', raw_line, re.DOTALL)
    if not cef_match:
        return None

    cef_version  = cef_match.group(1)
    device_vendor= cef_match.group(2)
    device_prod  = cef_match.group(3)
    device_ver   = cef_match.group(4)
    sig_id       = cef_match.group(5)
    log_name     = cef_match.group(6)
    severity_str = cef_match.group(7)
    extension    = cef_match.group(8)

    # Set log type from CEF name
    if log_name:
        event["log_type"] = log_name.strip()

    # CEF severity (numeric or text)
    try:
        sev_num = int(severity_str)
        event["severity"] = CEF_SEVERITY_MAP.get(sev_num, "INFO")
    except ValueError:
        event["severity"] = SEVERITY_MAP.get(severity_str.lower(), severity_str.upper())

    # Parse extensions
    ext_fields = parse_cef_extensions(extension)

    # Map CEF fields to our standard field names
    field_map = {
        "src":                    "src_ip",
        "dst":                    "dst_ip",
        "spt":                    "src_port",
        "dpt":                    "dst_port",
        "proto":                  "protocol",
        "act":                    "action",
        "sourceTranslatedAddress":"nat_src_ip",
        "destinationTranslatedAddress":"nat_dst_ip",
        "suser":                  "username",
        "duser":                  "dst_user",
        "app":                    "application",
        "msg":                    "message",
        "request":                "url",
        "cs1":                    "policy_name",
        "cs2":                    "attack_type",
    }

    for cef_key, our_key in field_map.items():
        if cef_key in ext_fields and ext_fields[cef_key]:
            val = ext_fields[cef_key].strip()
            if val and val not in ("0", "::", "null", "(null)"):
                event[our_key] = val

    # Also check msg field for attack info
    if "msg" in ext_fields:
        event["message"] = ext_fields["msg"]

    # Parse start timestamp from extension — Sangfor sends local KL time
    start_match = re.search(r"start=(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})", extension)
    if start_match:
        try:
            ts = datetime.strptime(start_match.group(1), "%Y-%m-%d %H:%M:%S")
            event["timestamp"] = ts.replace(tzinfo=TZ_LOCAL).isoformat()
        except Exception:
            pass

    # Also check TimeCreated field
    if not start_match:
        tc_match = re.search(r"TimeCreated=(\d{2}:\d{2}:\d{2})", extension)
        if tc_match:
            try:
                today = datetime.now(TZ_LOCAL).strftime("%Y-%m-%d")
                ts_str = f"{today} {tc_match.group(1)}"
                ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                event["timestamp"] = ts.replace(tzinfo=TZ_LOCAL).isoformat()
            except Exception:
                pass

    # Category from log type
    if "log_type" in event:
        lt = event["log_type"].lower().strip()
        event["event_category"] = CATEGORY_MAP.get(lt, "firewall")

    # Action normalisation
    if "action" in event:
        a = event["action"].lower()
        if "deny" in a or "block" in a or "drop" in a or "den" in a:
            event["action_normalised"] = "BLOCK"
        elif "allow" in a or "permit" in a or "pass" in a:
            event["action_normalised"] = "ALLOW"
        else:
            event["action_normalised"] = event["action"].upper()

    # Threat level from severity
    if "severity" in event:
        event["threat_level"] = event["severity"]

    return event


# ══════════════════════════════════════════════════════════════════════════════
# FWLOG PARSER (legacy format)
# ══════════════════════════════════════════════════════════════════════════════

def parse_fwlog_line(raw_line: str) -> dict:
    """
    Parse a single Sangfor NGAF fwlog line into a structured dict.
    Returns None if the line is not a recognisable fwlog entry.
    """
    raw_line = raw_line.strip()
    if not raw_line or "fwlog" not in raw_line.lower():
        return None

    event = {
        "timestamp":    datetime.now(TZ_LOCAL).isoformat(),
        "raw":          raw_line,
        "source":       "sangfor_ngaf",
        "parser":       "sangfor-ngaf",
    }

    for field, pattern in FWLOG_PATTERNS.items():
        m = pattern.search(raw_line)
        if m:
            event[field] = m.group(1).strip()

    # Severity normalisation
    if "threat_level" in event:
        event["severity"] = SEVERITY_MAP.get(
            event["threat_level"].lower(), event["threat_level"].upper()
        )

    # Category from log_type
    if "log_type" in event:
        lt = event["log_type"].lower().strip()
        event["event_category"] = CATEGORY_MAP.get(lt, "firewall")

    # Action normalisation
    if "action" in event:
        a = event["action"].lower()
        event["action_normalised"] = "BLOCK" if "den" in a else "ALLOW" if "allow" in a else event["action"].upper()

    if len(event) <= 4:
        return None

    return event


# ══════════════════════════════════════════════════════════════════════════════
# AUTO-DETECT FORMAT AND PARSE
# ══════════════════════════════════════════════════════════════════════════════

def parse_line(raw_line: str) -> dict:
    """Auto-detect CEF vs fwlog format and parse accordingly."""
    raw_line = raw_line.strip()
    if not raw_line:
        return None

    if "CEF:" in raw_line:
        return parse_cef_line(raw_line)
    elif "fwlog" in raw_line.lower():
        return parse_fwlog_line(raw_line)
    return None


# ══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

def get_file_position() -> int:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return int(f.read().strip())
        except Exception:
            pass
    return 0


def save_file_position(pos: int):
    with open(STATE_FILE, "w") as f:
        f.write(str(pos))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN TAIL LOOP
# ══════════════════════════════════════════════════════════════════════════════

def tail_and_parse():
    """
    Continuously tail INPUT_LOG, parse each line, write JSON to OUTPUT_LOG.
    Survives log rotation by detecting file shrinkage / inode change.
    """
    logger.info("Sangfor NGAF parser started (fwlog + CEF support).")
    logger.info(f"  Input:  {INPUT_LOG}")
    logger.info(f"  Output: {OUTPUT_LOG}")

    last_pos   = get_file_position()
    last_inode = None
    parsed     = 0
    skipped    = 0

    while True:
        try:
            if not os.path.exists(INPUT_LOG):
                time.sleep(5)
                continue

            current_inode = os.stat(INPUT_LOG).st_ino
            if last_inode is not None and current_inode != last_inode:
                logger.info("Log rotation detected. Resetting offset.")
                last_pos = 0

            last_inode = current_inode

            with open(INPUT_LOG, "r", errors="replace") as f:
                f.seek(0, 2)
                size = f.tell()
                if last_pos > size:
                    last_pos = 0

                f.seek(last_pos)

                with open(OUTPUT_LOG, "a") as out:
                    for line in f:
                        result = parse_line(line)
                        if result:
                            out.write(json.dumps(result) + "\n")
                            out.flush()
                            parsed += 1
                        else:
                            skipped += 1

                last_pos = f.tell()
                save_file_position(last_pos)

        except Exception as e:
            logger.error(f"Parser error: {e}")

        time.sleep(2)


# ══════════════════════════════════════════════════════════════════════════════
# TEST MODE
# ══════════════════════════════════════════════════════════════════════════════

def test_mode():
    samples = [
        # CEF format
        '<134>Mar 10 13:35:04 sfos-x86_64 fwlog[2415232]: CEF:0|Sangfor|NGAF|AF8.0.95|7|Service Control or Application Control|1|SourceSystem=public PolicyName=LAN to WAN Any suser=(null) proto=TCP src=10.56.78.100 spt=52600 SrcZone=L3_trust_A dst=192.111.4.188 dpt=443 DstZone=L3_untrust_A destinationServiceName=https app=All group=(null) msg=LOG_APP_CONTROL_SERVICE act=Allow start=2026-03-10 13:35:04',
        # fwlog format
        '<134>Jan 30 11:38:49 localhost fwlog: Log type: APT detection, policy name:fwlogin, rule ID:0, src IP: 10.8.2.201, src port:50815, dst IP: 0.0.0.0, dst port: 53, attack type: Botnet, threat level:Information, action:Denied, URL:pool.hashvault.pro',
        '<134>Jan 30 11:38:50 localhost fwlog: Log Type: traffic audit, App Category:Gmail[Browse], Username/Host:10.63.44.25, Outbound(B):18376, Inbound(B):10572',
    ]

    print("\n=== Sangfor NGAF Parser - Test Mode ===\n")
    for i, line in enumerate(samples, 1):
        result = parse_line(line)
        if result:
            raw = result.pop("raw", None)
            print(f"Sample {i} ({result.get('parser', 'unknown')}):")
            print(json.dumps(result, indent=2))
            print()
        else:
            print(f"Sample {i}: NOT MATCHED\n  {line[:80]}...\n")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        test_mode()
    else:
        tail_and_parse()
