import { useState, useEffect, useRef, useCallback } from "react";

const API = "/api";

// ── CSS ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#0D1117;--bg2:#161B22;--bg3:#21262D;--bg4:#30363D;
  --border:#30363D;--border2:#444C56;
  --text:#E6EDF3;--text2:#8B949E;--text3:#6E7681;
  --green:#3FB950;--green-bg:rgba(63,185,80,.1);
  --blue:#58A6FF;--blue-bg:rgba(88,166,255,.1);
  --red:#F85149;--red-bg:rgba(248,81,73,.1);
  --yellow:#D29922;--yellow-bg:rgba(210,153,34,.1);
  --purple:#BC8CFF;--purple-bg:rgba(188,140,255,.1);
  --radius:8px;--radius2:12px;
  --font:'IBM Plex Sans',sans-serif;
  --mono:'IBM Plex Mono',monospace;
}
body{font-family:var(--font);background:var(--bg);color:var(--text);overflow-x:hidden;}

/* scrollbar */
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:var(--bg2);}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px;}

/* Login */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;overflow:hidden;}
.login-grid{position:absolute;inset:0;background-image:linear-gradient(var(--bg3) 1px,transparent 1px),linear-gradient(90deg,var(--bg3) 1px,transparent 1px);background-size:40px 40px;opacity:.4;}
.login-glow{position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(88,166,255,.06) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);}
.login-card{position:relative;z-index:2;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);width:380px;padding:36px;}
.login-logo{display:flex;align-items:center;gap:12px;margin-bottom:28px;}
.login-logo-icon{width:38px;height:38px;border-radius:var(--radius);background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;}
.login-brand{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--text);}
.login-ver{font-size:11px;color:var(--text3);font-family:var(--mono);}
.login-title{font-size:20px;font-weight:600;margin-bottom:4px;}
.login-sub{font-size:13px;color:var(--text2);margin-bottom:24px;}
.lfield{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.llabel{font-size:12px;font-weight:500;color:var(--text2);}
.linput{padding:9px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;font-family:var(--font);color:var(--text);outline:none;transition:border .15s;}
.linput:focus{border-color:var(--blue);}
.linput::placeholder{color:var(--text3);}
.lbtn{width:100%;padding:10px;background:var(--blue);color:#fff;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;margin-top:8px;transition:opacity .15s;}
.lbtn:hover{opacity:.85;}
.lbtn:disabled{opacity:.5;cursor:not-allowed;}
.lerr{background:var(--red-bg);color:var(--red);border:1px solid rgba(248,81,73,.2);border-radius:var(--radius);padding:9px 12px;font-size:12px;margin-bottom:12px;}

/* Shell */
.shell{display:flex;min-height:100vh;}
.sidebar{width:220px;min-height:100vh;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;z-index:100;transition:width .2s;}
.sidebar.collapsed{width:56px;}
.sb-header{padding:16px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);min-height:58px;}
.sb-brand{display:flex;align-items:center;gap:10px;overflow:hidden;}
.sb-icon{width:28px;height:28px;border-radius:6px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.sb-text{overflow:hidden;white-space:nowrap;}
.sb-name{font-family:var(--mono);font-size:14px;font-weight:600;color:var(--text);}
.sb-ver{font-size:10px;color:var(--text3);font-family:var(--mono);}
.hbtn{width:24px;height:24px;border-radius:4px;background:none;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text2);font-size:12px;transition:all .15s;}
.hbtn:hover{background:var(--bg3);color:var(--text);}
.sb-nav{padding:10px 8px;flex:1;display:flex;flex-direction:column;gap:2px;overflow-y:auto;}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:6px;cursor:pointer;transition:all .15s;color:var(--text2);font-size:13px;font-weight:400;border:none;background:none;width:100%;text-align:left;white-space:nowrap;overflow:hidden;}
.nav-item:hover{color:var(--text);background:var(--bg3);}
.nav-item.active{background:var(--blue-bg);color:var(--blue);}
.nav-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;}
.nav-label{overflow:hidden;font-size:13px;}
.sidebar.collapsed .nav-label{display:none;}
.nav-sep{height:1px;background:var(--border);margin:6px 0;}
.sb-footer{padding:10px 8px;border-top:1px solid var(--border);}
.agent-pill{display:flex;align-items:center;gap:8px;padding:8px 9px;background:var(--bg3);border-radius:6px;overflow:hidden;}
.agent-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
.agent-txt{overflow:hidden;white-space:nowrap;}
.agent-status{font-size:11px;font-weight:500;font-family:var(--mono);}
.agent-label{font-size:10px;color:var(--text3);}
.sidebar.collapsed .agent-txt{display:none;}

/* Main */
.main{margin-left:220px;flex:1;transition:margin-left .2s;}
.main.expanded{margin-left:56px;}
.topbar{background:var(--bg2);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
.page-title{font-size:14px;font-weight:600;color:var(--text);}
.page-sub{font-size:11px;color:var(--text3);margin-top:1px;}
.topbar-r{display:flex;align-items:center;gap:8px;}
.user-chip{display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text2);}
.role-dot{width:6px;height:6px;border-radius:50%;}
.logout-btn{padding:5px 10px;border-radius:6px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);font-size:12px;cursor:pointer;font-family:var(--font);transition:all .15s;}
.logout-btn:hover{color:var(--text);border-color:var(--border2);}
.content{padding:20px 24px;flex:1;}

/* Toast */
.toast{position:fixed;top:14px;right:14px;z-index:9999;padding:10px 16px;border-radius:var(--radius);font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:slideIn .2s ease;}
@keyframes slideIn{from{transform:translateX(20px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.toast-ok{background:var(--bg2);border:1px solid var(--green);color:var(--green);}
.toast-err{background:var(--bg2);border:1px solid var(--red);color:var(--red);}

/* Cards */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);overflow:hidden;}
.card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.card-title{font-size:13px;font-weight:600;color:var(--text);}
.card-sub{font-size:11px;color:var(--text3);margin-top:1px;}

/* Buttons */
.btn{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;font-family:var(--font);transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.btn-primary{background:var(--blue);color:#fff;border-color:var(--blue);}
.btn-primary:hover{opacity:.85;}
.btn-green{background:var(--green);color:#0D1117;border-color:var(--green);}
.btn-green:hover{opacity:.85;}
.btn-ghost{background:var(--bg3);color:var(--text2);border-color:var(--border);}
.btn-ghost:hover{color:var(--text);border-color:var(--border2);}
.btn-danger{background:var(--red-bg);color:var(--red);border-color:rgba(248,81,73,.3);}
.btn-danger:hover{background:rgba(248,81,73,.2);}
.btn:disabled{opacity:.4;cursor:not-allowed;}

/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 7px;border-radius:20px;font-weight:500;font-family:var(--mono);}
.badge-green{background:var(--green-bg);color:var(--green);}
.badge-blue{background:var(--blue-bg);color:var(--blue);}
.badge-red{background:var(--red-bg);color:var(--red);}
.badge-gray{background:var(--bg3);color:var(--text2);}
.badge-yellow{background:var(--yellow-bg);color:var(--yellow);}

/* Stat Grid */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);padding:16px 18px;}
.stat-label{font-size:11px;color:var(--text3);font-weight:500;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;}
.stat-val{font-size:26px;font-weight:700;font-family:var(--mono);color:var(--text);margin-bottom:6px;}
.stat-sub{font-size:11px;color:var(--text2);}

/* Table */
.table{width:100%;border-collapse:collapse;}
.table th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);}
.table td{padding:12px 16px;font-size:13px;border-bottom:1px solid var(--border);}
.table tr:last-child td{border-bottom:none;}
.table tr:hover td{background:var(--bg3);}

