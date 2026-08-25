from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from memory.storage import init_db, register_user, authenticate_user, get_user_by_email, store_reset_token, validate_reset_token, update_password, get_user_chats, get_chat, create_chat, join_chat, send_friend_request, accept_friend_request, remove_friend, get_pending_requests, get_friends, update_chat_activity, get_chat_info, update_chat_description, save_message, get_chat_history, create_notification, get_notifications, mark_notifications_read, update_ai_listening, update_username, mark_chat_read
from bot import handle_message
import json
import hashlib
import smtplib
import secrets
import os
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel

class AuthRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CreateChatRequest(BaseModel):
    chat_name: str
    chat_type: str
    username: str

class JoinChatRequest(BaseModel):
    chat_id: str
    username: str

class ChatDescriptionRequest(BaseModel):
    chat_id: str
    description: str

class FriendReq(BaseModel):
    from_user: str
    to_user: str

class FriendAcceptReq(BaseModel):
    user1: str
    user2: str

class MarkReadReq(BaseModel):
    username: str

class AiListeningReq(BaseModel):
    ai_listening: bool

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        # Maps chat_id -> list of active WebSockets
        self.active_connections: dict[str, list[WebSocket]] = {}
        # Maps username -> list of global WebSockets
        self.global_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: str):
        if chat_id in self.active_connections:
            self.active_connections[chat_id].remove(websocket)
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

    async def connect_global(self, websocket: WebSocket, username: str):
        await websocket.accept()
        if username not in self.global_connections:
            self.global_connections[username] = []
        self.global_connections[username].append(websocket)

    def disconnect_global(self, websocket: WebSocket, username: str):
        if username in self.global_connections:
            self.global_connections[username].remove(websocket)
            if not self.global_connections[username]:
                del self.global_connections[username]

    async def broadcast(self, message: str, chat_id: str):
        if chat_id in self.active_connections:
            for connection in self.active_connections[chat_id]:
                await connection.send_text(message)
                
    async def notify_user(self, username: str, payload: dict):
        if username in self.global_connections:
            for conn in self.global_connections[username]:
                try:
                    await conn.send_text(json.dumps(payload))
                except Exception:
                    pass

manager = ConnectionManager()


@app.on_event("startup")
async def startup():
    init_db()
    print("Database initialized.")


@app.get("/")
async def root():
    return {"status": "TreamAI Backend Running"}

