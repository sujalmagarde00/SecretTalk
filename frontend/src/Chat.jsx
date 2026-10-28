import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE as API, WS_URL } from "./config";
import { useNavigate, useParams } from "react-router-dom";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export default function Chat() {
  const { id } = useParams();
  const peerId = Number(id);
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [expiryMode, setExpiryMode] = useState("NEVER");
  const [customMinutes, setCustomMinutes] = useState("5");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const seenSentRef = useRef(new Set());
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callMode, setCallMode] = useState("audio");
  const [incoming, setIncoming] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1);
  const [dataSaver, setDataSaver] = useState(true);
  const [callPanelPos, setCallPanelPos] = useState(null);
  const dragRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const bottomRef = useRef(null);
  const pendingIceRef = useRef([]);

  const sendSignal = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ recipientId: peerId, ...payload }));
    else setError("Chat server se connection nahi hai. Page refresh karke try karo.");
  }, [peerId]);

  const stopCall = useCallback(() => {
    if (peerConnectionRef.current) { peerConnectionRef.current.ontrack = null; peerConnectionRef.current.onicecandidate = null; peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((track) => track.stop()); localStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIncoming(null); setCallState("idle"); setMicMuted(false); setCameraOff(false); pendingIceRef.current = [];
  }, []);

  const getMedia = useCallback(async (mode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: mode === "video" ? (dataSaver
        ? { width: { ideal: 320, max: 480 }, height: { ideal: 240, max: 360 }, frameRate: { ideal: 12, max: 15 }, facingMode: "user" }
        : { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: "user" }) : false
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [dataSaver]);

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    // Limit outgoing video bitrate for lower data use, especially on mobile networks.
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const parameters = sender.getParameters();
        parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
        parameters.encodings[0].maxBitrate = dataSaver ? 250000 : 700000;
        parameters.encodings[0].maxFramerate = dataSaver ? 12 : 24;
        sender.setParameters(parameters).catch(() => {});
      }
    }
    pc.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
    pc.onicecandidate = (event) => { if (event.candidate) sendSignal({ type: "call-ice", payload: event.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (["failed", "disconnected", "closed"].includes(pc.connectionState)) { if (pc.connectionState !== "closed") setError("Call connection lost. Try calling again."); stopCall(); } };
    return pc;
  }, [sendSignal, stopCall, dataSaver]);

  useEffect(() => {
    let active = true;
    fetch(`${API}/api/auth/me`, { credentials: "include" }).then(async (r) => { if (!r.ok) throw new Error("Please login"); return r.json(); }).then((data) => { if (active) setMe(data); }).catch(() => navigate("/login", { replace: true }));
    fetch(`${API}/api/users/${peerId}`, { credentials: "include" }).then(async (r) => { if (!r.ok) throw new Error("User not found"); return r.json(); }).then((data) => { if (active) setPeer(data); }).catch((e) => { if (active) setError(e.message); });
    fetch(`${API}/api/chat/${peerId}/messages`, { credentials: "include" }).then(async (r) => { if (r.status === 401 || r.status === 403) { navigate("/login", { replace: true }); throw new Error("Login required"); } if (!r.ok) throw new Error("Chat history could not load"); return r.json(); }).then((data) => { if (active) setMessages(data); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [peerId, navigate]);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    socket.onopen = () => setStatus("Connected");
    socket.onclose = () => setStatus("Disconnected · refresh to reconnect");
    socket.onerror = () => setStatus("Connection error");
    socket.onmessage = async (event) => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === "error") { setError(data.message || "Something went wrong"); return; }
      if (data.type === "connected") return;
      if (data.type === "presence" && String(data.userId) === String(peerId)) {
        setPeer((old) => old ? { ...old, online: !!data.online, lastSeenAt: data.lastSeenAt || old.lastSeenAt } : old); return;
      }
      if (data.type === "message-seen") { setMessages((old) => old.map((m) => String(m.id) === String(data.messageId) ? { ...m, seenAt: data.seenAt } : m)); return; }
      if (data.type === "chat") {
        const message = data.message || data;
        setMessages((old) => old.some((m) => m.id && m.id === message.id) ? old : [...old, message]);
        if ((document.hidden || String(message.senderId) !== String(peerId)) && "Notification" in window && Notification.permission === "granted") {
          try { new Notification(`SecretTalk · ${message.senderUsername || "New message"}`, { body: message.content || (message.attachmentName ? `📎 ${message.attachmentName}` : "New message") }); } catch {}
        }
        return;
      }
      if (data.type === "message-deleted") {
        setMessages((old) => old.filter((m) => String(m.id) !== String(data.messageId)));
        return;
      }
      if (data.senderId !== peerId) return;
      try {
        if (data.type === "call-offer") {
          setCallMode(data.mode || "audio"); setIncoming({ senderId: data.senderId, senderUsername: data.senderUsername, description: data.payload, mode: data.mode || "audio" }); setCallState("incoming");
        } else if (data.type === "call-answer") {
          if (peerConnectionRef.current && data.payload) { await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.payload)); for (const candidate of pendingIceRef.current) await peerConnectionRef.current.addIceCandidate(candidate); pendingIceRef.current = []; setCallState("active"); }
        } else if (data.type === "call-ice") {
          const candidate = new RTCIceCandidate(data.payload);
          if (peerConnectionRef.current?.remoteDescription) await peerConnectionRef.current.addIceCandidate(candidate);
          else pendingIceRef.current.push(candidate);
        } else if (data.type === "call-end" || data.type === "call-reject") {
          stopCall(); setError(data.type === "call-reject" ? "The call was declined." : "Call ended.");
        }
      } catch (e) { setError(`Call setup failed: ${e.message}`); stopCall(); }
    };
    return () => { socket.close(); if (socketRef.current === socket) socketRef.current = null; stopCall(); };
  }, [peerId, stopCall]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const pc = peerConnectionRef.current;
    if (!pc || callState === "idle") return;
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== "video") continue;
      const parameters = sender.getParameters();
      parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
      parameters.encodings[0].maxBitrate = dataSaver ? 250000 : 700000;
      parameters.encodings[0].maxFramerate = dataSaver ? 12 : 24;
      sender.setParameters(parameters).catch(() => {});
    }
  }, [dataSaver, callState]);

  useEffect(() => {
    const incomingIds = messages.filter((m) => String(m.senderId) === String(peerId) && m.id && !m.seenAt && !seenSentRef.current.has(m.id)).map((m) => m.id);
    if (!incomingIds.length) return;
    incomingIds.forEach((messageId) => seenSentRef.current.add(messageId));
    const timer = setTimeout(() => {
      sendSignal({ type: "seen", messageIds: incomingIds });
    }, 650);
    return () => clearTimeout(timer);
  }, [messages, peerId, sendSignal]);

  useEffect(() => {
    const timer = setInterval(() => setMessages((old) => old.filter((m) => !m.expiresAt || new Date(m.expiresAt).getTime() > Date.now())), 1000);
    return () => clearInterval(timer);
  }, []);

  function startDrag(event) {
    if (event.target.closest("button,input,select")) return;
    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    setCallPanelPos({ left: rect.left, top: rect.top });
    event.preventDefault();
  }
  useEffect(() => {
    function move(event) { if (dragRef.current) setCallPanelPos({ left: Math.max(0, Math.min(window.innerWidth - 280, event.clientX - dragRef.current.dx)), top: Math.max(0, Math.min(window.innerHeight - 150, event.clientY - dragRef.current.dy)) }); }
    function up() { dragRef.current = null; }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  async function startCall(mode) {
    setError(""); setCallMode(mode); setCallState("calling");
    try {
      const stream = await getMedia(mode);
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      sendSignal({ type: "call-offer", mode, payload: pc.localDescription.toJSON() });
    } catch (e) { stopCall(); setError(e.name === "NotAllowedError" ? "Camera/microphone permission denied. Browser settings mein permission allow karo." : `Call start nahi hui: ${e.message}`); }
  }

  async function acceptCall() {
    if (!incoming) return;
    try {
      const offer = incoming.description; const mode = incoming.mode;
      const stream = await getMedia(mode); const pc = createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const candidate of pendingIceRef.current) await pc.addIceCandidate(candidate);
      pendingIceRef.current = [];
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      sendSignal({ type: "call-answer", mode, payload: pc.localDescription.toJSON() });
      setIncoming(null); setCallState("active");
    } catch (e) { setError(`Call accept nahi hui: ${e.message}`); stopCall(); }
  }

  function endCall(reject = false) {
    sendSignal({ type: reject ? "call-reject" : "call-end", mode: callMode });
    stopCall();
  }

  function toggleMic() {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    tracks.forEach((track) => { track.enabled = !track.enabled; }); setMicMuted(tracks.length ? !tracks[0].enabled : false);
  }
  function toggleCamera() {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    tracks.forEach((track) => { track.enabled = !track.enabled; }); setCameraOff(tracks.length ? !tracks[0].enabled : false);
  }

  function sendMessage(event) {
    event.preventDefault(); const content = text.trim();
    if (!content) return;
    if (expiryMode === "CUSTOM" && (!Number.isFinite(Number(customMinutes)) || Number(customMinutes) < 1 || Number(customMinutes) > 43200)) { setError("Custom time 1 minute se 30 days ke beech rakho."); return; }
    if (socketRef.current?.readyState !== WebSocket.OPEN) { setError("Chat server disconnected hai."); return; }
    sendSignal({ type: "chat", content, expiryMode, customSeconds: expiryMode === "CUSTOM" ? Number(customMinutes) * 60 : undefined }); setText("");
  }

  async function uploadAttachment(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (expiryMode === "CUSTOM" && (!Number.isFinite(Number(customMinutes)) || Number(customMinutes) < 1 || Number(customMinutes) > 43200)) { setError("Custom time 1 minute se 30 days ke beech rakho."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Attachment 10 MB se chhota hona chahiye."); return; }
    const form = new FormData(); form.append("file", file); form.append("expiryMode", expiryMode);
    if (expiryMode === "CUSTOM") form.append("customSeconds", String(Number(customMinutes) * 60));
    setUploading(true); setError("");
    try {
      const response = await fetch(`${API}/api/chat/${peerId}/attachments`, { method: "POST", credentials: "include", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Attachment upload nahi hua.");
      setMessages((old) => old.some((m) => m.id === data.id) ? old : [...old, data]);
      sendSignal({ type: "attachment-notify", messageId: data.id });
    } catch (e) { setError(e.message || "Attachment upload failed"); }
    finally { setUploading(false); }
  }

  function deleteMessage(messageId) {
    sendSignal({ type: "delete-message", messageId });
  }

  const styles = `*{box-sizing:border-box}.chat-page{height:100vh;min-height:560px;background:#101321;color:#f8fafc;font-family:Inter,Arial,sans-serif;padding:18px;display:flex;align-items:center;justify-content:center}.chat-shell{width:min(1100px,100%);height:min(900px,100%);min-height:520px;display:flex;flex-direction:column;border:1px solid #35344f;border-radius:22px;overflow:hidden;background:#191c2f;box-shadow:0 25px 70px #0005}.chat-header{display:flex;align-items:center;gap:13px;padding:16px 20px;background:#1e2037;border-bottom:1px solid #35344f}.chat-back{border:0;background:#30314c;color:#fff;border-radius:11px;padding:10px 13px}.chat-avatar{width:43px;height:43px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#a855f7,#536dfe);font-weight:800;font-size:18px}.chat-title{flex:1;min-width:0}.chat-title strong{display:block;overflow-wrap:anywhere}.chat-status{font-size:12px;color:${status === "Connected" ? "#86efac" : "#fbbf24"};margin-top:4px}.chat-call-buttons{display:flex;gap:8px}.chat-call-buttons button,.chat-controls button{border:1px solid #464664;background:#292b45;color:white;border-radius:11px;padding:10px 12px;font-weight:700}.chat-call-buttons button:hover,.chat-controls button:hover{background:#3b3d5c}.chat-messages{flex:1;overflow-y:auto;padding:22px;display:flex;flex-direction:column;gap:12px;background:radial-gradient(circle at top,#242344,transparent 45%),#151729}.chat-date{text-align:center;color:#8d92ad;font-size:11px;margin-bottom:8px}.chat-bubble{max-width:min(75%,600px);padding:12px 15px;border-radius:16px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}.chat-bubble.mine{align-self:flex-end;background:linear-gradient(135deg,#7658e8,#5645c7);border-bottom-right-radius:5px}.chat-bubble.theirs{align-self:flex-start;background:#292b45;border:1px solid #393b58;border-bottom-left-radius:5px}.chat-time{display:block;text-align:right;font-size:10px;color:#d0caff;margin-top:5px;opacity:.8}.chat-compose{display:flex;gap:8px;padding:12px;border-top:1px solid #35344f;background:#1c1e32;align-items:center;flex-wrap:wrap}.chat-compose input[type=text]{flex:1;min-width:120px;border:1px solid #3b405b;border-radius:13px;padding:13px 15px;background:#15182a;color:white;outline:none}.chat-compose button{border:0;border-radius:12px;padding:12px 14px;background:linear-gradient(100deg,#9333ea,#526dfe);color:white;font-weight:800;cursor:pointer}.chat-compose button:disabled{opacity:.5}.chat-compose select,.chat-compose input[type=number]{border:1px solid #3b405b;border-radius:10px;padding:10px;background:#15182a;color:white;max-width:140px}.chat-expiry{display:flex;align-items:center;gap:6px;color:#a7adc4;font-size:11px;width:100%;flex-wrap:wrap}.chat-file-link{display:inline-block;color:#d7d3ff;text-decoration:underline;overflow-wrap:anywhere}.chat-attachment-preview{max-width:220px;max-height:180px;border-radius:9px;display:block;margin-bottom:5px}.chat-delete{border:0;background:transparent;color:#e5a3b0;font-size:10px;cursor:pointer;margin-left:10px}.chat-empty{margin:auto;text-align:center;max-width:360px;color:#9ca3bd;line-height:1.7}.chat-error{padding:9px 16px;background:#4b1d35;color:#fecdd3;font-size:12px}.call-overlay{position:fixed;inset:0;background:transparent;z-index:10;pointer-events:none;padding:0}.call-card{pointer-events:auto;position:fixed;right:18px;bottom:18px;width:min(410px,calc(100vw - 24px));max-height:82vh;overflow:auto;padding:15px;background:#191c2ff5;border:1px solid #65658b;border-radius:18px;text-align:center;box-shadow:0 18px 60px #0009;resize:both}.call-drag-handle{cursor:move;user-select:none;touch-action:none;padding:7px;margin:-5px -4px 6px;border-radius:8px;background:#242641;color:#c7c9df;font-size:12px;font-weight:700}.call-videos{overflow:hidden}.call-videos video{transition:transform .12s ease}.call-card h2{margin:8px 0}.call-card p{color:#a7adc4}.call-videos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.call-videos video{width:100%;height:260px;background:#080a14;object-fit:cover;border-radius:15px}.call-controls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.call-controls button{border:0;border-radius:12px;padding:12px 18px;background:#393b59;color:white;font-weight:700}.call-controls .danger{background:#dc365c}.call-controls .accept{background:#16a36d}.call-note{color:#9ca3bd;font-size:12px;margin-top:12px}@media(max-width:620px){.call-card{right:8px;bottom:8px;width:min(380px,calc(100vw - 16px));max-height:75vh}.chat-page{padding:0;min-height:100vh;height:100dvh}.chat-shell{height:100%;min-height:0;border-radius:0;border:0}.chat-header{padding:12px}.chat-call-buttons{gap:5px}.chat-call-buttons button{font-size:12px;padding:9px 8px}.chat-messages{padding:15px}.chat-bubble{max-width:88%}.call-videos{grid-template-columns:1fr}.call-videos video{height:190px}.chat-compose{padding:10px}.chat-compose button{padding:0 14px}}`;

  return <main className="chat-page"><style>{styles}</style><section className="chat-shell">
    <header className="chat-header"><button className="chat-back" onClick={()=>navigate("/home")}>←</button><div className="chat-avatar">{peer?.username?.charAt(0).toUpperCase() || "?"}</div><div className="chat-title"><strong>{peer?.displayName || peer?.username || "Loading user…"}</strong><div className="chat-status"><span style={{color:peer?.online?"#86efac":"#9ca3bd"}}>{peer?.online?"● Online":peer?.lastSeenAt?`Last seen ${new Date(peer.lastSeenAt).toLocaleString()}`:"Offline"}</span> · {status}</div></div><div className="chat-call-buttons"><button onClick={()=>startCall("audio")} disabled={callState!=="idle"}>📞 Audio</button><button onClick={()=>startCall("video")} disabled={callState!=="idle"}>🎥 Video</button></div></header>
    {error && <div className="chat-error">{error}<button style={{float:"right",background:"transparent",border:0,color:"inherit"}} onClick={()=>setError("")}>×</button></div>}
    <div className="chat-messages">{messages.length===0?<div className="chat-empty"><div style={{fontSize:38,marginBottom:10}}>💬</div><strong>Your private conversation starts here.</strong><br/>Send a message below or start an audio/video call.</div>:messages.map((m,index)=>{const mine=String(m.senderId)===String(me?.id);return <div key={m.id || `${m.createdAt}-${index}`} className={`chat-bubble ${mine?"mine":"theirs"}`}>{m.attachmentName ? <><a className="chat-file-link" href={`${API}/api/chat/attachments/${m.id}`} target="_blank" rel="noreferrer">📎 {m.attachmentName}</a><div style={{fontSize:10,opacity:.75,marginTop:5}}>{m.attachmentSize ? `${(m.attachmentSize/1024).toFixed(1)} KB` : "Attachment"}</div></> : m.content}<span className="chat-time">{m.createdAt?new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):""}{mine && m.id ? <span title={m.seenAt?"Seen":"Sent"} style={{marginLeft:6,color:m.seenAt?"#7dd3fc":"#d0caff",fontWeight:800}}>{m.seenAt?"✓✓":"✓"}</span> : null}{m.expiresAt ? ` · expires ${new Date(m.expiresAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}` : m.expiryMode === "AFTER_SEEN" ? " · delete after seen" : ""}{mine && m.id ? <button type="button" className="chat-delete" onClick={()=>deleteMessage(m.id)}>Delete</button> : null}</span></div>})}<div ref={bottomRef}/></div>
    <form className="chat-compose" onSubmit={sendMessage}><div className="chat-expiry"><label htmlFor="expiry-mode">Disappearing messages:</label><select id="expiry-mode" value={expiryMode} onChange={(e)=>setExpiryMode(e.target.value)}><option value="NEVER">Off</option><option value="AFTER_SEEN">After seen</option><option value="SECONDS_30">30 seconds</option><option value="CUSTOM">Custom time</option></select>{expiryMode === "CUSTOM" && <><label htmlFor="expiry-minutes">Minutes</label><input id="expiry-minutes" type="number" min="1" max="43200" value={customMinutes} onChange={(e)=>setCustomMinutes(e.target.value)} style={{width:85}}/></>}</div><input ref={fileInputRef} type="file" hidden onChange={uploadAttachment} accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip"/><button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading} title="Send attachment">{uploading ? "Uploading…" : "📎"}</button><input type="text" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a private message…" maxLength={4000} aria-label="Message"/><button type="submit">Send ➤</button></form>
  </section>
  {(callState!=="idle" || incoming) && <div className="call-overlay"><div className="call-card" style={callPanelPos?{left:callPanelPos.left,top:callPanelPos.top,right:"auto",bottom:"auto"}:{}}><div className="call-drag-handle" onPointerDown={startDrag}>⠿ Drag call window · chat stays open</div><div style={{fontSize:30}}>{callMode==="video"?"🎥":"📞"}</div><h2 style={{fontSize:18,margin:"6px 0"}}>{callState==="incoming"?`Incoming ${incoming?.mode} call`:callState==="calling"?`Calling ${peer?.displayName || peer?.username || "user"}…`:callState==="active"?`${callMode==="video"?"Video":"Audio"} call`:"Call"}</h2><p style={{fontSize:12}}>{callState==="incoming"?`${incoming?.senderUsername || peer?.username} is calling you`:callState==="active"?"Connected through WebRTC":"Waiting for the other person to respond…"}</p>
    <div className="call-videos" style={{display:callMode==="video"?"grid":"none",gridTemplateColumns:"1fr 1fr",gap:6,margin:"10px 0"}}><div style={{overflow:"hidden",borderRadius:10,background:"#080a14"}}><video ref={remoteVideoRef} autoPlay playsInline style={{height:150,objectFit:"cover",transform:`scale(${videoZoom})`}}/><div className="call-note">Remote</div></div><div style={{overflow:"hidden",borderRadius:10,background:"#080a14"}}><video ref={localVideoRef} autoPlay playsInline muted style={{height:150,objectFit:"cover",transform:`scale(${videoZoom})`}}/><div className="call-note">You</div></div></div>
    {callMode==="video"&&<label className="call-note" style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>Zoom <input type="range" min="1" max="2.5" step="0.1" value={videoZoom} onChange={e=>setVideoZoom(Number(e.target.value))}/><span>{videoZoom.toFixed(1)}×</span></label>}
    {callMode === "video" && <label className="call-note" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginTop:8}}><input type="checkbox" checked={dataSaver} onChange={e=>setDataSaver(e.target.checked)} style={{width:"auto",margin:0}}/> Data saver (low quality, less internet)</label>}<div className="call-controls">{callState==="incoming"&&<><button className="accept" onClick={acceptCall}>Accept call</button><button className="danger" onClick={()=>endCall(true)}>Decline</button></>}{callState==="active"&&<><button onClick={toggleMic}>{micMuted?"Unmute mic":"Mute mic"}</button>{callMode==="video"&&<button onClick={toggleCamera}>{cameraOff?"Turn camera on":"Turn camera off"}</button>}<button className="danger" onClick={()=>endCall(false)}>End call</button></>}{callState==="calling"&&<button className="danger" onClick={()=>endCall(false)}>Cancel call</button>}</div><div className="call-note">Camera/mic permission required. Resize the window from its corner.</div></div></div>}
  </main>;
}
