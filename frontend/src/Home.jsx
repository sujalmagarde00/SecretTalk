import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE as API, WS_URL } from "./config";
import { useNavigate } from "react-router-dom";


export default function Home() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("secretalkTheme") || "dark");
  const [unreadCount, setUnreadCount] = useState(0);
  const [popupMessage, setPopupMessage] = useState("");
  const [selectedChats, setSelectedChats] = useState([]);
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/chat/conversations`, { credentials: "include" });
      if (response.status === 401 || response.status === 403) { navigate("/login", { replace: true }); return; }
      if (!response.ok) throw new Error("Chats could not be loaded");
      setConversations(await response.json());
    } catch (e) { setError(e.message); }
  }, [navigate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("secretalkTheme", theme);
  }, [theme]);

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: "include" })
      .then(async (r) => { if (!r.ok) throw new Error("Please login first"); return r.json(); })
      .then((data) => setMe(data))
      .catch(() => navigate("/login", { replace: true, state: { message: "Please login to continue." } }));
    loadConversations();
    const timer = setInterval(loadConversations, 5000);
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat") {
          loadConversations();
          const msg = data.message || data;
          if (!me || String(msg.senderId) !== String(me.id)) {
            setUnreadCount(n => n + 1);
            setPopupMessage(`New message from ${msg.senderUsername || "someone"}`);
            if ("Notification" in window && Notification.permission === "granted") {
              try { new Notification(`SecretTalk · ${msg.senderUsername || "New message"}`, { body: msg.content || (msg.attachmentName ? `📎 ${msg.attachmentName}` : "New message") }); } catch {}
            }
            window.setTimeout(() => setPopupMessage(""), 4500);
          }
        }
      } catch {}
    };
    return () => { clearInterval(timer); socket.close(); };
  }, [navigate, loadConversations, me]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`${API}/api/users/search?username=${encodeURIComponent(q)}`, { signal: controller.signal, credentials: "include" });
        if (!response.ok) throw new Error("Users search nahi ho paaya. Backend check karo.");
        const data = await response.json();
        setResults(data.filter((user) => user.username?.toLowerCase() !== me?.username?.toLowerCase()));
      } catch (e) { if (e.name !== "AbortError") setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, me]);

  async function enableNotifications() {
    if (!("Notification" in window)) { setNotice("Is browser mein notifications support nahi hain."); return; }
    const permission = await Notification.requestPermission();
    setNotice(permission === "granted" ? "Notifications enabled hain." : "Browser settings mein notifications allow karo.");
  }

  function startLongPress(userId) {
    longPressTriggered.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedChats(old => old.includes(userId) ? old : [...old, userId]);
    }, 550);
  }
  function endLongPress() { window.clearTimeout(pressTimer.current); }
  function toggleChatSelection(userId) {
    setSelectedChats(old => old.includes(userId) ? old.filter(id => id !== userId) : [...old, userId]);
  }
  async function deleteSelectedChats() {
    if (!selectedChats.length) return;
    if (!window.confirm(`Clear ${selectedChats.length} selected chat(s) from your view? Old messages will be hidden only for your account.`)) return;
    try {
      for (const userId of selectedChats) {
        const response = await fetch(`${API}/api/chat/conversations/${userId}`, { method: "DELETE", credentials: "include" });
        if (!response.ok) throw new Error("Some chats could not be cleared.");
      }
      setSelectedChats([]); await loadConversations(); setNotice("Selected chats cleared from your account.");
    } catch (e) { setError(e.message); }
  }

  async function logout() {
    try { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }); }
    finally { sessionStorage.removeItem("secretalkUser"); navigate("/login", { replace: true }); }
  }

  const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return <main className="wa-home">
    <style>{`
      *{box-sizing:border-box}.wa-home{min-height:100vh;background:#0b141a;color:#e9edef;font-family:Arial,sans-serif;padding:0 18px 28px}
      .wa-top{max-width:1120px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:24px 4px 20px;gap:16px}.wa-brand{display:flex;align-items:center;gap:12px;font-size:25px;font-weight:800}.wa-logo{width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:#00a884;color:#052e26;font-size:23px}.wa-top button{background:#202c33;color:#e9edef;border:1px solid #35434a;padding:11px 15px;border-radius:10px;font-weight:700;cursor:pointer}
      .wa-layout{max-width:1120px;margin:auto;display:grid;grid-template-columns:minmax(300px,390px) minmax(0,1fr);min-height:650px;height:calc(100vh - 115px);max-height:850px;border:1px solid #26353d;border-radius:12px;overflow:hidden;background:#111b21}.wa-sidebar{border-right:1px solid #26353d;min-width:0;display:flex;flex-direction:column}.wa-sidebar-head{padding:20px 18px 14px;font-size:21px;font-weight:750}.wa-search{margin:0 14px 14px;width:calc(100% - 28px);background:#202c33;border:1px solid #2d3b43;border-radius:9px;color:#e9edef;padding:13px 14px;outline:none;font-size:14px}.wa-search:focus{border-color:#00a884}.wa-list{overflow:auto;flex:1}.wa-row{width:100%;display:flex;align-items:center;gap:13px;padding:14px 16px;background:transparent;border:0;border-top:1px solid #1e2b32;text-align:left;color:inherit;cursor:pointer}.wa-row:hover{background:#202c33}.wa-avatar{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:#55666f;color:#f4f7f8;font-size:19px;font-weight:700}.wa-row-main{min-width:0;flex:1}.wa-row-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.wa-row-line strong{font-size:15px;font-weight:650;overflow-wrap:anywhere}.wa-row-line time{font-size:11px;color:#86969e;white-space:nowrap}.wa-preview{font-size:13px;color:#9eacb4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:7px}.wa-results{padding:0 12px 12px}.wa-results button{width:100%;display:flex;align-items:center;gap:12px;padding:12px;background:#1b292f;border:0;border-radius:8px;color:#e9edef;text-align:left;margin-top:7px;cursor:pointer}.wa-results small{display:block;color:#9eacb4;margin-top:4px}.wa-muted{padding:20px;color:#899aa2;font-size:13px;line-height:1.6}.wa-main{display:flex;align-items:center;justify-content:center;text-align:center;padding:32px;background:radial-gradient(ellipse at center,#17262e 0%,#111b21 70%)}.wa-welcome{max-width:460px}.wa-welcome-icon{font-size:66px;margin-bottom:18px}.wa-welcome h1{font-size:28px;font-weight:350;margin:0 0 14px}.wa-welcome p{color:#9eacb4;line-height:1.8;font-size:14px}.wa-greenline{height:4px;background:#00a884;border-radius:3px;width:120px;margin:30px auto 0}.wa-error{color:#ff9b9b;padding:10px 16px;font-size:12px}@media(max-width:760px){.wa-home{padding:0 0 15px}.wa-top{padding:16px}.wa-layout{display:block;height:auto;min-height:calc(100vh - 90px);border-radius:0;border-left:0;border-right:0}.wa-sidebar{min-height:calc(100vh - 90px);border-right:0}.wa-main{display:none}.wa-sidebar-head{padding-top:14px}.wa-brand{font-size:22px}}
      :root[data-theme="light"] .wa-home{background:#f0f2f5;color:#17252b}.wa-home :is(.wa-layout,.wa-sidebar){background:#fff;border-color:#d9e1e5}.wa-home .wa-row{color:#17252b;border-color:#e7ecef}.wa-home .wa-row:hover{background:#f2f6f7}.wa-home .wa-search,.wa-home .wa-results button{background:#f0f2f5;color:#17252b;border-color:#d9e1e5}.wa-home .wa-preview,.wa-home .wa-row-line time,.wa-home .wa-muted{color:#647780}.wa-home .wa-main{background:radial-gradient(ellipse at center,#f5f8f9 0%,#fff 70%)}.wa-home .wa-welcome p{color:#647780}.wa-home .wa-top button{background:#fff;color:#17252b;border-color:#d9e1e5}.wa-home .wa-results small{color:#647780}.wa-home .wa-avatar{background:#d8e8e4;color:#11634f}.wa-home .wa-sidebar-head{color:#17252b}
    `}</style>
    <header className="wa-top"><div className="wa-brand"><div className="wa-logo">S</div><span>SecretTalk</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}><button onClick={enableNotifications}>🔔 Notifications{unreadCount>0?` (${unreadCount})`:""}</button><button onClick={()=>navigate("/calls")}>📞 Calls</button><button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>{theme==="dark"?"☀️ Light mode":"🌙 Dark mode"}</button><button onClick={()=>navigate("/profile/me")}>👤 Profile</button><button onClick={logout}>Log out ↗</button></div></header>{notice&&<div style={{maxWidth:1120,margin:"-8px auto 12px",color:"#8ee9c8",fontSize:12}}>{notice}</div>}{popupMessage&&<button onClick={()=>{setPopupMessage("");setUnreadCount(0)}} style={{position:"fixed",right:20,top:18,zIndex:30,padding:"14px 18px",borderRadius:12,border:"1px solid #00a884",background:theme==="dark"?"#173b32":"#e0f5ed",color:theme==="dark"?"#e9edef":"#15392f",boxShadow:"0 8px 30px #0003",cursor:"pointer"}}>🔔 {popupMessage} · {unreadCount} new · Click to clear</button>}
    <section className="wa-layout">
      <aside className="wa-sidebar">
        <div className="wa-sidebar-head">Chats <span style={{fontSize:12,color:"#8fa1a9",fontWeight:400}}>{me ? `· ${me.username}` : ""}</span>{selectedChats.length>0&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,fontSize:12}}><span>{selectedChats.length} selected</span><button style={{padding:"7px 9px"}} onClick={()=>setSelectedChats(selectedChats.length===conversations.length?[]:conversations.map(c=>c.userId))}>{selectedChats.length===conversations.length?"Deselect all":"Select all"}</button><button style={{padding:"7px 9px",background:"#a61b3b",color:"white"}} onClick={deleteSelectedChats}>🗑 Clear chats</button><button style={{padding:"7px 9px"}} onClick={()=>setSelectedChats([])}>Cancel</button></div>}</div>
        <input className="wa-search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search username or start new chat" aria-label="Search users" />
        {query.trim() && <div className="wa-results">{loading && <div className="wa-muted">Searching…</div>}{!loading && results.length===0 && <div className="wa-muted">No users found.</div>}{results.map((user)=><button key={user.id} onClick={()=>navigate(`/chat/${user.id}`)}><div className="wa-avatar">{(user.displayName||user.username)?.charAt(0).toUpperCase()}</div><div><strong>{user.displayName||user.username}</strong><small>{user.online?"● Online":user.lastSeenAt?`Last seen ${new Date(user.lastSeenAt).toLocaleString()}`:"Offline"} · Start chat</small></div></button>)}</div>}
        <div className="wa-list">{conversations.map((c)=><button className="wa-row" key={c.userId} onPointerDown={()=>startLongPress(c.userId)} onPointerUp={endLongPress} onPointerLeave={endLongPress} onContextMenu={e=>{e.preventDefault();setSelectedChats(old=>old.includes(c.userId)?old:[...old,c.userId])}} onClick={()=>{if(longPressTriggered.current){longPressTriggered.current=false;return;}if(selectedChats.length){toggleChatSelection(c.userId);return;}setUnreadCount(0);setPopupMessage("");navigate(`/chat/${c.userId}`)}} style={{background:selectedChats.includes(c.userId)?(theme==="dark"?"#23483f":"#dff5ed"):undefined}}>{selectedChats.length>0&&<input type="checkbox" readOnly checked={selectedChats.includes(c.userId)} style={{accentColor:"#00a884"}}/>}<div className="wa-avatar">{c.username?.charAt(0).toUpperCase()}</div><div className="wa-row-main"><div className="wa-row-line"><strong>{c.username}</strong><time>{formatTime(c.lastMessageAt)}</time></div><div className="wa-preview">{c.lastMessage || "Attachment"}</div></div></button>)}{conversations.length===0 && !query.trim() && <div className="wa-muted">Abhi koi chat nahi hai. Upar search karke kisi username ko select karo.</div>}</div>
        {error && <div className="wa-error">{error}</div>}
      </aside>
      <section className="wa-main"><div className="wa-welcome"><div className="wa-welcome-icon">💬</div><h1>Private conversations, made simple</h1><p>Chat with your friends, send attachments, and make audio or video calls. Select a conversation from the left or search for a username to get started.</p><div className="wa-greenline"/></div></section>
    </section>
  </main>;
}