def send_reset_email(to_email: str, reset_link: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        print("WARNING: SMTP credentials not set. Mocking email delivery:")
        print(f"Reset link for {to_email}: {reset_link}")
        return
        
    msg = MIMEMultipart('alternative')
    msg['From'] = f"TreamAI Support <{smtp_user}>"
    msg['To'] = to_email
    msg['Subject'] = "Password Reset Request - TreamAI"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">TreamAI</h1>
          </div>
          
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
              We received a request to reset the password for your TreamAI account. 
              Click the button below to choose a new password.
            </p>
            
            <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
            
            <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #6366f1;">{reset_link}</span>
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; {datetime.datetime.now().year if 'datetime' in globals() else '2026'} TreamAI Inc. All rights reserved.<br>
              If you did not request a password reset, please safely ignore this email.
            </p>
          </div>
          
        </div>
      </body>
    </html>
    """
    
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Reset email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

import time
login_attempts = {}

def check_rate_limit(ip: str):
    current_time = time.time()
    if ip in login_attempts:
        attempts, first_attempt_time = login_attempts[ip]
        if current_time - first_attempt_time < 60:
            if attempts >= 5:
                raise HTTPException(status_code=429, detail="Too many attempts. Please try again in a minute.")
            login_attempts[ip] = (attempts + 1, first_attempt_time)
        else:
            login_attempts[ip] = (1, current_time)
    else:
        login_attempts[ip] = (1, current_time)

@app.post("/register")
async def register(req: RegisterRequest, request: Request):
    check_rate_limit(request.client.host)
    pwd_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if register_user(req.username, req.email, pwd_hash):
        return {"status": "success", "message": "User registered"}
    raise HTTPException(status_code=400, detail="Username or email already exists")

@app.post("/login")
async def login(req: AuthRequest, request: Request):
    check_rate_limit(request.client.host)
    pwd_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if authenticate_user(req.username, pwd_hash):
        return {"status": "success", "username": req.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")

from pydantic import BaseModel
class UpdateUsernameRequest(BaseModel):
    old_username: str
    new_username: str

@app.get("/api/users/{username}")
async def get_user_profile(username: str):
    from memory.storage import get_connection
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT email, created_at FROM Users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"status": "success", "email": row[0], "created_at": row[1]}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/api/users/update_username")
async def api_update_username(req: UpdateUsernameRequest):
    if update_username(req.old_username, req.new_username):
        return {"status": "success", "username": req.new_username}
    raise HTTPException(status_code=400, detail="Username already exists or could not be updated")

@app.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    user = get_user_by_email(req.email)
    if user:
        token = secrets.token_urlsafe(32)
        store_reset_token(req.email, token)
        # Using hardcoded frontend port for the link (5173 is standard Vite)
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        send_reset_email(req.email, reset_link)
    # Always return success to prevent email enumeration
    return {"status": "success", "message": "If that email exists, a reset link was sent."}

@app.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    email = validate_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    pwd_hash = hashlib.sha256(req.new_password.encode()).hexdigest()
    update_password(email, pwd_hash)
    return {"status": "success", "message": "Password updated successfully"}

@app.get("/api/chats/{username}")
async def get_chats(username: str):
    return {"status": "success", "chats": get_user_chats(username)}

@app.post("/api/chats/create")
async def api_create_chat(req: CreateChatRequest):
    chat_id = create_chat(req.chat_name, req.chat_type, req.username)
    return {"status": "success", "chat_id": chat_id}

@app.post("/api/chats/join")
async def api_join_chat(req: JoinChatRequest):
    if join_chat(req.chat_id, req.username):
        chat = get_chat(req.chat_id)
        return {"status": "success", "chat": chat}
    raise HTTPException(status_code=404, detail="Chat code not found")

@app.delete("/api/chats/{chat_id}")
async def api_delete_chat(chat_id: str, username: str):
    from memory.storage import delete_chat
    if delete_chat(chat_id, username):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to delete chat")

class LeaveChatRequest(BaseModel):
    username: str

@app.post("/api/chats/{chat_id}/leave")
async def api_leave_chat(chat_id: str, req: LeaveChatRequest):
    from memory.storage import leave_chat, save_message, get_chat_info
    status = leave_chat(chat_id, req.username)
    if status == "error":
        raise HTTPException(status_code=500, detail="Failed to leave chat")
    
    if status == "left":
        save_message(chat_id, "system", f"{req.username} left")
        info = get_chat_info(chat_id)
        if info and "members" in info:
            for m in info["members"]:
                if m["role"] != "left":
                    import asyncio
                    asyncio.create_task(manager.notify_user(m["username"], {"type": "new_message", "chat_id": chat_id}))
            
    return {"status": "success", "result": status}

@app.get("/api/chats/info/{chat_id}")
async def api_get_chat_info(chat_id: str):
    info = get_chat_info(chat_id)
    if info:
        return {"status": "success", "info": info}
    raise HTTPException(status_code=404, detail="Chat not found")

@app.put("/api/chats/{chat_id}/description")
async def api_update_chat_desc(chat_id: str, req: ChatDescriptionRequest):
    success = update_chat_description(chat_id, req.description)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to update description")

@app.post("/api/chats/{chat_id}/ai_listening")
async def api_update_ai_listening(chat_id: str, req: AiListeningReq):
    success = update_ai_listening(chat_id, req.ai_listening)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to update ai listening status")

@app.get("/api/chats/{chat_id}/messages")
async def api_get_chat_messages(chat_id: str, username: str = None):
    messages = get_chat_history(chat_id, limit=50, username=username)
    return {"status": "success", "messages": messages}

@app.get("/api/notifications/unread/{username}")
async def api_get_unread_notifications(username: str):
    from memory.storage import get_connection
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM Notifications WHERE username = ? AND is_read = 0", (username,))
    notifs = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM Friendships WHERE user2 = ? AND status = 'pending'", (username,))
    friends = c.fetchone()[0]
    conn.close()
    return {"status": "success", "unread": notifs + friends}

@app.get("/api/notifications/{username}")
async def api_get_notifications(username: str):
    notifs = get_notifications(username)
    return {"status": "success", "notifications": notifs}

@app.post("/api/notifications/read")
async def api_mark_notifications_read(req: MarkReadReq):
    mark_notifications_read(req.username)
    return {"status": "success"}

@app.post("/api/friends/request")
async def api_friend_request(req: FriendReq):
    if send_friend_request(req.from_user, req.to_user):
        await manager.notify_user(req.to_user, {"type": "new_notification"})
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Could not send request")

@app.post("/api/friends/accept")
async def api_friend_accept(req: FriendAcceptReq):
    if accept_friend_request(req.user1, req.user2):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Could not accept request")

@app.post("/api/friends/remove")
async def api_friend_remove(req: FriendAcceptReq):
    if remove_friend(req.user1, req.user2):
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Could not remove friend")

@app.get("/api/friends/outgoing/{username}")
async def api_get_outgoing_requests(username: str):
    from memory.storage import get_outgoing_requests
    outgoing = get_outgoing_requests(username)
    return {"status": "success", "outgoing_requests": outgoing}

@app.get("/api/friends/nicknames/{username}")
async def api_get_nicknames(username: str):
    from memory.storage import get_friend_nicknames
    nicknames = get_friend_nicknames(username)
    return {"status": "success", "nicknames": nicknames}

class NicknameReq(BaseModel):
    user_name: str
    friend_name: str
    nickname: str

@app.post("/api/friends/nickname")
async def api_set_nickname(req: NicknameReq):
    from memory.storage import set_friend_nickname
    success = set_friend_nickname(req.user_name, req.friend_name, req.nickname)
    if success:
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="Failed to set nickname")

@app.get("/api/friends/{username}")
async def api_get_friends(username: str):
    friends = get_friends(username)
    pending = get_pending_requests(username)
    return {"status": "success", "friends": friends, "pending": pending}

@app.post("/api/chats/{chat_id}/read")
async def api_mark_chat_read(chat_id: str, req: MarkReadReq):
    mark_chat_read(chat_id, req.username)
    return {"status": "success"}

@app.websocket("/ws/global/{username}")
async def global_websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect_global(websocket, username)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global(websocket, username)

@app.websocket("/ws/{chat_id}/{username}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, username: str):
    await manager.connect(websocket, chat_id)
    try:
        while True:
            text = await websocket.receive_text()
            
            # Persist and broadcast the user's message
            save_message(chat_id, username, text)
            
            from memory.storage import get_user_color
            user_msg = json.dumps({
                "sender": username, 
                "text": text,
                "color": get_user_color(chat_id, username)
            })
            await manager.broadcast(user_msg, chat_id)
            
            # Update chat activity
            update_chat_activity(chat_id)
            
            # Yield to event loop to ensure user message broadcasts before blocking LLM call
            import asyncio
            await asyncio.sleep(0.05)
            
            # Send to TreamAI bot logic
            response = await handle_message(chat_id, text, username)
            
            # If TreamAI has a response, persist and broadcast it
            if response:
                save_message(chat_id, "TreamAI Agent", response)
                agent_msg = json.dumps({
                    "sender": "TreamAI Agent", 
                    "text": response,
                    "color": get_user_color(chat_id, "TreamAI Agent")
                })
                await manager.broadcast(agent_msg, chat_id)
                
            # Send global notification to all members to update unread counts and sidebar ordering
            try:
                from memory.storage import get_chat_info
                info = get_chat_info(chat_id)
                if info and "members" in info:
                    for m in info["members"]:
                        if m["username"] != username:
                            await manager.notify_user(m["username"], {"type": "new_message", "chat_id": chat_id})
            except Exception as e:
                print("Failed to send global notification:", e)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)