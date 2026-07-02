import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SERVER_URL = 'http://localhost:3001';

const DUMMY_ACCOUNTS = [
  { username: 'alice', password: 'alice123' },
  { username: 'bob',   password: 'bob123'   },
  { username: 'carol', password: 'carol123' },
  { username: 'dave',  password: 'dave123'  },
];

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">💬</div>
        <h1 className="login-title">ChatApp</h1>
        <p className="login-subtitle">Sign in to start chatting</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. alice"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Demo accounts:</p>
          <div className="demo-list">
            {DUMMY_ACCOUNTS.map(a => (
              <button key={a.username} className="demo-chip"
                onClick={() => { setUsername(a.username); setPassword(a.password); }}>
                {a.username}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────
function ChatScreen({ user, onLogout }) {
  const [messages, setMessages]     = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [inputText, setInputText]   = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected]   = useState(false);
  const [showUsers, setShowUsers]   = useState(false);

  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('user:join', {
        username: user.username,
        avatar:   user.avatar,
        color:    user.color
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('messages:history', (msgs) => setMessages(msgs));

    socket.on('message:new', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('users:update', (users) => setOnlineUsers(users));

    socket.on('typing:update', ({ username, isTyping }) => {
      setTypingUsers(prev =>
        isTyping
          ? prev.includes(username) ? prev : [...prev, username]
          : prev.filter(u => u !== username)
      );
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const sendMessage = useCallback(() => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.emit('message:send', { text: inputText.trim() });
    socketRef.current.emit('typing:stop');
    setInputText('');
    clearTimeout(typingTimer.current);
  }, [inputText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socketRef.current) return;
    socketRef.current.emit('typing:start');
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop');
    }, 1500);
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach(msg => {
    const date = formatDate(msg.timestamp);
    if (date !== lastDate) {
      groupedMessages.push({ type: 'date-divider', date, id: `date-${msg.timestamp}` });
      lastDate = date;
    }
    groupedMessages.push(msg);
  });

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <span className="header-logo">💬</span>
          <div>
            <h2 className="header-title">ChatApp</h2>
            <span className={`connection-status ${connected ? 'online' : 'offline'}`}>
              {connected ? '● Connected' : '○ Reconnecting...'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <button className="users-btn" onClick={() => setShowUsers(!showUsers)}>
            👥 {onlineUsers.length}
          </button>
          <div className="user-avatar" style={{ background: user.color }}>
            {user.avatar}
          </div>
          <button className="logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="chat-body">
        {/* Online users sidebar */}
        {showUsers && (
          <div className="users-panel">
            <h3>Online ({onlineUsers.length})</h3>
            {onlineUsers.map(u => (
              <div key={u.id} className="user-item">
                <div className="user-avatar-sm" style={{ background: u.color }}>{u.avatar}</div>
                <span>{u.username} {u.username === user.username ? '(you)' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="messages-area">
          {groupedMessages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>No messages yet. Say hello!</p>
            </div>
          )}

          {groupedMessages.map(item => {
            if (item.type === 'date-divider') {
              return (
                <div key={item.id} className="date-divider">
                  <span>{item.date}</span>
                </div>
              );
            }
            if (item.type === 'system') {
              return (
                <div key={item.id} className="system-message">
                  {item.text} · {formatTime(item.timestamp)}
                </div>
              );
            }
            const isOwn = item.username === user.username;
            return (
              <div key={item.id} className={`message-row ${isOwn ? 'own' : 'other'}`}>
                {!isOwn && (
                  <div className="msg-avatar" style={{ background: item.color }}>
                    {item.avatar}
                  </div>
                )}
                <div className="message-bubble-wrap">
                  {!isOwn && <div className="msg-username">{item.username}</div>}
                  <div className={`message-bubble ${isOwn ? 'own-bubble' : 'other-bubble'}`}
                    style={isOwn ? {} : { borderLeft: `3px solid ${item.color}` }}>
                    {item.text}
                  </div>
                  <div className={`msg-time ${isOwn ? 'time-right' : 'time-left'}`}>
                    {formatTime(item.timestamp)}
                  </div>
                </div>
                {isOwn && (
                  <div className="msg-avatar" style={{ background: user.color }}>
                    {user.avatar}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="typing-text">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="input-area">
        <textarea
          className="message-input"
          placeholder="Type a message... (Enter to send)"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin  = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);

  return user
    ? <ChatScreen user={user} onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />;
}
