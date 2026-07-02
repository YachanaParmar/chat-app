# ChatApp — Real-Time Chat Application

A full-stack real-time chat application built with React, Node.js, and Socket.io.

---

## Features

- ✅ Real-time messaging with Socket.io
- ✅ Dummy user login (4 accounts)
- ✅ Timestamps on every message
- ✅ Typing indicators
- ✅ Online users panel
- ✅ Message history on join
- ✅ System messages (join/leave notifications)
- ✅ Date dividers between messages
- ✅ Clean dark UI

---

## Project Structure

```
chat-app/
├── server/
│   ├── index.js         # Express + Socket.io server
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.js       # Main React app (Login + Chat)
│   │   ├── App.css      # Styling
│   │   └── index.js     # Entry point
│   ├── public/
│   │   └── index.html
│   └── package.json
└── README.md
```

---

## Setup & Run

### 1. Start the Server

```bash
cd server
npm install
npm start
```

Server runs on: http://localhost:3001

### 2. Start the Client

```bash
cd client
npm install
npm start
```

Client runs on: http://localhost:3000

---

## Demo Accounts

| Username | Password  |
|----------|-----------|
| alice    | alice123  |
| bob      | bob123    |
| carol    | carol123  |
| dave     | dave123   |

Open multiple browser tabs and log in with different accounts to test real-time chat!

---

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 18, Socket.io-client |
| Backend  | Node.js, Express        |
| Realtime | Socket.io               |
| Styling  | Pure CSS                |

---

## API Endpoints

| Method | Endpoint        | Description          |
|--------|----------------|----------------------|
| POST   | /api/login     | Authenticate user    |
| GET    | /api/messages  | Get message history  |
| GET    | /api/users     | Get online users     |

---

## How It Works

1. User logs in via REST API (`POST /api/login`)
2. On success, React connects to Socket.io server
3. Server sends message history to new user
4. Messages sent via `message:send` socket event
5. Server broadcasts to all connected clients via `message:new`
6. Typing indicators use `typing:start` / `typing:stop` events
