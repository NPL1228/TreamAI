import sqlite3
import random
import string

DB_PATH = "fyp.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Users (
            username TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Password_Resets (
            token TEXT PRIMARY KEY,
            email TEXT,
            expires_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Chats (
            chat_id       TEXT PRIMARY KEY,
            chat_name     TEXT,
            chat_type     TEXT,
            description   TEXT,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ai_listening  INTEGER DEFAULT 1,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1 TEXT,
            user2 TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user1, user2)
        );

        CREATE TABLE IF NOT EXISTS Projects (
            project_id  TEXT PRIMARY KEY,
            chat_id     TEXT,
            name        TEXT,
            status      TEXT DEFAULT 'active',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES Chats(chat_id)
        );

        CREATE TABLE IF NOT EXISTS Chat_Members (
            chat_id     TEXT,
            user_name   TEXT,
            role        TEXT DEFAULT 'member',
            joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_read   TIMESTAMP,
            PRIMARY KEY (chat_id, user_name)
        );

        CREATE TABLE IF NOT EXISTS Weights (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id     TEXT,
            project_id  TEXT,               -- NULL for chat-level weights
            w1          REAL DEFAULT 0.40,  -- semantic similarity
            w2          REAL DEFAULT 0.35,  -- recency
            w3          REAL DEFAULT 0.25,  -- frequency
            alpha       REAL DEFAULT 0.90,  -- EMA smoothing factor
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Message_Buffer (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id     TEXT,
            message     TEXT,
            user_name   TEXT,
            timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id     TEXT,
            sender      TEXT,
            text        TEXT,
            timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(chat_id) REFERENCES Chats(chat_id)
        );

        CREATE TABLE IF NOT EXISTS Notifications (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT,
            title       TEXT,
            message     TEXT,
            is_read     INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Auto-migrate schema for existing databases
    try:
        cursor.execute("ALTER TABLE Chat_Members ADD COLUMN last_read TIMESTAMP")
        cursor.execute("UPDATE Chat_Members SET last_read = CURRENT_TIMESTAMP")
    except sqlite3.OperationalError:
        pass # Column already exists

    conn.commit()
    conn.close()


def get_connection():
    return sqlite3.connect(DB_PATH)


def update_username(old_name: str, new_name: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Users SET username = ? WHERE username = ?", (new_name, old_name))
        cursor.execute("UPDATE Chat_Members SET user_name = ? WHERE user_name = ?", (new_name, old_name))
        cursor.execute("UPDATE Friendships SET user1 = ? WHERE user1 = ?", (new_name, old_name))
        cursor.execute("UPDATE Friendships SET user2 = ? WHERE user2 = ?", (new_name, old_name))
        cursor.execute("UPDATE Message_Buffer SET user_name = ? WHERE user_name = ?", (new_name, old_name))
        cursor.execute("UPDATE Messages SET sender = ? WHERE sender = ?", (new_name, old_name))
        cursor.execute("UPDATE Notifications SET username = ? WHERE username = ?", (new_name, old_name))
        cursor.execute("UPDATE Chats SET chat_name = REPLACE(chat_name, 'Chat with ' || ?, 'Chat with ' || ?) WHERE chat_type = 'private'", (old_name, new_name))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def register_user(username: str, email: str, password_hash: str) -> bool:
    conn = get_connection()
    try:
        conn.execute("INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)", (username, email, password_hash))
        
        # Auto-generate a private chat with the TreamAI Agent
        ai_chat_id = f"ai-{username}-{random.randint(1000, 9999)}"
        conn.execute("INSERT INTO Chats (chat_id, chat_name, chat_type) VALUES (?, ?, ?)", 
                     (ai_chat_id, "TreamAI Agent", "private"))
        conn.execute("INSERT INTO Chat_Members (chat_id, user_name) VALUES (?, ?)", 
                     (ai_chat_id, username))
                     
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def register_chat(chat_id: str, chat_name: str, chat_type: str):
    conn = get_connection()
    conn.execute("""
        INSERT OR IGNORE INTO Chats (chat_id, chat_name, chat_type)
        VALUES (?, ?, ?)
    """, (chat_id, chat_name, chat_type))
    conn.commit()
    conn.close()


def register_member(chat_id: str, user_name: str):
    conn = get_connection()
    conn.execute("""
        INSERT OR IGNORE INTO Chat_Members (chat_id, user_name)
        VALUES (?, ?)
    """, (chat_id, user_name))
    conn.commit()
    conn.close()


def get_weights(chat_id: str, project_id: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    if project_id:
        cursor.execute("""
            SELECT w1, w2, w3, alpha FROM Weights
            WHERE chat_id = ? AND project_id = ?
        """, (chat_id, project_id))
    else:
        cursor.execute("""
            SELECT w1, w2, w3, alpha FROM Weights
            WHERE chat_id = ? AND project_id IS NULL
        """, (chat_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"w1": row[0], "w2": row[1], "w3": row[2], "alpha": row[3]}
    # Default weights if not yet initialized
    return {"w1": 0.40, "w2": 0.35, "w3": 0.25, "alpha": 0.90}


def update_weights(chat_id: str, w1: float, w2: float, w3: float,
                   project_id: str = None):
    conn = get_connection()
    conn.execute("""
        INSERT INTO Weights (chat_id, project_id, w1, w2, w3)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(chat_id, project_id)
        DO UPDATE SET w1=excluded.w1, w2=excluded.w2,
                      w3=excluded.w3, updated_at=CURRENT_TIMESTAMP
    """, (chat_id, project_id, w1, w2, w3))
    conn.commit()
    conn.close()


def get_projects(chat_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT project_id, name FROM Projects
        WHERE chat_id = ? AND status = 'active'
    """, (chat_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"project_id": r[0], "name": r[1]} for r in rows]


def register_project(project_id: str, chat_id: str, name: str):
    conn = get_connection()
    conn.execute("""
        INSERT OR IGNORE INTO Projects (project_id, chat_id, name)
        VALUES (?, ?, ?)
    """, (project_id, chat_id, name))
    conn.commit()
    conn.close()


def buffer_message(chat_id: str, message: str, user_name: str):
    conn = get_connection()
    conn.execute("""
        INSERT INTO Message_Buffer (chat_id, message, user_name)
        VALUES (?, ?, ?)
    """, (chat_id, message, user_name))
    conn.commit()
    conn.close()


def get_buffered_messages(chat_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT message, user_name, timestamp FROM Message_Buffer
        WHERE chat_id = ?
        ORDER BY timestamp ASC
    """, (chat_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"message": r[0], "user_name": r[1], "timestamp": r[2]} for r in rows]


def clear_buffer(chat_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM Message_Buffer WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()

def save_message(chat_id: str, sender: str, text: str):
    conn = get_connection()
    conn.execute("""
        INSERT INTO Messages (chat_id, sender, text)
        VALUES (?, ?, ?)
    """, (chat_id, sender, text))
    conn.commit()
    conn.close()

def get_chat_history(chat_id: str, limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    # We select DESC to get the latest `limit` messages, then reverse them
    cursor.execute("""
        SELECT sender, text, timestamp FROM Messages
        WHERE chat_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (chat_id, limit))
    rows = cursor.fetchall()
    conn.close()
    
    # Reverse to return them in chronological order
    rows.reverse()
    return [{"sender": r[0], "text": r[1], "timestamp": r[2]} for r in rows]

def create_notification(username: str, title: str, message: str):
    conn = get_connection()
    conn.execute("""
        INSERT INTO Notifications (username, title, message)
        VALUES (?, ?, ?)
    """, (username, title, message))
    conn.commit()
    conn.close()

def get_notifications(username: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, message, is_read, created_at FROM Notifications
        WHERE username = ?
        ORDER BY created_at DESC
    """, (username,))
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "message": r[2], "is_read": bool(r[3]), "created_at": r[4]} for r in rows]

def mark_notifications_read(username: str):
    conn = get_connection()
    conn.execute("UPDATE Notifications SET is_read = 1 WHERE username = ? AND is_read = 0", (username,))
    conn.commit()
    conn.close()

def register_user(username: str, email: str, password_hash: str) -> bool:
    conn = get_connection()
    try:
        conn.execute("INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)", (username, email, password_hash))
        
        # Auto-generate a private chat with the TreamAI Agent
        ai_chat_id = f"ai-{username}-{random.randint(1000, 9999)}"
        conn.execute("INSERT INTO Chats (chat_id, chat_name, chat_type) VALUES (?, ?, ?)", 
                     (ai_chat_id, "TreamAI Agent", "private"))
        conn.execute("INSERT INTO Chat_Members (chat_id, user_name) VALUES (?, ?)", 
                     (ai_chat_id, username))
                     
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_user_chats(username: str) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.chat_id, c.chat_name, c.chat_type, c.last_activity,
               (SELECT COUNT(*) FROM Messages m 
                WHERE m.chat_id = c.chat_id 
                AND m.timestamp > COALESCE(cm.last_read, '1970-01-01')) AS unread_count
        FROM Chats c
        JOIN Chat_Members cm ON c.chat_id = cm.chat_id
        WHERE cm.user_name = ?
        ORDER BY c.last_activity DESC
    """, (username,))
    rows = cursor.fetchall()
    
    chats = []
    for r in rows:
        chat_id = r[0]
        chat_name = r[1]
        chat_type = r[2]
        last_activity = r[3]
        unread = r[4]
        
        if chat_type == 'private' and chat_name != 'TreamAI Agent':
            # find the other member
            cursor.execute("SELECT user_name FROM Chat_Members WHERE chat_id = ? AND user_name != ?", (chat_id, username))
            other = cursor.fetchone()
            if other:
                chat_name = other[0]
                
        chats.append({"chat_id": chat_id, "chat_name": chat_name, "chat_type": chat_type, "last_activity": last_activity, "unread": unread})
        
    conn.close()
    return chats

def mark_chat_read(chat_id: str, username: str):
    conn = get_connection()
    conn.execute("UPDATE Chat_Members SET last_read = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_name = ?", (chat_id, username))
    conn.commit()
    conn.close()

def update_chat_activity(chat_id: str):
    conn = get_connection()
    conn.execute("UPDATE Chats SET last_activity = CURRENT_TIMESTAMP WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()

def send_friend_request(from_user: str, to_user: str) -> bool:
    conn = get_connection()
    try:
        conn.execute("INSERT INTO Friendships (user1, user2, status) VALUES (?, ?, 'pending')", (from_user, to_user))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def accept_friend_request(user1: str, user2: str) -> bool:
    conn = get_connection()
    # Accept the request (regardless of who sent it)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE Friendships SET status = 'accepted' 
        WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
    """, (user1, user2, user2, user1))
    
    if cursor.rowcount > 0:
        # Check if private chat already exists
        chat_id = get_private_chat_id(user1, user2)
        if not chat_id:
            # Generate new chat
            chat_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            conn.execute("INSERT INTO Chats (chat_id, chat_name, chat_type) VALUES (?, ?, 'private')", (chat_id, f"Chat with {user2}"))
            conn.execute("INSERT INTO Chat_Members (chat_id, user_name, role) VALUES (?, ?, 'member')", (chat_id, user1))
            conn.execute("INSERT INTO Chat_Members (chat_id, user_name, role) VALUES (?, ?, 'member')", (chat_id, user2))
        conn.commit()
        conn.close()
        return True
    
    conn.close()
    return False

def get_pending_requests(username: str) -> list:
    # Returns list of usernames who sent requests TO this username
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user1 FROM Friendships WHERE user2 = ? AND status = 'pending'", (username,))
    rows = cursor.fetchall()
    conn.close()
    return [{"username": r[0]} for r in rows]

def get_friends(username: str) -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT CASE WHEN user1 = ? THEN user2 ELSE user1 END as friend_name, created_at
        FROM Friendships 
        WHERE (user1 = ? OR user2 = ?) AND status = 'accepted'
        ORDER BY created_at DESC
    """, (username, username, username))
    rows = cursor.fetchall()
    conn.close()
    return [{"username": r[0], "created_at": r[1]} for r in rows]

def get_private_chat_id(user1: str, user2: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.chat_id FROM Chats c
        JOIN Chat_Members m1 ON c.chat_id = m1.chat_id
        JOIN Chat_Members m2 ON c.chat_id = m2.chat_id
        WHERE c.chat_type = 'private' AND m1.user_name = ? AND m2.user_name = ?
    """, (user1, user2))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

def get_chat(chat_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT chat_id, chat_name, chat_type, description, ai_listening FROM Chats WHERE chat_id = ?", (chat_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"chat_id": row[0], "chat_name": row[1], "chat_type": row[2], "description": row[3], "ai_listening": bool(row[4])}
    return None

def update_ai_listening(chat_id: str, status: bool) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Chats SET ai_listening = ? WHERE chat_id = ?", (int(status), chat_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_chat_info(chat_id: str):
    chat = get_chat(chat_id)
    if not chat:
        return None
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_name, role, joined_at FROM Chat_Members WHERE chat_id = ?", (chat_id,))
    rows = cursor.fetchall()
    conn.close()
    
    chat["members"] = [{"username": r[0], "role": r[1], "joined_at": r[2]} for r in rows]
    return chat

def update_chat_description(chat_id: str, description: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Chats SET description = ? WHERE chat_id = ?", (description, chat_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def create_chat(chat_name: str, chat_type: str, username: str) -> str:
    conn = get_connection()
    # Generate 8-character alphanumeric ID
    chat_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    conn.execute("INSERT INTO Chats (chat_id, chat_name, chat_type) VALUES (?, ?, ?)", 
                 (chat_id, chat_name, chat_type))
    conn.execute("INSERT INTO Chat_Members (chat_id, user_name, role) VALUES (?, ?, 'owner')", 
                 (chat_id, username))
    conn.commit()
    conn.close()
    return chat_id

def join_chat(chat_id: str, username: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if chat exists
    cursor.execute("SELECT 1 FROM Chats WHERE chat_id = ?", (chat_id,))
    if not cursor.fetchone():
        conn.close()
        return False
        
    try:
        conn.execute("INSERT INTO Chat_Members (chat_id, user_name) VALUES (?, ?)", (chat_id, username))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # Already a member
        return True
    finally:
        conn.close()

def authenticate_user(username: str, password_hash: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM Users WHERE username = ? AND password_hash = ?", (username, password_hash))
    row = cursor.fetchone()
    conn.close()
    return bool(row)

def get_user_by_email(email: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM Users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"username": row[0], "email": email}
    return None

def store_reset_token(email: str, token: str, expires_in_seconds: int = 3600):
    conn = get_connection()
    # Delete any existing tokens for this email
    conn.execute("DELETE FROM Password_Resets WHERE email = ?", (email,))
    conn.execute(
        "INSERT INTO Password_Resets (token, email, expires_at) VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))",
        (token, email, expires_in_seconds)
    )
    conn.commit()
    conn.close()

def validate_reset_token(token: str) -> str:
    # Returns email if valid, else None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM Password_Resets WHERE token = ? AND expires_at > datetime('now')", (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def update_password(email: str, new_password_hash: str):
    conn = get_connection()
    conn.execute("UPDATE Users SET password_hash = ? WHERE email = ?", (new_password_hash, email))
    # Delete token after use
    conn.execute("DELETE FROM Password_Resets WHERE email = ?", (email,))
    conn.commit()
    conn.close()
