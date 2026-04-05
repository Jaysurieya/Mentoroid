import { useState, useRef, useEffect, useCallback } from "react";
import {
  Home, Bell, PieChart, Package, LogOut, GraduationCap,
  Sun, Moon, Send, Paperclip, Mic, Plus,
  Headphones, Film, Map, FileText, Layers, BarChart2,
  HelpCircle, Table, Zap, Users, Bot, Search,
  Check, Play, ChevronLeft, MoreHorizontal, ShieldUser,
  Trash2, Pencil, MessageSquare, UserPlus, CheckCircle, XCircle
} from "lucide-react";
import TextType from "./Texttype";
import SourcesPanel from "./SourcesPanel";
import "./css/notebook.css";
import { useNavigate } from "react-router-dom";
import { getSocket, disconnectSocket } from "../../lib/socket";

/* ─────────────── constants ─────────────── */

const NODE_API = "http://localhost:5000/api";

// Decode JWT payload without a library (browser-safe)
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch { return null; }
}

const AVATAR_COLORS = [
  "#7c3aed", "#2563eb", "#0891b2", "#059669",
  "#d97706", "#dc2626", "#9333ea", "#0284c7",
];

const STUDIO_OUTPUTS = [
  { icon: <Headphones size={14} />, label: "Audio Overview" },
  { icon: <Layers size={14} />, label: "Slide Deck" },
  { icon: <Film size={14} />, label: "Video Overview" },
  { icon: <Map size={14} />, label: "Mind Map" },
  { icon: <FileText size={14} />, label: "Reports" },
  { icon: <Zap size={14} />, label: "Flashcards" },
  { icon: <HelpCircle size={14} />, label: "Quiz" },
  { icon: <BarChart2 size={14} />, label: "Infographic" },
  { icon: <Table size={14} />, label: "Data Table" },
];

const SAVED_SESSIONS = [
  { name: "DSA – Time Complexity", meta: "Deep dive · 1 source · 8d ago", color: "#7c3aed" },
  { name: "React Hooks Workshop", meta: "Audio overview · 2 sources · 2d ago", color: "#2563eb" },
  { name: "ML Fundamentals", meta: "Flashcards · 3 sources · 5d ago", color: "#059669" },
];

const INITIAL_SOURCES = []; // Sources now managed in SourcesPanel.jsx

function getAvatarColor(id) {
  let hash = 0;
  for (let i = 0; i < (String(id) || "").length; i++) hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}


/* ═══════════════ Left Panels ═══════════════ */

