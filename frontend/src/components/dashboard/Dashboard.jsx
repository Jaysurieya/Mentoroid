import { useState, useRef, useEffect, useCallback } from "react";
import {
  Home, Bell, PieChart, Package, LogOut, GraduationCap,
  Sun, Moon, Send, Paperclip, Mic, Plus,
  Headphones, Film, Map, FileText, Layers, BarChart2,
  HelpCircle, Table, Zap, Users, Bot, Search,
  Check, Play, ChevronLeft, MoreHorizontal
} from "lucide-react";
import TextType from "./Texttype";
import SourcesPanel from "./SourcesPanel";
import "./css/notebook.css";

/* ─────────────── constants ─────────────── */

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

const FRIENDS = [
  { name: "Arjun Mehta", activity: "Studying Algorithms", status: "online", color: AVATAR_COLORS[0] },
  { name: "Priya Sharma", activity: "Last seen 5 min ago", status: "away", color: AVATAR_COLORS[1] },
  { name: "Rahul Verma", activity: "Solving LeetCode", status: "online", color: AVATAR_COLORS[2] },
  { name: "Sneha Iyer", activity: "Reading ML Papers", status: "online", color: AVATAR_COLORS[3] },
  { name: "Karthik Raja", activity: "Offline", status: "offline", color: AVATAR_COLORS[4] },
  { name: "Divya Nair", activity: "In a study session", status: "online", color: AVATAR_COLORS[5] },
  { name: "Aditya Kumar", activity: "Last seen 2 hrs ago", status: "offline", color: AVATAR_COLORS[6] },
];

const GROUPS = [
  { name: "DSA Grind", members: 5, lastMsg: "Arjun: solved that dp problem 🔥", color: "#7c3aed", status: "online" },
  { name: "ML Paper Club", members: 4, lastMsg: "Sneha: new paper dropped!", color: "#059669", status: "online" },
  { name: "React Devs", members: 8, lastMsg: "You: check the new hooks docs", color: "#2563eb", status: "offline" },
  { name: "Competitive Prog", members: 6, lastMsg: "Karthik: contest tmrw 9AM", color: "#d97706", status: "offline" },
];

/* seed some mock messages per friend */
const SEED_MESSAGES = {
  "Arjun Mehta": [{ id: 1, from: "them", text: "Hey! Did you finish the binary search section?" }, { id: 2, from: "me", text: "Almost — stuck on the rotated array problem 😅" }],
  "Priya Sharma": [{ id: 1, from: "them", text: "Let me know when you start the ML module!" }],
  "Rahul Verma": [{ id: 1, from: "me", text: "Rahul, share that LeetCode link?" }, { id: 2, from: "them", text: "Sure! https://leetcode.com/problems/two-sum" }],
  "Sneha Iyer": [],
  "Karthik Raja": [{ id: 1, from: "them", text: "Bro I finished the DSA sheet 🔥" }],
  "Divya Nair": [{ id: 1, from: "them", text: "We're in a study pomodoro session, join?" }],
  "Aditya Kumar": [],
};

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

const NODE_API = "http://localhost:5000/api";
const DEMO_STUDENT_ID = "student_demo_001"; // replace with Firebase UID after auth wiring

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

function AIChatPanel({ activeSources }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "22px";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: DEMO_STUDENT_ID,
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
  }, [input, activeSources]);

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

function FriendChatPanel({ friend, onBack }) {
  const [msgMap, setMsgMap] = useState(() => {
    const m = {};
    FRIENDS.forEach(f => { m[f.name] = [...(SEED_MESSAGES[f.name] || [])]; });
    return m;
  });
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const messages = friend ? (msgMap[friend.name] || []) : [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, friend]);
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "22px";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
  }, [input]);

  const send = useCallback(() => {
    const text = input.trim(); if (!text || !friend) return;
    const msg = { id: Date.now(), from: "me", text };
    setMsgMap(p => ({ ...p, [friend.name]: [...(p[friend.name] || []), msg] }));
    setInput("");
    // simulated reply
    setTimeout(() => {
      const reply = { id: Date.now() + 1, from: "them", text: "👋 (This is a simulated reply from " + friend.name + ")" };
      setMsgMap(p => ({ ...p, [friend.name]: [...(p[friend.name] || []), reply] }));
    }, 1000);
  }, [input, friend]);

  if (!friend) return null;

  return (
    <>
      {/* Friend header */}
      <div className="nb-fc-header">
        <div className="nb-friend-avatar nb-fc-avatar" style={{ background: friend.color }}>
          {friend.name[0]}
          <div className={`nb-friend-status ${friend.status}`} />
        </div>
        <div className="nb-fc-meta">
          <div className="nb-fc-name">{friend.name}</div>
          <div className="nb-fc-status-text">
            <span className={`nb-fc-dot ${friend.status}`} />
            {friend.status === "online" ? "Online" : friend.status === "away" ? "Away" : "Offline"}
            {friend.status !== "offline" && <span style={{ color: "#4b5563", marginLeft: 6 }}>· {friend.activity}</span>}
          </div>
        </div>
        <button className="nb-header-btn" style={{ marginLeft: "auto" }}><MoreHorizontal size={17} /></button>
      </div>

      {/* Messages */}
      <div className="nb-chat-history nb-fc-history">
        {messages.length === 0 && (
          <div className="nb-empty-state">
            <div className="nb-fc-avatar-lg" style={{ background: friend.color }}>{friend.name[0]}</div>
            <div className="nb-empty-label">{friend.name}</div>
            <div className="nb-empty-sub">Start a conversation!</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={`nb-msg ${m.from === "me" ? "user" : "assistant"}`}>
            {m.from === "them" && (
              <div className="nb-msg-avatar" style={{ background: friend.color }}>{friend.name[0]}</div>
            )}
            <div className={`nb-msg-bubble ${m.from === "me" ? "nb-fc-bubble-me" : "nb-fc-bubble-them"}`}>{m.text}</div>
            {m.from === "me" && (
              <div className="nb-msg-avatar" style={{ background: "#7c3aed" }}>U</div>
            )}
          </div>
        ))}
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