/* Source status */
.src-name{font-size:13px;font-weight:500;color:var(--text);}
.src-prod{font-size:11px;color:var(--text3);font-family:var(--mono);}
.port-tag{font-family:var(--mono);font-size:11px;padding:2px 7px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text2);}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;padding:3px 8px;border-radius:20px;}
.pill-on{background:var(--green-bg);color:var(--green);}
.pill-off{background:var(--bg3);color:var(--text3);}
.pdot{width:5px;height:5px;border-radius:50%;}
.pdot-on{background:var(--green);}
.pdot-off{background:var(--text3);}

/* Form */
.form-grid{display:flex;flex-direction:column;gap:14px;}
.fg{display:flex;flex-direction:column;gap:5px;}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.flabel{font-size:12px;font-weight:500;color:var(--text2);}
.finput,.fselect,.ftextarea{padding:8px 11px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:var(--font);color:var(--text);outline:none;transition:border .15s;width:100%;}
.finput:focus,.fselect:focus,.ftextarea:focus{border-color:var(--blue);}
.finput::placeholder{color:var(--text3);}
.fhint{font-size:11px;color:var(--text3);}

/* Health cards */
.health-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.hcard{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;}
.hcard-title{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;}
.hrow{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);}
.hrow:last-child{border-bottom:none;}
.hrow-label{font-size:12px;color:var(--text2);font-family:var(--mono);}
.hstatus{font-size:12px;font-weight:500;}
.hs-ok{color:var(--green);}
.hs-err{color:var(--red);}
.hs-warn{color:var(--yellow);}

/* Log viewer */
.log-wrap{background:var(--bg);border-top:1px solid var(--border);padding:12px 16px;height:520px;overflow-y:auto;font-family:var(--mono);font-size:12px;line-height:1.6;}
.log-line{color:var(--text2);padding:1px 0;word-break:break-all;}
.log-line.threat{color:var(--red);}
.log-line.block{color:var(--yellow);}
.log-line.allow{color:var(--green);}
.log-time{color:var(--text3);}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--red);display:inline-block;margin-right:4px;animation:pulse 1s infinite;}

/* Pipeline */
.pipeline{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:8px 0;}
.pipe-stage{flex:1;min-width:160px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;}
.pipe-stage+.pipe-stage{border-left:none;border-radius:0;}
.pipe-stage:first-child{border-radius:var(--radius) 0 0 var(--radius);}
.pipe-stage:last-child{border-radius:0 var(--radius) var(--radius) 0;border-left:1px solid var(--border);}
.pipe-title{font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}
.pipe-node{display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;margin-bottom:6px;}
.pipe-node:last-child{margin-bottom:0;}
.pipe-icon{font-size:14px;flex-shrink:0;}
.pipe-info{flex:1;overflow:hidden;}
.pipe-name{font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pipe-detail{font-size:10px;color:var(--text3);font-family:var(--mono);}
.pipe-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.pipe-ok{background:var(--green);}
.pipe-off{background:var(--text3);}
.pipe-warn{background:var(--yellow);}

/* Toggle */
.toggle{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.toggle::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:3px;left:3px;transition:transform .2s;}
.toggle.on{background:var(--green);}
.toggle.on::after{transform:translateX(16px);}
.toggle.off{background:var(--bg4);}

/* Wizard */
.wiz-steps{display:flex;gap:0;margin-bottom:24px;}
.wiz-step{flex:1;display:flex;align-items:center;gap:0;}
.wiz-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;font-family:var(--mono);}
.wiz-step.done .wiz-circle{background:var(--green);color:#0D1117;}
.wiz-step.active .wiz-circle{background:var(--blue);color:#fff;}
.wiz-step.pending .wiz-circle{background:var(--bg3);color:var(--text3);border:1px solid var(--border);}
.wiz-label{font-size:12px;margin-left:8px;white-space:nowrap;}
.wiz-step.done .wiz-label{color:var(--green);}
.wiz-step.active .wiz-label{color:var(--text);}
.wiz-step.pending .wiz-label{color:var(--text3);}
.wiz-line{flex:1;height:1px;background:var(--border);margin:0 8px;}
.wiz-step.done .wiz-line{background:var(--green);}
.wiz-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:24px;}
.wiz-ftr{display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:1px solid var(--border);}

/* Meter */
.meter{height:3px;background:var(--bg3);border-radius:2px;margin-top:4px;overflow:hidden;}
.meter-fill{height:100%;background:var(--blue);border-radius:2px;transition:width .5s;}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;display:flex;align-items:center;justify-content:center;}
.modal{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius2);width:480px;max-height:80vh;overflow-y:auto;}
.modal-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-title{font-size:14px;font-weight:600;}
.modal-close{background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;line-height:1;}
.modal-body{padding:20px;}
.modal-footer{padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;}

/* Two col */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.page-gap{display:flex;flex-direction:column;gap:12px;}

