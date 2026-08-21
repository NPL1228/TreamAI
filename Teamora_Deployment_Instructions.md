# Teamora — Deployment Instructions

## Repo Structure
```
Teamora/
  ├── frontend/    ← React app (Vite)
  └── backend/     ← FastAPI
```

---

## Frontend — Vercel

1. Go to vercel.com → sign up with GitHub
2. Add New Project → import Teamora repo
3. Set Root Directory: `frontend`
4. Framework: Vite
5. Add environment variables:
   ```
   VITE_WS_URL  = wss://YOUR_ORACLE_IP:8000/ws
   VITE_API_URL = https://YOUR_ORACLE_IP:8000
   ```
6. Deploy → get `https://teamora.vercel.app`

*(Note: We updated the variable names from `REACT_APP_` to `VITE_` since the project uses Vite, not Create React App. Vite requires the `VITE_` prefix to expose variables to the client).*

Auto-redeploys on every GitHub push.

---

## Backend — Oracle VM

### First time setup:
```bash
git clone https://github.com/NPL1228/Teamora.git
cd Teamora/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Generate SSL cert:
```bash
openssl req -newkey rsa:2048 -sha256 -nodes \
  -keyout private.key -x509 -days 365 -out cert.pem \
  -subj "/CN=YOUR_ORACLE_IP"
```

### Create .env file:
```
GEMINI_API_KEY=your_key_here
```
*(Note: Changed from Anthropic to Gemini to reflect our updated LLM pipeline).*

### Run backend (persistent):
```bash
screen -S teamora
uvicorn main:app --host 0.0.0.0 --port 8000 \
  --ssl-keyfile private.key \
  --ssl-certfile cert.pem
# Detach: Ctrl+A then D
# Reattach: screen -r teamora
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
User → teamora.vercel.app (frontend)
     → wss://ORACLE_IP:8000/ws (backend WebSocket)
     → FastAPI → SQLite + ChromaDB + Gemini API
```

Frontend is HTTPS (Vercel), backend must also use SSL (wss/https) to avoid mixed content errors.
