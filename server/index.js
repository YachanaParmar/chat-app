const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage
const users = {};   // { socketId: { id, username, avatar } }
const messages = []; // message history

// Dummy user accounts for login
const dummyAccounts = {
  'alice': { password: 'alice123', avatar: 'A', color: '#6366f1' },
  'bob':   { password: 'bob123',   avatar: 'B', color: '#10b981' },
  'carol': { password: 'carol123', avatar: 'C', color: '#f59e0b' },
  'dave':  { password: 'dave123',  avatar: 'D', color: '#ef4444' },
};

// ─── REST API ────────────────────────────────────────────────

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = dummyAccounts[username?.toLowerCase()];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({
    success: true,
    user: { username, avatar: user.avatar, color: user.color }
  });
});

// Get message history
app.get('/api/messages', (req, res) => {
  res.json(messages.slice(-100)); // last 100 messages
});

// Get online users
app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// Health check
app.get('/', (req, res) => res.json({ status: 'Chat server running' }));

// ─── SOCKET.IO ───────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins
  socket.on('user:join', ({ username, avatar, color }) => {
    const user = { id: socket.id, username, avatar, color };
    users[socket.id] = user;

    // Notify everyone
    const systemMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${username} joined the chat`,
      timestamp: new Date().toISOString()
    };
    messages.push(systemMsg);
    io.emit('message:new', systemMsg);
    io.emit('users:update', Object.values(users));

    // Send message history to new user
    socket.emit('messages:history', messages.slice(-100));

    console.log(`${username} joined`);
  });

  // New message
  socket.on('message:send', ({ text }) => {
    const user = users[socket.id];
    if (!user || !text?.trim()) return;

    const message = {
      id: uuidv4(),
      type: 'message',
      text: text.trim(),
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      timestamp: new Date().toISOString()
    };

    messages.push(message);
    if (messages.length > 500) messages.shift(); // keep last 500

    io.emit('message:new', message);
  });

  // Typing indicator
  socket.on('typing:start', () => {
    const user = users[socket.id];
    if (user) socket.broadcast.emit('typing:update', { username: user.username, isTyping: true });
  });

  socket.on('typing:stop', () => {
    const user = users[socket.id];
    if (user) socket.broadcast.emit('typing:update', { username: user.username, isTyping: false });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const systemMsg = {
        id: uuidv4(),
        type: 'system',
        text: `${user.username} left the chat`,
        timestamp: new Date().toISOString()
      };
      messages.push(systemMsg);
      io.emit('message:new', systemMsg);
      delete users[socket.id];
      io.emit('users:update', Object.values(users));
      console.log(`${user.username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