/* Inline banner */
.banner{padding:10px 14px;border-radius:var(--radius);font-size:12px;display:flex;align-items:center;gap:8px;}
.banner-blue{background:var(--blue-bg);border:1px solid rgba(88,166,255,.2);color:var(--blue);}
.banner-yellow{background:var(--yellow-bg);border:1px solid rgba(210,153,34,.2);color:var(--yellow);}
`;

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Dashboard",    icon:"▦" },
  { id:"sources",   label:"Sources",      icon:"⇄" },
  { id:"logs",      label:"Live Logs",    icon:"▤" },
  { id:"health",    label:"Health",       icon:"♥" },
  { id:"destination",label:"Destination", icon:"⤴" },
  { id:"parsers",   label:"Parsers",      icon:"⚙" },
  { id:"pipeline",  label:"Pipeline",     icon:"◈" },
];
const NAV_ADMIN = [
  { id:"users",  label:"Users",  icon:"👤" },
  { id:"backup", label:"Backup", icon:"📦" },
  { id:"wizard", label:"Wizard", icon:"✦" },
];

const TITLES = {
  dashboard:   { t:"Dashboard",    s:"Live system overview" },
  sources:     { t:"Sources",      s:"Manage syslog sources" },
  logs:        { t:"Live Logs",    s:"Real-time syslog stream" },
  health:      { t:"Health Check", s:"Full system diagnostics" },
  destination: { t:"Destination",  s:"SentinelOne SDL credentials" },
  parsers:     { t:"Parsers",      s:"Log format parsers" },
  pipeline:    { t:"Pipeline",     s:"End-to-end flow" },
  users:       { t:"Users",        s:"Manage access" },
  backup:      { t:"Backup",       s:"Config backup & restore" },
  wizard:      { t:"Setup Wizard", s:"Guided first-time setup" },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function timeSince(iso) {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 5) return "just now";
  if (d < 60) return d + "s ago";
  if (d < 3600) return Math.floor(d/60) + "m ago";
  return Math.floor(d/3600) + "h ago";
}

// ── Login ──────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !pass) { setErr("Enter username and password."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass })
      });
      if (res.ok) {
        const d = await res.json();
        onLogin(user, d.token, d.role);
      } else {
        setErr("Invalid credentials.");
        setLoading(false);
      }
    } catch {
      setErr("Cannot reach backend.");
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-grid"/>
      <div className="login-glow"/>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">⬡</div>
          <div>
            <div className="login-brand">SecBridge</div>
            <div className="login-ver">v3.2 · Security Log Router</div>
          </div>
        </div>
        <div className="login-title">Sign in</div>
        <div className="login-sub">Access your SecBridge dashboard</div>
        {err && <div className="lerr">{err}</div>}
        <div className="lfield">
          <label className="llabel">Username</label>
          <input className="linput" placeholder="admin" value={user}
            onChange={e=>setUser(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div className="lfield">
          <label className="llabel">Password</label>
          <input className="linput" type="password" placeholder="••••••••" value={pass}
            onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <button className="lbtn" onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ sources, agentStatus }) {
  const agentOk = agentStatus?.agent_running;
  const sdlOk   = agentStatus?.sdl_reachable;
  const active  = sources.filter(s => s.port_listening).length;
  const totalLogs = sources.reduce((a,s) => a + (s.log_info?.lines||0), 0);

  return (
    <div className="page-gap">
      <div className="stat-grid">
        {[
          { label:"Active Sources",  val:active+"/"+sources.length, sub: active+" port(s) listening", color: active>0?"var(--green)":"var(--red)" },
          { label:"Total Logs",      val:totalLogs.toLocaleString(), sub:"in log files", color:"var(--blue)" },
          { label:"Agent",           val:agentOk?"Running":"Stopped", sub:"scalyr-agent-2", color:agentOk?"var(--green)":"var(--red)" },
          { label:"SDL",             val:sdlOk?"Reachable":"Unknown", sub:"xdr.ap1.sentinelone.net", color:sdlOk?"var(--green)":"var(--text3)" },
        ].map((s,i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{color:s.color,fontSize:22}}>{s.val}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Sources</div><div className="card-sub">Live throughput</div></div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Source</th><th>Port</th><th>Status</th>
              <th>Log Size</th><th>Log Lines</th><th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:"center",color:"var(--text3)",padding:24}}>No sources configured. Go to Sources to add one.</td></tr>
            ) : sources.map(s => (
              <tr key={s.id}>
                <td><div className="src-name">{s.name}</div><div className="src-prod">{s.product}</div></td>
                <td><span className="port-tag">{s.syslog_port}/{s.protocol}</span></td>
                <td>
                  <span className={`pill ${s.port_listening?"pill-on":"pill-off"}`}>
                    <span className={`pdot ${s.port_listening?"pdot-on":"pdot-off"}`}/>
                    {s.port_listening?"active":"inactive"}
                  </span>
                </td>
                <td style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text2)"}}>{s.log_info?.size_kb||0} KB</td>
                <td style={{fontFamily:"var(--mono)",fontSize:12}}>{(s.log_info?.lines||0).toLocaleString()}</td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{timeSince(s.log_info?.modified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sources ────────────────────────────────────────────────────────────────
function Sources({ sources, apiFetch, loadSources, showToast }) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [applying,  setApplying]  = useState(false);
  const [form, setForm] = useState({ name:"", product:"", port:"514", protocol:"udp", allowed_ips:"", parser_name:"sdl-handles-parsing" });
  const [parsers, setParsers] = useState([]);

  useEffect(() => {
    if (showAdd) {
      apiFetch("/parsers/names").then(r=>r&&r.ok?r.json():null).then(d=>{ if(d) setParsers(d); }).catch(()=>{});
    }
  }, [showAdd, apiFetch]);

  const apply = async () => {
    setApplying(true);
    try {
      const res = await apiFetch("/apply", { method:"POST" });
      if (res && res.ok) { showToast("Config applied — agent restarting"); loadSources(); }
      else { const d = await res?.json(); showToast(d?.detail||"Apply failed", "err"); }
    } catch { showToast("Apply failed", "err"); }
    setApplying(false);
  };

  const addSource = async () => {
    if (!form.name || !form.port) { showToast("Name and port required","err"); return; }
    try {
      const res = await apiFetch("/sources", {
        method:"POST",
        body: JSON.stringify({
          name: form.name,
          product: form.product || form.name.toLowerCase().replace(/\s+/g,"-"),
          syslog_port: parseInt(form.port),
          protocol: form.protocol,
          allowed_ips: form.allowed_ips ? [form.allowed_ips] : [],
          parser_name: form.parser_name,
        })
      });
      if (res && res.ok) {
        showToast("Source added — click Apply Config to activate");
        setShowAdd(false);
        setForm({ name:"", product:"", port:"514", protocol:"udp", allowed_ips:"", parser_name:"sdl-handles-parsing" });
        loadSources();
      } else {
        const d = await res?.json();
        showToast(d?.detail||"Failed to add source","err");
      }
    } catch { showToast("Failed to add source","err"); }
  };

  const removeSource = async (id) => {
    if (!confirm("Remove this source?")) return;
    try {
      const res = await apiFetch(`/sources/${id}`, { method:"DELETE" });
      if (res && res.ok) { showToast("Source removed"); loadSources(); }
      else showToast("Failed to remove","err");
    } catch { showToast("Failed to remove","err"); }
  };

  const toggleSource = async (id) => {
    try {
      const res = await apiFetch(`/sources/${id}/toggle`, { method:"PATCH" });
      if (res && res.ok) { loadSources(); }
    } catch {}
  };

  const testSource = async (id, name) => {
    try {
      const res = await apiFetch(`/sources/${id}/test`, { method:"POST" });
      if (res && res.ok) showToast(`Test log sent to ${name}`);
      else showToast("Test failed","err");
    } catch { showToast("Test failed","err"); }
  };

  return (
    <div className="page-gap">
      <div className="banner banner-yellow">
        ⚠ After adding or removing sources, click <strong style={{marginLeft:4,marginRight:4}}>Apply Config</strong> to update agent.json and open ports.
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Syslog Sources</div>
            <div className="card-sub">{sources.length} configured · {sources.filter(s=>s.port_listening).length} active</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-green" onClick={apply} disabled={applying}>
              {applying ? "⏳ Applying…" : "▶ Apply Config"}
            </button>
            <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Source</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr><th>Source</th><th>Port / Proto</th><th>Allowed IPs</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:"center",color:"var(--text3)",padding:24}}>No sources yet. Click + Add Source.</td></tr>
            ) : sources.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="src-name">{s.name}</div>
                  <div className="src-prod">ID:{s.id} · {s.product}</div>
                </td>
                <td><span className="port-tag">{s.syslog_port}/{s.protocol}</span></td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{s.allowed_ips?.length>0 ? s.allowed_ips.join(", ") : "any"}</td>
                <td>
                  <span className={`pill ${s.port_listening?"pill-on":"pill-off"}`}>
                    <span className={`pdot ${s.port_listening?"pdot-on":"pdot-off"}`}/>
                    {s.port_listening?"active":"inactive"}
                  </span>
                </td>
                <td>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button
                      className={`toggle ${s.enabled?"on":"off"}`}
                      onClick={()=>toggleSource(s.id)}
                      title={s.enabled?"Disable":"Enable"}
                    />
                    <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 8px"}} onClick={()=>testSource(s.id,s.name)}>Test</button>
                    <button className="btn btn-danger" style={{fontSize:11,padding:"4px 8px"}} onClick={()=>removeSource(s.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Syslog Source</div>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="fg">
                  <label className="flabel">Display Name *</label>
                  <input className="finput" placeholder="e.g. Sangfor NGAF" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div className="fg">
                  <label className="flabel">Product ID</label>
                  <input className="finput" placeholder="auto-generated from name" value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}/>
                  <div className="fhint">Leave blank to auto-generate from name</div>
                </div>
                <div className="f2">
                  <div className="fg">
                    <label className="flabel">Syslog Port *</label>
                    <input className="finput" placeholder="514" value={form.port} onChange={e=>setForm(f=>({...f,port:e.target.value}))}/>
                  </div>
                  <div className="fg">
                    <label className="flabel">Protocol</label>
                    <select className="fselect" value={form.protocol} onChange={e=>setForm(f=>({...f,protocol:e.target.value}))}>
                      <option value="udp">UDP</option>
                      <option value="tcp">TCP</option>
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label className="flabel">Allowed IP (optional)</label>
                  <input className="finput" placeholder="e.g. 192.168.1.1 — leave blank for any" value={form.allowed_ips} onChange={e=>setForm(f=>({...f,allowed_ips:e.target.value}))}/>
                </div>
                <div className="fg">
                  <label className="flabel">Parser</label>
                  <select className="fselect" value={form.parser_name} onChange={e=>setForm(f=>({...f,parser_name:e.target.value}))}>
                    {parsers.map(p=><option key={p.name} value={p.name}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addSource}>Add Source</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Logs ──────────────────────────────────────────────────────────────
function LogViewer({ sources, apiFetch }) {
  const [selected, setSelected] = useState(sources[0]?.product || "");
  const [lines,    setLines]    = useState([]);
  const [live,     setLive]     = useState(true);
  const feedRef    = useRef(null);
  const lastRef    = useRef([]);

  useEffect(() => { if (sources[0]?.product) setSelected(sources[0].product); }, [sources]);

  useEffect(() => {
    if (!live || !selected) return;
    const fetch_ = async () => {
      try {
        const res = await apiFetch(`/logs/${selected}?lines=100`);
        if (res && res.ok) {
          const d = await res.json();
          if (d.lines && JSON.stringify(d.lines) !== JSON.stringify(lastRef.current)) {
            lastRef.current = d.lines;
            setLines(d.lines);
          }
        }
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 3000);
    return () => clearInterval(t);
  }, [live, selected, apiFetch]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [lines]);

  const colorize = (line) => {
    if (/threat|ransomware|botnet|malware/i.test(line)) return "threat";
    if (/blocked|denied|drop/i.test(line)) return "block";
    if (/allowed|permit/i.test(line)) return "allow";
    return "";
  };

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">Live Log Viewer</div><div className="card-sub">Real-time syslog stream</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select className="fselect" value={selected} onChange={e=>setSelected(e.target.value)} style={{width:"auto",padding:"5px 10px",fontSize:12}}>
            {sources.filter(s=>s.enabled).map(s=><option key={s.id} value={s.product}>{s.name}</option>)}
          </select>
          <button className={`btn ${live?"btn-danger":"btn-green"}`} style={{fontSize:12}} onClick={()=>setLive(v=>!v)}>
            {live ? <><span className="live-dot"/>Live</> : "▶ Resume"}
          </button>
          <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setLines([])}>Clear</button>
        </div>
      </div>
      <div className="log-wrap" ref={feedRef}>
        {lines.length === 0 ? (
          <div style={{color:"var(--text3)",fontStyle:"italic"}}>Waiting for logs…</div>
        ) : lines.map((line,i) => {
          const cls = colorize(line);
          const parts = line.split(" ");
          const time = parts.slice(0,3).join(" ");
          const rest = parts.slice(3).join(" ");
          return (
            <div className={`log-line ${cls}`} key={i}>
              <span className="log-time">{time} </span>{rest}
            </div>
          );
        })}
        {live && <div style={{color:"var(--text3)",fontStyle:"italic",marginTop:4}}>▌</div>}
      </div>
    </div>
  );
}

// ── Health ─────────────────────────────────────────────────────────────────
function Health({ sources, apiFetch, showToast }) {
  const [status,   setStatus]   = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck,setLastCheck]= useState(null);
  const [restarting,setRestarting]=useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await apiFetch("/status");
      if (res && res.ok) { setStatus(await res.json()); setLastCheck(new Date().toLocaleTimeString()); }
    } catch {}
    setChecking(false);
  };

  const restart = async () => {
    setRestarting(true);
    try {
      const res = await apiFetch("/restart", { method:"POST" });
      if (res && res.ok) { showToast("Agent restarted"); setTimeout(check, 2000); }
      else showToast("Restart failed","err");
    } catch { showToast("Restart failed","err"); }
    setRestarting(false);
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="page-gap">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:12,color:"var(--text3)"}}>Last checked: {lastCheck||"—"}</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-danger" onClick={restart} disabled={restarting}>
            {restarting?"⏳ Restarting…":"↺ Restart Agent"}
          </button>
          <button className="btn btn-ghost" onClick={check} disabled={checking}>
            {checking?"⏳ Checking…":"↻ Run Check"}
          </button>
        </div>
      </div>

      <div className="health-grid">
        <div className="hcard">
          <div className="hcard-title">Core Services</div>
          {[
            { label:"scalyr-agent-2", ok:status?.agent_running, val:status?.agent_running?"running":"stopped" },
            { label:"secbridge-api",  ok:status?.api_running,   val:status?.api_running?"running":"stopped" },
            { label:"SDL reachable",  ok:status?.sdl_reachable, val:status?.sdl_reachable?"reachable":"unreachable" },
          ].map((r,i) => (
            <div className="hrow" key={i}>
              <span className="hrow-label">{r.label}</span>
              <span className={`hstatus ${r.ok?"hs-ok":"hs-err"}`}>● {r.val}</span>
            </div>
          ))}
        </div>

        <div className="hcard">
          <div className="hcard-title">Syslog Ports</div>
          {sources.length === 0 ? <div style={{fontSize:12,color:"var(--text3)"}}>No sources configured</div> :
            sources.map(s => (
              <div className="hrow" key={s.id}>
                <span className="hrow-label">{s.name}</span>
                <span className={`hstatus ${s.port_listening?"hs-ok":"hs-err"}`}>
                  {s.port_listening?"● :"+s.syslog_port+" open":"✗ :"+s.syslog_port+" closed"}
                </span>
              </div>
            ))
          }
        </div>

        <div className="hcard">
          <div className="hcard-title">Log Files</div>
          {sources.length === 0 ? <div style={{fontSize:12,color:"var(--text3)"}}>No sources configured</div> :
            sources.map(s => (
              <div className="hrow" key={s.id}>
                <span className="hrow-label">{s.product}.log</span>
                <span className={`hstatus ${s.log_info?.exists?"hs-ok":"hs-warn"}`}>
                  {s.log_info?.exists ? "● "+s.log_info.size_kb+"KB" : "⚠ no file"}
                </span>
              </div>
            ))
          }
        </div>

        <div className="hcard">
          <div className="hcard-title">Log Files Detail</div>
          {status?.log_files ? Object.entries(status.log_files).map(([name,info]) => (
            <div className="hrow" key={name}>
              <span className="hrow-label">{name}</span>
              <span className="hstatus hs-ok">{info.size_kb} KB</span>
            </div>
          )) : <div style={{fontSize:12,color:"var(--text3)"}}>—</div>}
        </div>
      </div>
    </div>
  );
}

// ── Destination ────────────────────────────────────────────────────────────
function Destination({ apiFetch, showToast }) {
  const [dest,    setDest]    = useState({ ingest_url:"", api_key:"" });
  const [form,    setForm]    = useState({ ingest_url:"", api_key:"" });
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/destination");
      if (res && res.ok) { const d = await res.json(); setDest(d); setForm({ingest_url:d.ingest_url,api_key:""}); }
    } catch {}
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.ingest_url || !form.api_key) { showToast("URL and API key required","err"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/destination", {
        method:"POST",
        body: JSON.stringify({ ingest_url:form.ingest_url, api_key:form.api_key })
      });
      if (res && res.ok) { showToast("Credentials saved"); setEditing(false); load(); }
      else showToast("Failed to save","err");
    } catch { showToast("Failed to save","err"); }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/destination/test", { method:"POST" });
      if (res && res.ok) {
        const d = await res.json();
        showToast(d.ok ? "SDL reachable ✓ (HTTP "+d.http_code+")" : "SDL unreachable — HTTP "+d.http_code, d.ok?"ok":"err");
      } else showToast("Test failed","err");
    } catch { showToast("Test failed","err"); }
    setTesting(false);
  };

  return (
    <div className="page-gap">
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">SentinelOne SDL</div><div className="card-sub">Log ingestion credentials</div></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" onClick={test} disabled={testing}>{testing?"Testing…":"Test Connection"}</button>
            <button className="btn btn-primary" onClick={()=>setEditing(v=>!v)}>{editing?"Cancel":"Edit Credentials"}</button>
          </div>
        </div>
        <div style={{padding:"20px 18px"}}>
          {!editing ? (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="fg">
                <div className="flabel">Ingest URL</div>
                <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--text)",padding:"8px 11px",background:"var(--bg3)",borderRadius:6,border:"1px solid var(--border)"}}>{dest.ingest_url||"—"}</div>
              </div>
              <div className="fg">
                <div className="flabel">API Key</div>
                <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--text2)",padding:"8px 11px",background:"var(--bg3)",borderRadius:6,border:"1px solid var(--border)"}}>{dest.api_key||"—"}</div>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="fg">
                <label className="flabel">Ingest URL *</label>
                <select className="fselect" value={form.ingest_url} onChange={e=>setForm(f=>({...f,ingest_url:e.target.value}))}>
                  <option value="https://xdr.ap1.sentinelone.net">AP1 — xdr.ap1.sentinelone.net</option>
                  <option value="https://xdr.us1.sentinelone.net">US1 — xdr.us1.sentinelone.net</option>
                  <option value="https://xdr.eu1.sentinelone.net">EU1 — xdr.eu1.sentinelone.net</option>
                  <option value="https://xdr.us2.sentinelone.net">US2 — xdr.us2.sentinelone.net</option>
                </select>
              </div>
              <div className="fg">
                <label className="flabel">Write API Key *</label>
                <input className="finput" type="password" placeholder="Paste new API key" value={form.api_key} onChange={e=>setForm(f=>({...f,api_key:e.target.value}))}/>
                <div className="fhint">Get from S1 Console → Settings → API Keys → Log Access Keys</div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Parsers ────────────────────────────────────────────────────────────────
function Parsers({ apiFetch, showToast }) {
  const [parsers, setParsers] = useState([]);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/parsers");
      if (res && res.ok) setParsers(await res.json());
    } catch {}
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch("/parsers/upload", { method:"POST", headers:{}, body:fd });
      if (res && res.ok) { showToast("Parser uploaded"); load(); }
      else showToast("Upload failed","err");
    } catch { showToast("Upload failed","err"); }
  };

  const remove = async (filename) => {
    if (!confirm("Delete this parser?")) return;
    try {
      const res = await apiFetch(`/parsers/${filename}`, { method:"DELETE" });
      if (res && res.ok) { showToast("Parser deleted"); load(); }
      else showToast("Delete failed","err");
    } catch { showToast("Delete failed","err"); }
  };

  return (
    <div className="page-gap">
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Parsers</div><div className="card-sub">{parsers.length} installed</div></div>
          <div>
            <input ref={fileRef} type="file" accept=".py,.json,.conf,.yaml,.yml" style={{display:"none"}} onChange={upload}/>
            <button className="btn btn-primary" onClick={()=>fileRef.current?.click()}>+ Upload Parser</button>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>File</th><th>Size</th><th>Fields</th><th>Source</th><th>Actions</th></tr></thead>
          <tbody>
            {parsers.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:"center",color:"var(--text3)",padding:24}}>No parsers found.</td></tr>
            ) : parsers.map(p => (
              <tr key={p.id}>
                <td><span style={{fontFamily:"var(--mono)",fontSize:12}}>{p.name}</span></td>
                <td><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text3)"}}>{p.file}</span></td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{p.size_kb} KB</td>
                <td><span className="badge badge-blue">{p.field_count} fields</span></td>
                <td><span className={`badge ${p.source==="uploaded"?"badge-yellow":"badge-gray"}`}>{p.source}</span></td>
                <td>
                  {p.source === "uploaded" && (
                    <button className="btn btn-danger" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>remove(p.file)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pipeline ───────────────────────────────────────────────────────────────
function Pipeline({ sources, apiFetch }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    apiFetch("/status").then(r=>r&&r.ok?r.json():null).then(d=>{ if(d) setStatus(d); }).catch(()=>{});
  }, [apiFetch]);

  const stages = [
    {
      title:"Sources", sub:"Syslog devices", icon:"📡",
      nodes: sources.map(s=>({
        name: s.name,
        detail: ":"+s.syslog_port+"/"+s.protocol+" · "+(s.log_info?.lines||0).toLocaleString()+" logs",
        status: s.port_listening?"ok":"off", icon:"🔥"
      }))
    },
    {
      title:"SecBridge", sub:"Receiver", icon:"⬡",
      nodes:[
        { name:"Scalyr Agent 2", detail:status?.agent_running?"running":"stopped", status:status?.agent_running?"ok":"err", icon:"⚡" },
        { name:"Log Router", detail:sources.filter(s=>s.port_listening).length+" active routes", status:"ok", icon:"📂" },
      ]
    },
    {
      title:"Log Files", sub:"/var/log/scalyr-agent-2", icon:"📁",
      nodes: sources.map(s=>({
        name: s.product+".log",
        detail: s.log_info?.exists?s.log_info.size_kb+"KB":"no file",
        status: s.log_info?.exists?"ok":"off", icon:"📄"
      }))
    },
    {
      title:"SDL", sub:"SentinelOne", icon:"⤴",
      nodes:[
        { name:"SentinelOne SDL", detail:"xdr.ap1.sentinelone.net", status:status?.sdl_reachable?"ok":"err", icon:"🛡️" },
        { name:"SDL Parser", detail:"field extraction", status:"ok", icon:"🔍" },
        { name:"STAR Rules", detail:"alert triggers", status:"ok", icon:"⚡" },
      ]
    },
  ];

  return (
    <div className="page-gap">
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Pipeline Map</div><div className="card-sub">End-to-end log flow</div></div>
        </div>
        <div style={{padding:16,display:"flex",gap:0,overflowX:"auto"}}>
          {stages.map((stage, si) => (
            <div key={si} style={{flex:1,minWidth:160,padding:"0 8px",borderRight:si<stages.length-1?"1px solid var(--border)":"none"}}>
              <div className="pipe-title">{stage.icon} {stage.title}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginBottom:10}}>{stage.sub}</div>
              {stage.nodes.map((node,ni)=>(
                <div className="pipe-node" key={ni}>
                  <span className="pipe-icon">{node.icon}</span>
                  <div className="pipe-info">
                    <div className="pipe-name">{node.name}</div>
                    <div className="pipe-detail">{node.detail}</div>
                  </div>
                  <div className={`pipe-dot ${node.status==="ok"?"pipe-ok":node.status==="err"?"pipe-warn":"pipe-off"}`}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────
function Users({ apiFetch, showToast }) {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username:"", password:"", role:"analyst" });

  const load = useCallback(async () => {
    try { const res = await apiFetch("/users"); if(res&&res.ok) setUsers(await res.json()); } catch {}
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.username || !form.password) { showToast("All fields required","err"); return; }
    try {
      const res = await apiFetch("/users", { method:"POST", body:JSON.stringify(form) });
      if (res && res.ok) { showToast("User added"); setShowAdd(false); setForm({username:"",password:"",role:"analyst"}); load(); }
      else { const d=await res?.json(); showToast(d?.detail||"Failed","err"); }
    } catch { showToast("Failed","err"); }
  };

  const remove = async (username) => {
    if (!confirm("Remove user "+username+"?")) return;
    try {
      const res = await apiFetch(`/users/${username}`, { method:"DELETE" });
      if (res && res.ok) { showToast("User removed"); load(); }
      else showToast("Failed","err");
    } catch { showToast("Failed","err"); }
  };

  return (
    <div className="page-gap">
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Users</div><div className="card-sub">{users.length} accounts</div></div>
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add User</button>
        </div>
        <table className="table">
          <thead><tr><th>Username</th><th>Role</th><th>Created</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.username}>
                <td style={{fontFamily:"var(--mono)",fontSize:13}}>{u.username}</td>
                <td><span className={`badge ${u.role==="admin"?"badge-red":u.role==="analyst"?"badge-blue":"badge-gray"}`}>{u.role}</span></td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{u.created?new Date(u.created).toLocaleDateString():"—"}</td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{u.lastLogin?new Date(u.lastLogin).toLocaleString():"never"}</td>
                <td>{u.username!=="admin"&&<button className="btn btn-danger" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>remove(u.username)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add User</div>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="fg"><label className="flabel">Username *</label><input className="finput" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/></div>
                <div className="fg"><label className="flabel">Password *</label><input className="finput" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
                <div className="fg"><label className="flabel">Role</label>
                  <select className="fselect" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="admin">Admin</option>
                    <option value="analyst">Analyst</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add}>Add User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Backup ─────────────────────────────────────────────────────────────────
function Backup({ apiFetch, showToast, token }) {
  const [backups, setBackups] = useState([]);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { const res = await apiFetch("/backup/list"); if(res&&res.ok) setBackups(await res.json()); } catch {}
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await apiFetch("/backup", { method:"POST" });
      if (res && res.ok) { showToast("Backup created"); load(); }
      else showToast("Backup failed","err");
    } catch { showToast("Backup failed","err"); }
    setCreating(false);
  };

  const download = (name) => {
    window.open(`/api/backup/download/${name}?token=${token}`, "_blank");
  };

  const remove = async (name) => {
    if (!confirm("Delete backup "+name+"?")) return;
    try {
      const res = await apiFetch(`/backup/${name}`, { method:"DELETE" });
      if (res && res.ok) { showToast("Deleted"); load(); }
    } catch {}
  };

  const restore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Restore from "+file.name+"? This will overwrite current config.")) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch("/restore", { method:"POST", headers:{}, body:fd });
      if (res && res.ok) showToast("Restore complete — agent restarted");
      else showToast("Restore failed","err");
    } catch { showToast("Restore failed","err"); }
  };

  return (
    <div className="page-gap">
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Backup & Restore</div><div className="card-sub">{backups.length} backups</div></div>
          <div style={{display:"flex",gap:8}}>
            <input ref={fileRef} type="file" accept=".zip" style={{display:"none"}} onChange={restore}/>
            <button className="btn btn-ghost" onClick={()=>fileRef.current?.click()}>↑ Restore from file</button>
            <button className="btn btn-primary" onClick={create} disabled={creating}>{creating?"Creating…":"+ Create Backup"}</button>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>File</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {backups.length === 0 ? (
              <tr><td colSpan={4} style={{textAlign:"center",color:"var(--text3)",padding:24}}>No backups yet.</td></tr>
            ) : backups.map(b=>(
              <tr key={b.name}>
                <td style={{fontFamily:"var(--mono)",fontSize:12}}>{b.name}</td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{b.size_kb} KB</td>
                <td style={{fontSize:12,color:"var(--text3)"}}>{new Date(b.created).toLocaleString()}</td>
                <td>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-ghost" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>download(b.name)}>↓ Download</button>
                    <button className="btn btn-danger" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>remove(b.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Wizard ─────────────────────────────────────────────────────────────────
function Wizard({ apiFetch, loadSources, showToast }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ apiKey:"", url:"https://xdr.ap1.sentinelone.net", sourceName:"", port:"5514", protocol:"udp" });
  const [saving, setSaving] = useState(false);
  const [serverIp, setServerIp] = useState("YOUR_SERVER_IP");
  const steps = ["Credentials","Add Source","Done"];

  useEffect(() => {
    apiFetch("/status").then(r=>r&&r.ok?r.json():null).then(d=>{ if(d?.server_ip) setServerIp(d.server_ip); }).catch(()=>{});
  }, [apiFetch]);

  const saveCredentials = async () => {
    if (!form.apiKey || !form.url) { showToast("API key and URL required","err"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/destination", { method:"POST", body:JSON.stringify({ api_key:form.apiKey, ingest_url:form.url }) });
      if (res && res.ok) { showToast("Credentials saved"); setStep(1); }
      else showToast("Failed to save","err");
    } catch { showToast("Failed","err"); }
    setSaving(false);
  };

  const runSetup = async () => {
    if (!form.sourceName || !form.port) { showToast("Source name and port required","err"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/wizard/setup", { method:"POST", body:JSON.stringify({
        api_key: form.apiKey, ingest_url: form.url,
        source_name: form.sourceName, syslog_port: parseInt(form.port), protocol: form.protocol
      })});
      if (res && res.ok) { showToast("Setup complete"); setStep(2); if(loadSources) loadSources(); }
      else showToast("Setup had errors — check Health page","err");
    } catch { showToast("Failed","err"); }
    setSaving(false);
  };

  return (
    <div className="page-gap">
      <div className="wiz-steps">
        {steps.map((s,i)=>(
          <div key={i} className={`wiz-step ${i<step?"done":i===step?"active":"pending"}`}>
            <div className="wiz-circle">{i<step?"✓":i+1}</div>
            <span className="wiz-label">{s}</span>
            {i<steps.length-1 && <div className="wiz-line"/>}
          </div>
        ))}
      </div>

      <div className="wiz-card">
        {step===0&&(
          <>
            <div style={{fontWeight:600,marginBottom:4}}>SentinelOne Credentials</div>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Enter your SDL API key and ingest URL. Get your Write API Key from S1 Console → Settings → API Keys → Log Access Keys.</div>
            <div className="form-grid">
              <div className="fg"><label className="flabel">Write API Key *</label><input className="finput" type="password" placeholder="Paste your key" value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))}/></div>
              <div className="fg">
                <label className="flabel">Ingest URL *</label>
                <select className="fselect" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))}>
                  <option value="https://xdr.ap1.sentinelone.net">AP1 — xdr.ap1.sentinelone.net</option>
                  <option value="https://xdr.us1.sentinelone.net">US1 — xdr.us1.sentinelone.net</option>
                  <option value="https://xdr.eu1.sentinelone.net">EU1 — xdr.eu1.sentinelone.net</option>
                  <option value="https://xdr.us2.sentinelone.net">US2 — xdr.us2.sentinelone.net</option>
                </select>
              </div>
            </div>
            <div className="wiz-ftr">
              <div style={{fontSize:12,color:"var(--text3)"}}>Step 1 of 3</div>
              <button className="btn btn-primary" onClick={saveCredentials} disabled={saving||!form.apiKey}>{saving?"Saving…":"Next →"}</button>
            </div>
          </>
        )}
        {step===1&&(
          <>
            <div style={{fontWeight:600,marginBottom:4}}>Add Your First Source</div>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Configure your security device to send syslog to SecBridge.</div>
            <div className="form-grid">
              <div className="fg"><label className="flabel">Device Name *</label><input className="finput" placeholder="e.g. Sangfor NGAF Main" value={form.sourceName} onChange={e=>setForm(f=>({...f,sourceName:e.target.value}))}/></div>
              <div className="f2">
                <div className="fg"><label className="flabel">Syslog Port</label><input className="finput" value={form.port} onChange={e=>setForm(f=>({...f,port:e.target.value}))}/></div>
                <div className="fg"><label className="flabel">Protocol</label>
                  <select className="fselect" value={form.protocol} onChange={e=>setForm(f=>({...f,protocol:e.target.value}))}>
                    <option value="udp">UDP</option><option value="tcp">TCP</option>
                  </select>
                </div>
              </div>
              <div className="banner banner-blue">
                📋 Point your device syslog to: <strong style={{fontFamily:"var(--mono)",marginLeft:6}}>{serverIp}:{form.port} {form.protocol.toUpperCase()}</strong>
              </div>
            </div>
            <div className="wiz-ftr">
              <button className="btn btn-ghost" onClick={()=>setStep(0)}>← Back</button>
              <div style={{fontSize:12,color:"var(--text3)"}}>Step 2 of 3</div>
              <button className="btn btn-primary" onClick={runSetup} disabled={saving||!form.sourceName}>{saving?"Setting up…":"Finish Setup →"}</button>
            </div>
          </>
        )}
        {step===2&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>Setup Complete!</div>
            <div style={{fontSize:13,color:"var(--text2)",marginBottom:20}}>SecBridge is now collecting logs and shipping to SentinelOne SDL.</div>
            <div className="banner banner-blue" style={{textAlign:"left",marginBottom:16}}>
              <div><strong>Next steps in SentinelOne:</strong><br/>
              1. AI SIEM → Parsers → create parser for your device<br/>
              2. AI SIEM → STAR Rules → create alert rules<br/>
              3. Build a dashboard with parsed fields</div>
            </div>
            <button className="btn btn-ghost" onClick={()=>setStep(0)}>Run Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,      setAuthed]      = useState(false);
  const [user,        setUser]        = useState("");
  const [token,       setToken]       = useState("");
  const [role,        setRole]        = useState("viewer");
  const [page,        setPage]        = useState("dashboard");
  const [collapsed,   setCollapsed]   = useState(false);
  const [sources,     setSources]     = useState([]);
  const [agentStatus, setAgentStatus] = useState(null);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Restore session
  useEffect(() => {
    const t = localStorage.getItem("sb_token");
    const u = localStorage.getItem("sb_user");
    const r = localStorage.getItem("sb_role");
    if (!t) return;
    fetch(`${API}/status`, { headers:{ "Authorization":"Bearer "+t } })
      .then(res => {
        if (res.ok || res.status === 200) {
          setToken(t); if(u) setUser(u); if(r) setRole(r); setAuthed(true);
        } else {
          localStorage.removeItem("sb_token");
          localStorage.removeItem("sb_user");
          localStorage.removeItem("sb_role");
        }
      })
      .catch(() => {
        localStorage.removeItem("sb_token");
      });
  }, []);

  const ah = useCallback(() => ({
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  }), [token]);

  const apiFetch = useCallback(async (path, opts={}) => {
    const headers = { ...ah(), ...(opts.headers||{}) };
    if (opts.body instanceof FormData) delete headers["Content-Type"];
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    if (res.status === 401) { setAuthed(false); return null; }
    return res;
  }, [ah]);

  const loadSources = useCallback(async () => {
    try {
      const res = await apiFetch("/sources");
      if (res && res.ok) setSources(await res.json());
      else setSources([]);
    } catch { setSources([]); }
  }, [apiFetch]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/status");
      if (res && res.ok) setAgentStatus(await res.json());
    } catch {}
  }, [apiFetch]);

  useEffect(() => {
    if (authed) { loadSources(); loadStatus(); }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const t1 = setInterval(loadSources, 15000);
    const t2 = setInterval(loadStatus, 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [authed, loadSources, loadStatus]);

  const handleLogin = (u, tok, r) => {
    setUser(u); setToken(tok); setRole(r); setAuthed(true);
    localStorage.setItem("sb_token", tok);
    localStorage.setItem("sb_user", u);
    localStorage.setItem("sb_role", r);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    try { await apiFetch("/logout", { method:"POST" }); } catch {}
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_user");
    localStorage.removeItem("sb_role");
    setAuthed(false); setToken(""); setUser(""); setSources([]); setAgentStatus(null);
  };

  if (!authed) return <><style>{CSS}</style><Login onLogin={handleLogin}/></>;

  const isAdmin = role === "admin";
  const agentOk = agentStatus?.agent_running;
  const cur = TITLES[page] || TITLES["dashboard"];

  const allNav = [...NAV, ...(isAdmin ? NAV_ADMIN : [])];

  return (
    <>
      <style>{CSS}</style>
      {toast && (
        <div className={`toast ${toast.type==="err"?"toast-err":"toast-ok"}`}>
          {toast.type==="err"?"✗":"✓"} {toast.msg}
        </div>
      )}
      <div className="shell">
        <aside className={`sidebar ${collapsed?"collapsed":""}`}>
          <div className="sb-header">
            <div className="sb-brand">
              <div className="sb-icon">⬡</div>
              <div className="sb-text">
                <div className="sb-name">SecBridge</div>
                <div className="sb-ver">v3.2</div>
              </div>
            </div>
            <button className="hbtn" onClick={()=>setCollapsed(v=>!v)}>
              {collapsed?"→":"←"}
            </button>
          </div>

          <nav className="sb-nav">
            {NAV.map(item => (
              <button key={item.id}
                className={`nav-item ${page===item.id?"active":""}`}
                onClick={()=>setPage(item.id)}
                title={collapsed?item.label:""}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
            {isAdmin && (
              <>
                <div className="nav-sep"/>
                {NAV_ADMIN.map(item => (
                  <button key={item.id}
                    className={`nav-item ${page===item.id?"active":""}`}
                    onClick={()=>setPage(item.id)}
                    title={collapsed?item.label:""}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                ))}
              </>
            )}
          </nav>

          <div className="sb-footer">
            <div className="agent-pill">
              <div className="agent-dot" style={{background:agentOk?"var(--green)":"var(--red)"}}/>
              <div className="agent-txt">
                <div className="agent-status" style={{color:agentOk?"var(--green)":"var(--red)"}}>
                  {agentOk?"Agent running":"Agent stopped"}
                </div>
                <div className="agent-label">scalyr-agent-2</div>
              </div>
            </div>
          </div>
        </aside>

        <main className={`main ${collapsed?"expanded":""}`}>
          <div className="topbar">
            <div>
              <div className="page-title">{cur.t}</div>
              <div className="page-sub">{cur.s}</div>
            </div>
            <div className="topbar-r">
              <div className="user-chip">
                <div className="role-dot" style={{background:role==="admin"?"var(--red)":role==="analyst"?"var(--blue)":"var(--text3)"}}/>
                {user} · {role}
              </div>
              <button className="logout-btn" onClick={handleLogout}>Sign out</button>
            </div>
          </div>

          <div className="content">
            {page==="dashboard"   && <Dashboard    sources={sources} agentStatus={agentStatus}/>}
            {page==="sources"     && <Sources       sources={sources} apiFetch={apiFetch} loadSources={loadSources} showToast={showToast}/>}
            {page==="logs"        && <LogViewer     sources={sources} apiFetch={apiFetch}/>}
            {page==="health"      && <Health        sources={sources} apiFetch={apiFetch} showToast={showToast}/>}
            {page==="destination" && <Destination   apiFetch={apiFetch} showToast={showToast}/>}
            {page==="parsers"     && <Parsers       apiFetch={apiFetch} showToast={showToast}/>}
            {page==="pipeline"    && <Pipeline      sources={sources} apiFetch={apiFetch}/>}
            {page==="users"       && isAdmin && <Users   apiFetch={apiFetch} showToast={showToast}/>}
            {page==="backup"      && isAdmin && <Backup  apiFetch={apiFetch} showToast={showToast} token={token}/>}
            {page==="wizard"      && isAdmin && <Wizard  apiFetch={apiFetch} loadSources={loadSources} showToast={showToast}/>}
          </div>
        </main>
      </div>
    </>
  );
}
