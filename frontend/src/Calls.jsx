import { useEffect, useState } from "react";
import { API_BASE as API } from "./config";
import { useNavigate } from "react-router-dom";
export default function Calls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      const [historyRes, settingsRes] = await Promise.all([
        fetch(`${API}/api/call-history`, { credentials: "include" }),
        fetch(`${API}/api/call-history/settings`, { credentials: "include" })
      ]);
      if (historyRes.status === 401 || settingsRes.status === 401) { navigate("/login"); return; }
      if (!historyRes.ok || !settingsRes.ok) throw new Error("Call history load nahi hui. Backend check karo.");
      setCalls(await historyRes.json()); setDays((await settingsRes.json()).retentionDays);
    } catch (e) { setMessage(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function saveDays(value) {
    setDays(value); setMessage("");
    try {
      const r = await fetch(`${API}/api/call-history/settings`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ retentionDays: value }) });
      if (!r.ok) throw new Error("Setting save nahi hui.");
      setMessage("Call history auto-delete setting saved. Ye setting aage record hone wali calls par apply hogi.");
    } catch (e) { setMessage(e.message); }
  }
  const date = v => v ? new Date(v).toLocaleString() : "—";
  return <main className="calls-page"><style>{`.calls-page{min-height:100vh;padding:24px;background:var(--app-bg,#0b141a);color:var(--app-text,#e9edef);font-family:Arial,sans-serif}.calls-wrap{max-width:850px;margin:auto}.calls-card{background:var(--panel-bg,#111b21);border:1px solid var(--panel-border,#26353d);border-radius:15px;padding:20px;margin-top:18px}.calls-btn{border:0;border-radius:9px;padding:11px 15px;background:#00a884;color:#062f26;font-weight:800;cursor:pointer}.calls-select{padding:11px;border-radius:9px;background:var(--field-bg,#202c33);color:var(--app-text,#e9edef);border:1px solid var(--panel-border,#35434a)}.calls-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--panel-border,#26353d)}.calls-muted{color:var(--muted-text,#9eacb4);font-size:13px;line-height:1.6}`}</style><div className="calls-wrap"><button className="calls-btn" onClick={() => navigate("/home")}>← Home</button><h1>📞 Call history</h1><p className="calls-muted">Incoming, outgoing, missed aur completed calls yahan milengi. Call history ka section profile se alag rakha gaya hai.</p><section className="calls-card"><h2 style={{marginTop:0}}>Automatic deletion</h2><label htmlFor="call-retention">Call records delete honge:</label> <select id="call-retention" className="calls-select" value={days} onChange={e => saveDays(Number(e.target.value))}><option value={1}>1 day baad</option><option value={7}>7 days baad</option><option value={30}>30 days baad</option><option value={90}>90 days baad</option><option value={0}>Never</option></select><p className="calls-muted">Ye preference tumhari profile setting se alag hai. New call records ke liye selected duration use hoga.</p>{message && <p className="calls-muted">{message}</p>}</section><section className="calls-card"><h2 style={{marginTop:0}}>Recent calls</h2>{loading ? <p className="calls-muted">Loading…</p> : calls.length === 0 ? <p className="calls-muted">Abhi koi call record nahi hai.</p> : calls.map(c => <div className="calls-row" key={c.id}><div><strong>{c.direction === "outgoing" ? "↗ Outgoing" : "↙ Incoming"} {c.mode === "video" ? "🎥" : "📞"} · {c.username}</strong><div className="calls-muted">{c.outcome} · {c.endedAt ? `Ended ${date(c.endedAt)}` : "Call time " + date(c.startedAt)}</div></div><time className="calls-muted">{date(c.startedAt)}</time></div>)}</section></div></main>;
}