function StudioPanel() {
  return (
    <div className="nb-studio">
      <div className="nb-panel-header">
        <span className="nb-panel-title">Studio</span>
        <button className="nb-panel-action"><BarChart2 size={15} /></button>
      </div>
      <div className="nb-studio-body">
        <div className="nb-audio-strip">
          <Play size={15} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Audio Overview</div>
            <div style={{ fontSize: 10.5, opacity: .75, marginTop: 1 }}>Deep dive · 1 source</div>
          </div>
          <button style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 6, padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 11 }}>Generate</button>
        </div>
        <div className="nb-studio-grid">
          {STUDIO_OUTPUTS.map(o => (
            <div className="nb-studio-card" key={o.label}>{o.icon}<span>{o.label}</span></div>
          ))}
        </div>
        <div style={{ marginTop: 4 }}>
          <div className="nb-section-label">Saved Sessions</div>
          {SAVED_SESSIONS.map(s => (
            <div className="nb-session-item" key={s.name}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div className="nb-session-info">
                <div className="nb-session-name">{s.name}</div>
                <div className="nb-session-meta">{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// SourcesPanel is now a standalone component in SourcesPanel.jsx

/* ═══════════════ AI Chat ═══════════════ */

// Source citation chip shown below an AI answer
function SourceChip({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  const typeColors = {
    pdf: "#ef4444", image: "#8b5cf6", docx: "#3b82f6",
    pptx: "#f97316", youtube: "#ef4444", website: "#22c55e", txt: "#6b7280",
  };
  const color = typeColors[source.source_type] || "#6b7280";
  return (
    <div className="rag-source-chip" onClick={() => setExpanded(e => !e)}>
      <div className="rag-source-chip-header">
        <span className="rag-source-dot" style={{ background: color }} />
        <span className="rag-source-title">
          [{index + 1}] {source.title}{source.page ? ` · p.${source.page}` : ""}
        </span>
        <span className="rag-source-type">{source.source_type}</span>
        <span className="rag-source-toggle">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="rag-source-excerpt">{source.chunk_text}</div>
      )}
    </div>
  );
}

function AIChatPanel({ activeSources, sessionId, authToken }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [chatLoaded, setChatLoaded] = useState(false);
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  // Load chat history when session changes
  useEffect(() => {
    if (!sessionId || !authToken) { setMessages([]); setChatLoaded(true); return; }
    setChatLoaded(false);
    fetch(`${NODE_API}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.session.chatHistory) {
          setMessages(data.session.chatHistory.map((m, i) => ({
            id: m._id || i,
            role: m.role,
            content: m.content,
            sources: m.sources || [],
          })));
        } else {
          setMessages([]);
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setChatLoaded(true));
  }, [sessionId, authToken]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "22px";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId) return;

    // Add user message
    setMessages(p => [...p, { id: Date.now(), role: "user", content: text, sources: [] }]);
    setInput("");
    setThinking(true);
    setError("");

    // Get material_ids from active (checked + ready) sources
    const material_ids = (activeSources || [])
      .filter(s => s.checked && s.status === "ready")
      .map(s => s.id);

    try {
      const res = await fetch(`${NODE_API}/rag/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          question: text,
          material_ids: material_ids.length > 0 ? material_ids : null,
          top_k: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Query failed");
      }

      setMessages(p => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
      setMessages(p => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        content: "⚠️ Failed to get a response. " + (err.message || ""),
        sources: [],
      }]);
    } finally {
      setThinking(false);
    }
  }, [input, activeSources, sessionId, authToken]);

  const hasActiveSources = (activeSources || []).some(s => s.checked && s.status === "ready");

  return (
    <>
      <div className="nb-chat-history">
        {messages.length === 0 && !thinking && (
          <div className="nb-empty-state">
            <div className="nb-empty-icon"><GraduationCap size={26} /></div>
            <div>
              <TextType
                text={["Hello, Welcome to Mentoroid!", "Your AI-Powered Learning Companion.", "Empowering Your Learning Journey."]}
                typingSpeed={10} pauseDuration={1500} showCursor cursorCharacter="|" textColors={["#8b5cf6"]}
              />
            </div>
            <div className="nb-empty-sub">
              {hasActiveSources
                ? "Your sources are ready — ask anything!"
                : "Add sources on the left, then start chatting"}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`nb-msg ${m.role}`}>
            <div className="nb-msg-avatar">{m.role === "user" ? "U" : <GraduationCap size={15} />}</div>

            {m.role === "user" ? (
              /* User: plain bubble, row-reverse CSS puts it on the right */
              <div className="nb-msg-bubble">{m.content}</div>
            ) : (
              /* Assistant: column wrapper holds bubble + source chips */
              <div className="rag-answer-col">
                <div className="nb-msg-bubble">{m.content}</div>
                {m.sources?.length > 0 && (
                  <div className="rag-sources-list">
                    {m.sources.map((src, i) => (
                      <SourceChip key={i} source={src} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="nb-msg assistant">
            <div className="nb-msg-avatar"><GraduationCap size={15} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="nb-thinking-bubble">
                <div className="nb-thinking-dot" /><div className="nb-thinking-dot" /><div className="nb-thinking-dot" />
              </div>
              <span style={{ fontSize: 10, color: "#4b5563", paddingLeft: 4 }}>Searching your sources…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="nb-composer-wrap">
        {/* No-sources warning */}
        {!hasActiveSources && messages.length === 0 && (
          <div className="rag-no-sources-hint">
            ⬅ Upload study materials in the Sources panel first
          </div>
        )}
        <div className="nb-composer">
          <button className="nb-composer-btn" title="Attach"><Paperclip size={17} /></button>
          <textarea
            ref={textareaRef}
            className="nb-composer-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={hasActiveSources ? "Ask anything about your sources…" : "Add sources first, then ask questions…"}
            disabled={thinking}
          />
          <button className="nb-composer-btn" title="Voice"><Mic size={17} /></button>
          <button className="nb-send-btn" onClick={send} disabled={!input.trim() || thinking}><Send size={15} /></button>
        </div>
        <div className="nb-composer-hint">Mentoroid AI answers from your uploaded sources only.</div>
      </div>
    </>
  );
}

/* ═══════════════ Friends Chat ═══════════════ */

function FriendChatPanel({ friend, currUserId, authToken, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  // Compute chatId identical to backend getPrivateChatId
  const chatId = [String(currUserId), String(friend._id)].sort().join("_");

  useEffect(() => {
    if (!chatId || !authToken) return;
    setMessages([]);
    fetch(`${NODE_API}/chat/messages/${chatId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.messages) setMessages(data.messages);
    }).catch(console.error);

    if (socket) socket.emit("joinRoom", chatId);
    return () => { if (socket) socket.emit("leaveRoom", chatId); };
  }, [chatId, authToken, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleMsg = (msg) => {
      if (msg.chatId === chatId) setMessages(p => [...p, msg]);
    };
    socket.on("receiveMessage", handleMsg);
    return () => socket.off("receiveMessage", handleMsg);
  }, [socket, chatId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, friend]);
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "22px";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
  }, [input]);

  const send = useCallback(() => {
    const text = input.trim(); if (!text || !socket) return;
    socket.emit("sendMessage", { chatId, content: text });
    setInput("");
  }, [input, socket, chatId]);

  if (!friend) return null;
  const fColor = getAvatarColor(friend.name || friend._id);

  return (
    <>
      {/* Friend header */}
      <div className="nb-fc-header">
        <div className="nb-friend-avatar nb-fc-avatar" style={{ background: fColor }}>
          {(friend.name||"?")[0].toUpperCase()}
          <div className={`nb-friend-status ${friend.status}`} />
        </div>
        <div className="nb-fc-meta">
          <div className="nb-fc-name">{friend.name}</div>
          <div className="nb-fc-status-text">
            <span className={`nb-fc-dot ${friend.status}`} />
            {friend.status === "online" ? "Online" : "Offline"}
          </div>
        </div>
        <button className="nb-header-btn" style={{ marginLeft: "auto" }}><MoreHorizontal size={17} /></button>
      </div>

      {/* Messages */}
      <div className="nb-chat-history nb-fc-history">
        {messages.length === 0 && (
          <div className="nb-empty-state">
            <div className="nb-fc-avatar-lg" style={{ background: fColor }}>{(friend.name||"?")[0].toUpperCase()}</div>
            <div className="nb-empty-label">{friend.name}</div>
            <div className="nb-empty-sub">Start a conversation!</div>
          </div>
        )}
        {messages.map((m) => {
          const isMe = String(m.sender._id || m.sender) === String(currUserId);
          return (
            <div key={m._id} className={`nb-msg ${isMe ? "user" : "assistant"}`}>
              {!isMe && (
                <div className="nb-msg-avatar" style={{ background: fColor }}>{(friend.name||"?")[0].toUpperCase()}</div>
              )}
              <div className={`nb-msg-bubble ${isMe ? "nb-fc-bubble-me" : "nb-fc-bubble-them"}`}>{m.content}</div>
              {isMe && (
                <div className="nb-msg-avatar" style={{ background: "#7c3aed" }}>U</div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="nb-composer-wrap">
        <div className="nb-composer">
          <button className="nb-composer-btn"><Paperclip size={17} /></button>
          <textarea
            ref={textareaRef}
            className="nb-composer-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${friend.name}…`}
          />
          <button className="nb-composer-btn"><Mic size={17} /></button>
          <button className="nb-send-btn" onClick={send} disabled={!input.trim()}><Send size={15} /></button>
        </div>
      </div>
    </>
  );
}

/* ── Friends tab empty state ── */
function FriendsEmptyState() {
  return (
    <div className="nb-fc-no-selection">
      <div className="nb-empty-icon"><Users size={26} /></div>
      <div className="nb-empty-label">No conversation selected</div>
      <div className="nb-empty-sub">Select a friend from the Study Circle panel to start chatting.</div>
    </div>
  );
}

/* ═══════════════ Center Panel (tabs) ═══════════════ */

const TABS = [
  { id: "ai", label: "AI Chat", icon: <Bot size={15} /> },
  { id: "friends", label: "Friends Chat", icon: <Users size={15} /> },
];

function CenterPanel({ activeTab, setActiveTab, selectedFriend, activeSources, sessionId, authToken, currUserId, socket }) {
  return (
    <>
      {/* ── Tab bar ── */}
      <div className="nb-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nb-tab ${activeTab === tab.id ? "nb-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {activeTab === tab.id && <div className="nb-tab-indicator" />}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="nb-tab-content" key={activeTab}>
        {activeTab === "ai" && (
          <AIChatPanel
            activeSources={activeSources}
            sessionId={sessionId}
            authToken={authToken}
          />
        )}

        {activeTab === "friends" && (
          selectedFriend
            ? <FriendChatPanel friend={selectedFriend} currUserId={currUserId} authToken={authToken} socket={socket} />
            : <FriendsEmptyState />
        )}
      </div>
    </>
  );
}

/* ═══════════════ Right Sidebar (Study Circle) ═══════════════ */

function FriendsSidebar({ isOpen, onClose, selectedFriend, onSelectFriend, friends, groups, friendRequests, onlineUsers, userChatId, onSendRequest, onAcceptRequest, onRejectRequest }) {
  const [query, setQuery] = useState("");
  const [addId, setAddId] = useState("");
  
  const filteredFriends = (friends || []).filter(f => (f.name||"").toLowerCase().includes(query.toLowerCase()));
  const filteredGroups = (groups || []).filter(g => (g.name||"").toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && <div className="nb-sidebar-backdrop" onClick={onClose} />}

      <div className={`nb-right-sidebar ${isOpen ? "" : "collapsed"}`}>
        <div className="nb-right-header">
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={15} color="#a78bfa" />
            <span className="nb-panel-title">Study Circle</span>
          </div>
          <button className="nb-panel-action" onClick={onClose}>✕</button>
        </div>
        
        {/* Add Friend Section */}
        <div style={{ padding: "10px", borderBottom: "1px solid #1e1e1e" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>Your Chat ID: <b style={{color: "#e5e7eb", userSelect: "all"}}>{userChatId || "Loading..."}</b></div>
          <div style={{ display: "flex", gap: 6 }}>
            <input 
              placeholder="Add friend by Chat ID" 
              value={addId} 
              onChange={e => setAddId(e.target.value)} 
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #252525", color: "#e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none" }}
            />
            <button 
              onClick={() => { if(addId.trim()) { onSendRequest(addId); setAddId(""); } }}
              title="Send Friend Request"
              style={{ background: "#7c3aed", border: "none", borderRadius: 6, padding: "4px 8px", color: "#fff", cursor: "pointer" }}
            >
              <UserPlus size={14} />
            </button>
          </div>
        </div>

        <div className="nb-right-search">
          <Search size={13} color="#4b5563" />
          <input placeholder="Search friends…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        
        <div className="nb-friends-list">
          {/* ── Pending Requests ── */}
          {friendRequests?.length > 0 && (
            <>
              <div className="nb-section-label">Requests ({friendRequests.length})</div>
              {friendRequests.map(req => (
                <div key={req._id} className="nb-friend-item" style={{ cursor: "default" }}>
                  <div className="nb-friend-avatar" style={{ background: getAvatarColor(req.from?.name || req.from?._id) }}>
                    {(req.from?.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="nb-friend-info">
                    <div className="nb-friend-name">{req.from?.name}</div>
                    <div className="nb-friend-activity">Wants to connect</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => onAcceptRequest(req._id)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", padding: 2 }}><CheckCircle size={15} /></button>
                    <button onClick={() => onRejectRequest(req._id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}><XCircle size={15} /></button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Individual Friends ── */}
          <div className="nb-section-label" style={{ marginTop: 8 }}>Friends</div>
          {filteredFriends.length === 0 ? (
             <div style={{ padding: 10, fontSize: 11, color: "#6b7280", textAlign: "center" }}>No friends found</div>
          ) : (
            filteredFriends.map(f => (
              <SidebarFriendItem key={f._id} friend={f} selected={selectedFriend?._id === f._id} onSelect={onSelectFriend} isOnline={onlineUsers.includes(f._id)} />
            ))
          )}

          {/* ── Groups ── */}
          {filteredGroups.length > 0 && (
            <>
              <div className="nb-section-label" style={{ marginTop: 8 }}>Groups</div>
              {filteredGroups.map(g => (
                <GroupItem key={g._id} group={g} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SidebarFriendItem({ friend, selected, onSelect, isOnline }) {
  return (
    <div
      className={`nb-friend-item ${selected ? "nb-friend-item-selected" : ""}`}
      onClick={() => onSelect(friend)}
    >
      <div className="nb-friend-avatar" style={{ background: getAvatarColor(friend.name || friend._id) }}>
        {(friend.name||"?")[0].toUpperCase()}
        <div className={`nb-friend-status ${isOnline ? "online" : "offline"}`} />
      </div>
      <div className="nb-friend-info">
        <div className="nb-friend-name">{friend.name}</div>
        <div className="nb-friend-activity">{isOnline ? "Online" : "Offline"}</div>
      </div>
    </div>
  );
}

function GroupItem({ group }) {
  return (
    <div className="nb-friend-item" style={{ cursor: "pointer" }}>
      <div className="nb-friend-avatar" style={{ background: getAvatarColor(group.name || group._id), fontSize: 12 }}>
        {(group.name||"GR").slice(0, 2).toUpperCase()}
      </div>
      <div className="nb-friend-info">
        <div className="nb-friend-name">{group.name}</div>
        <div className="nb-friend-activity">{group.members?.length || 0} members</div>
      </div>
    </div>
  );
}

/* ═══════════════ Icon Sidebar Nav ═══════════════ */

function NavIcon({ icon, label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`nb-nav-icon ${active ? "active" : ""}`}
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      title={label}
    >
      {icon}
      {hovered && (
        <div style={{
          position: "absolute", left: 68, top: "50%", transform: "translateY(-50%)",
          background: "#1a1a1a", border: "1px solid #252525", borderRadius: 6,
          padding: "4px 10px", fontSize: 12, color: "#e5e7eb", whiteSpace: "nowrap",
          zIndex: 200, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,.4)"
        }}>{label}</div>
      )}
    </div>
  );
}

/* ═══════════════ Session Panel ═══════════════ */

function SessionPanel({ sessions, activeSessionId, onSelect, onCreate, onDelete, loading }) {
  const [editingId, setEditingId] = useState(null);
  return (
    <div className="nb-studio">
      <div className="nb-panel-header">
        <span className="nb-panel-title">Sessions</span>
        <button className="nb-panel-action" onClick={onCreate} title="New session">
          <Plus size={15} />
        </button>
      </div>
      <div className="nb-studio-body" style={{ padding: "6px 0" }}>
        {loading && <div style={{ textAlign: "center", padding: 12, fontSize: 12, color: "#6b7280" }}>Loading…</div>}
        {!loading && sessions.length === 0 && (
          <div style={{ textAlign: "center", padding: 18, fontSize: 12, color: "#4b5563" }}>No sessions yet</div>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            className={`nb-session-item ${s.id === activeSessionId ? "nb-session-item-active" : ""}`}
            onClick={() => onSelect(s.id)}
            style={{ cursor: "pointer" }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.id === activeSessionId ? "#7c3aed" : "#3f3f46", flexShrink: 0 }} />
            <div className="nb-session-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="nb-session-name">{s.title}</div>
              <div className="nb-session-meta">
                {s.materialCount} sources · {s.messageCount} msgs
              </div>
            </div>
            <button
              className="src-delete-btn"
              onClick={e => { e.stopPropagation(); onDelete(s.id); }}
              title="Delete session"
              style={{ opacity: 0.5, flexShrink: 0 }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Dashboard Root ═══════════════ */

export default function Dashboard() {
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("ai");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeSources, setActiveSources] = useState([]);

  // Auth state
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userChatId, setUserChatId] = useState("");

  // Social state
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem("fitmate_token");
    if (!token) { navigate("/signup"); return; }
    setAuthToken(token);
    const decoded = decodeToken(token);
    if (decoded?.id) setUserId(decoded.id);

    // Fetch user profile for chatId
    fetch(`${NODE_API}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.user) setUserChatId(d.user.chatId); })
      .catch(console.error);

    // Connect Socket
    const s = getSocket(token);
    setSocket(s);

    // Fetch initial social data
    fetch(`${NODE_API}/chat/friends`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => { if(d.success) setFriends(d.friends); });
    
    fetch(`${NODE_API}/chat/groups`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => { if(d.success) setGroups(d.groups); });

    fetch(`${NODE_API}/chat/friend-requests`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => { if(d.success) setFriendRequests(d.requests); });

    // Fetch sessions
    fetch(`${NODE_API}/sessions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (data) => {
        if (data.success && data.sessions.length > 0) {
          setSessions(data.sessions);
          setActiveSessionId(data.sessions[0].id);
        } else {
          const res = await fetch(`${NODE_API}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: "Session 1" }),
          });
          const created = await res.json();
          if (created.success) {
            setSessions([created.session]);
            setActiveSessionId(created.session.id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setSessionsLoading(false));

    return () => { disconnectSocket(); };
  }, [navigate]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    socket.on("onlineUsers", users => setOnlineUsers(users));
    socket.on("userOnline", ({ userId }) => setOnlineUsers(p => [...new Set([...p, userId])]));
    socket.on("userOffline", ({ userId }) => setOnlineUsers(p => p.filter(u => u !== userId)));
    socket.on("friendRequestReceived", req => setFriendRequests(p => [req, ...p]));
    socket.on("friendRequestAccepted", ({ friend }) => setFriends(p => [friend, ...p]));
    socket.on("addedToGroup", ({ group }) => setGroups(p => [group, ...p]));

    return () => {
      socket.off("onlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("friendRequestReceived");
      socket.off("friendRequestAccepted");
      socket.off("addedToGroup");
    };
  }, [socket]);

  // Handlers for Friend system
  const handleSendRequest = async (chatId) => {
    try {
      const res = await fetch(`${NODE_API}/chat/friend-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ chatId })
      });
      const data = await res.json();
      if (!data.success) alert(data.message);
    } catch(err) { console.error(err); }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      const res = await fetch(`${NODE_API}/chat/friend-request/${reqId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setFriendRequests(p => p.filter(r => r._id !== reqId));
        // friend is added via socket event
      }
    } catch(err) { console.error(err); }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      const res = await fetch(`${NODE_API}/chat/friend-request/${reqId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) setFriendRequests(p => p.filter(r => r._id !== reqId));
    } catch(err) { console.error(err); }
  };

  const handleCreateSession = useCallback(async () => {
    if (!authToken) return;
    const title = `Session ${sessions.length + 1}`;
    try {
      const res = await fetch(`${NODE_API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
      }
    } catch (err) { console.error("Create session failed:", err); }
  }, [authToken, sessions.length]);

  const handleDeleteSession = useCallback(async (id) => {
    if (!authToken) return;
    try {
      await fetch(`${NODE_API}/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setSessions(prev => {
          if (prev.length > 0) setActiveSessionId(prev[0].id);
          else setActiveSessionId(null);
          return prev;
        });
      }
    } catch (err) { console.error("Delete session failed:", err); }
  }, [authToken, activeSessionId]);

  const handleSidebarFriendSelect = (friend) => {
    setSelectedFriend(friend);
    setActiveTab("friends");
  };

  const handleNavFriends = () => { setActiveTab("friends"); };
  const handleNavAI = () => { setActiveTab("ai"); };

  const handleLogout = () => {
    localStorage.removeItem("fitmate_token");
    disconnectSocket();
    navigate("/signup");
  };

  return (
    <div className="nb-shell" style={{ background: isDarkMode ? "#0d0d0d" : "#f9f9f9" }}>

      {/* ── Icon Sidebar ── */}
      <div className="nb-icon-sidebar">
        <div style={{ width: 40, height: 40, background: "#7c3aed", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 20 }}>
          <GraduationCap color="#fff" size={22} />
        </div>

        <NavIcon icon={<Home size={18} />} label="Dashboard" active={activeTab === "ai"} onClick={handleNavAI} />
        <NavIcon icon={<Bot size={18} />} label="AI Chat" active={activeTab === "ai"} onClick={handleNavAI} />
        <NavIcon icon={<Users size={18} />} label="Friends" active={activeTab === "friends"} onClick={handleNavFriends} />
        <NavIcon icon={<Bell size={18} />} label="Notifications" />
        <NavIcon icon={<PieChart size={18} />} label="Analytics" />
        <NavIcon icon={<Package size={18} />} label="Inventory" />
        <NavIcon icon={<ShieldUser size={18} />} label="Profile" onClick={() => navigate("/profile")} />

        <div className="nb-spacer" />

        <NavIcon
          icon={isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          label={isDarkMode ? "Light mode" : "Dark mode"}
          onClick={() => setIsDarkMode(d => !d)}
        />
        <NavIcon icon={<LogOut size={18} />} label="Logout" onClick={handleLogout} />
      </div>

      {/* ── Content Area ── */}
      <div className="nb-content">

        {/* ── Left Panel ── */}
        <div className="nb-left-panel">
          <SessionPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={setActiveSessionId}
            onCreate={handleCreateSession}
            onDelete={handleDeleteSession}
            loading={sessionsLoading}
          />
          <StudioPanel />
          <SourcesPanel
            onSourcesChange={setActiveSources}
            sessionId={activeSessionId}
            authToken={authToken}
          />
        </div>

        {/* ── Center ── */}
        <div className="nb-center" style={{ position: "relative" }}>
          {/* Center header row */}
          <div className="nb-center-header">
            <div className="nb-center-title">
              <div className="nb-center-title-dot" />
              {activeTab === "ai" ? "Mentoroid AI" : "Study Circle"}
            </div>
            <div className="nb-header-actions">
              <button className="nb-header-btn" title="Save to note"><FileText size={16} /></button>
              <button
                className={`nb-header-btn ${friendsOpen ? "nb-header-btn-active" : ""}`}
                title={friendsOpen ? "Hide study circle" : "Show study circle"}
                onClick={() => setFriendsOpen(o => !o)}
              >
                <Users size={16} />
              </button>
            </div>
          </div>

          <CenterPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedFriend={selectedFriend}
            activeSources={activeSources}
            sessionId={activeSessionId}
            authToken={authToken}
            currUserId={userId}
            socket={socket}
          />

          {!friendsOpen && (
            <button className="nb-toggle-sidebar-btn" onClick={() => setFriendsOpen(true)}>
              <ChevronLeft size={12} />
            </button>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <FriendsSidebar
          isOpen={friendsOpen}
          onClose={() => setFriendsOpen(false)}
          selectedFriend={selectedFriend}
          onSelectFriend={handleSidebarFriendSelect}
          friends={friends}
          groups={groups}
          friendRequests={friendRequests}
          onlineUsers={onlineUsers}
          userChatId={userChatId}
          onSendRequest={handleSendRequest}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />
      </div>
    </div>
  );
}