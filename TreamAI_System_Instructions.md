# TreamAI — Full System Design & Development Instructions

## Project Overview

**TreamAI** is an LLM-powered team collaboration assistant built as a Final Year Project (FYP).

The core research contribution is a **self-adaptive memory retrieval system** — not the chat interface itself.

The chat web app is the delivery vehicle. The memory system is the novel contribution.

---

## Tech Stack

```
Backend:     FastAPI (Python)
Database:    SQLite (structured data) + ChromaDB (vector memory)
LLM:         Google Gemini API (gemini-2.5-flash)
Frontend:    React (Vite) + WebSocket
Hosting:     Oracle Cloud VM (Ubuntu)
```

---

## System Architecture

```
Custom Chat Web App (Frontend)
            ↓ WebSocket
FastAPI Backend
  ├── Storage Pipeline   ← passive message buffering + summarization
  ├── Retrieval Pipeline ← triggered by @agent mention
  ├── SQLite             ← chats, projects, members, weights
  └── ChromaDB           ← memory nodes + embeddings
            ↓
Google Gemini API (LLM)
```

---

## Database Structure

### SQLite Tables

```sql
Users (
    username TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

Password_Resets (
    token TEXT PRIMARY KEY,
    email TEXT,
    expires_at TIMESTAMP
)

Chats (
    chat_id       TEXT PRIMARY KEY,
    chat_name     TEXT,
    chat_type     TEXT,
    description   TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_listening  INTEGER DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

Friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 TEXT,
    user2 TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1, user2)
)

Friend_Nicknames (
    user_name TEXT,
    friend_name TEXT,
    nickname TEXT,
    PRIMARY KEY(user_name, friend_name)
)

Projects (
    project_id  TEXT PRIMARY KEY,
    chat_id     TEXT,
    name        TEXT,
    status      TEXT DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES Chats(chat_id)
)

Chat_Members (
    chat_id     TEXT,
    user_name   TEXT,
    role        TEXT DEFAULT 'member',
    joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read   TIMESTAMP,
    left_at     TIMESTAMP,
    is_deleted  INTEGER DEFAULT 0,
    PRIMARY KEY (chat_id, user_name)
)

Weights (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT,
    project_id  TEXT,               -- NULL for chat-level weights
    w1          REAL DEFAULT 0.40,  -- semantic similarity
    w2          REAL DEFAULT 0.35,  -- recency
    w3          REAL DEFAULT 0.25,  -- frequency
    alpha       REAL DEFAULT 0.90,  -- EMA smoothing factor
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

Message_Buffer (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT,
    message     TEXT,
    user_name   TEXT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

Messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT,
    sender      TEXT,
    text        TEXT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES Chats(chat_id)
)

Notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT,
    title       TEXT,
    message     TEXT,
    is_read     INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    """)
