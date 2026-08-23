# TreamAI — Deployment Instructions

## Repo Structure
```
TreamAI/
  ├── frontend/    ← React app (Vite)
  └── backend/     ← FastAPI
```

---

## Frontend — Vercel

1. Go to vercel.com → sign up with GitHub
2. Add New Project → import TreamAI repo
3. Set Root Directory: `frontend`
4. Framework: Vite
5. Add environment variables:
   ```
   VITE_WS_URL  = wss://YOUR_ORACLE_IP:8000
   VITE_API_URL = https://YOUR_ORACLE_IP:8000
   ```
6. Deploy → get `https://treamai.vercel.app`

*(Note: We updated the variable names from `REACT_APP_` to `VITE_` since the project uses Vite, not Create React App. Vite requires the `VITE_` prefix to expose variables to the client).*

Auto-redeploys on every GitHub push.

---

## Backend — Oracle VM

### First time setup:
```bash
git clone https://github.com/NPL1228/TreamAI.git
cd TreamAI/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Generate SSL cert:
```bash
openssl req -newkey rsa:2048 -sha256 -nodes \
  -keyout private.key -x509 -days 365 -out cert.pem \
  -subj "/CN=161.118.201.230"
```

### Create .env file:
```
GEMINI_API_KEY=your_key_here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=treamaisupport@gmail.com
SMTP_PASSWORD=your_app_password
```
*(Note: Changed from Anthropic to Gemini to reflect our updated LLM pipeline).*

### Run backend (persistent):
```bash
screen -S treamai
uvicorn main:app --host 0.0.0.0 --port 8000 \
  --ssl-keyfile private.key \
  --ssl-certfile cert.pem
# Detach: Ctrl+A then D
# Reattach: screen -r treamai
```

### Update backend:
```bash
git pull
# restart uvicorn inside screen session
```

---

## Oracle Firewall

In Oracle Cloud Console:
```
Networking → VCN → Security Lists → Ingress Rules
Add: TCP port 8000 from 0.0.0.0/0
```

On VM:
```bash
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
```

---

## How They Connect

```
User → treamai.vercel.app (frontend)
     → wss://ORACLE_IP:8000/ws (backend WebSocket)
     → FastAPI → SQLite + ChromaDB + Gemini API
```

Frontend is HTTPS (Vercel), backend must also use SSL (wss/https) to avoid mixed content errors.