function CenterPanel({ activeTab, setActiveTab, selectedFriend, activeSources }) {
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
        {activeTab === "ai" && <AIChatPanel activeSources={activeSources} />}

        {activeTab === "friends" && (
          selectedFriend
            ? <FriendChatPanel friend={selectedFriend} />
            : <FriendsEmptyState />
        )}
      </div>
    </>
  );
}

/* ═══════════════ Right Sidebar (Study Circle) ═══════════════ */

function FriendsSidebar({ isOpen, onClose, selectedFriend, onSelectFriend }) {
  const [query, setQuery] = useState("");
  const filteredFriends = FRIENDS.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  const filteredGroups = GROUPS.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));

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
        <div className="nb-right-search">
          <Search size={13} color="#4b5563" />
          <input placeholder="Search friends…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="nb-friends-list">
          {/* ── Individual ── */}
          {filteredFriends.length > 0 && (
            <>
              <div className="nb-section-label">Individual</div>
              {filteredFriends.map(f => (
                <SidebarFriendItem key={f.name} friend={f} selected={selectedFriend?.name === f.name} onSelect={onSelectFriend} />
              ))}
            </>
          )}

          {/* ── Groups ── */}
          {filteredGroups.length > 0 && (
            <>
              <div className="nb-section-label" style={{ marginTop: 8 }}>Groups</div>
              {filteredGroups.map(g => (
                <GroupItem key={g.name} group={g} />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SidebarFriendItem({ friend, selected, onSelect }) {
  const unread = (SEED_MESSAGES[friend.name] || []).filter(m => m.from === "them").length;
  return (
    <div
      className={`nb-friend-item ${selected ? "nb-friend-item-selected" : ""}`}
      onClick={() => onSelect(friend)}
    >
      <div className="nb-friend-avatar" style={{ background: friend.color }}>
        {friend.name[0]}
        <div className={`nb-friend-status ${friend.status}`} />
      </div>
      <div className="nb-friend-info">
        <div className="nb-friend-name">{friend.name}</div>
        <div className="nb-friend-activity">{friend.activity}</div>
      </div>
      {unread > 0 && <div className="nb-friend-badge">{unread}</div>}
    </div>
  );
}

function GroupItem({ group }) {
  return (
    <div className="nb-friend-item" style={{ cursor: "pointer" }}>
      <div className="nb-friend-avatar" style={{ background: group.color, fontSize: 12 }}>
        {group.name.slice(0, 2).toUpperCase()}
        <div className={`nb-friend-status ${group.status}`} />
      </div>
      <div className="nb-friend-info">
        <div className="nb-friend-name">{group.name}</div>
        <div className="nb-friend-activity">{group.lastMsg}</div>
      </div>
      <div style={{ fontSize: 10, color: "#6b7280", flexShrink: 0 }}>{group.members} members</div>
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

/* ═══════════════ Dashboard Root ═══════════════ */

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("ai");       // "ai" | "friends"
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeSources, setActiveSources] = useState([]);  // ready+checked sources for RAG

  /* Clicking a friend from sidebar → switch tab + open that chat */
  const handleSidebarFriendSelect = (friend) => {
    setSelectedFriend(friend);
    setActiveTab("friends");
  };

  /* Nav "Friends" icon → switch to friends tab (show list) */
  const handleNavFriends = () => {
    setActiveTab("friends");
  };

  /* Nav "AI Chat" icon → switch to AI tab */
  const handleNavAI = () => {
    setActiveTab("ai");
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

        <div className="nb-spacer" />

        <NavIcon
          icon={isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          label={isDarkMode ? "Light mode" : "Dark mode"}
          onClick={() => setIsDarkMode(d => !d)}
        />
        <NavIcon icon={<LogOut size={18} />} label="Logout" />
      </div>

      {/* ── Content Area ── */}
      <div className="nb-content">

        {/* ── Left Panel ── */}
        <div className="nb-left-panel">
          <StudioPanel />
          <SourcesPanel onSourcesChange={setActiveSources} />
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
          />

          {/* Edge toggle pill when sidebar closed */}
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
        />
      </div>
    </div>
  );
}