# Deployment Guide

This guide covers deploying the ARENA cooperative browser slasher to a production environment.

---

## 1. Prerequisites

- **Node.js 18+** (LTS recommended — 20.x or 22.x)
- **npm 9+** (ships with Node)
- A Linux VPS, cloud instance, or local server with network access
- (Optional) **Docker** for containerized deployment
- (Optional) **nginx** or **Caddy** for reverse proxy / TLS termination

Verify your Node version:

```bash
node -v   # should print v18.x or higher
```

---

## 2. Production Build

The build step compiles the Vite client into static files under `dist/`. The server serves these in production.

```bash
npm ci              # install only production+dev deps from lockfile
npm run build       # vite build → dist/
```

After building, `dist/` contains the optimized client bundle (minified JS/CSS, hashed filenames). No separate web server is needed — the Node server hosts it directly.

---

## 3. Running in Production

### Option A: Direct

```bash
npm start
# equivalent to: cross-env NODE_ENV=production node server/index.js
```

The server starts on port **3001** (or the value of `PORT`), serves the static client from `dist/`, and handles WebSocket connections on `/ws`.

### Option B: PM2 (process manager)

PM2 keeps the process alive across crashes and reboots.

```bash
npm install -g pm2

# start with 1 instance (sufficient for a single room set)
pm2 start server/index.js --name arena --env NODE_ENV=production

# or use ecosystem.config.js (see below)
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # generates a systemd command to auto-start on boot
```

Example `ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'arena',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      max_memory_restart: '256M',
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

Useful PM2 commands:

```bash
pm2 status            # list running processes
pm2 logs arena        # tail server logs
pm2 restart arena     # restart after a new build
pm2 stop arena        # graceful stop
pm2 delete arena      # remove from PM2
```

---

## 4. Reverse Proxy (HTTPS + WSS)

WebSocket requires a reverse proxy for TLS termination. The proxy must pass `Upgrade` and `Connection` headers.

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name arena.example.com;

    ssl_certificate     /etc/letsencrypt/live/arena.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arena.example.com/privkey.pem;

    # HTTP → static client (served by arena itself)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

# HTTP → redirect to HTTPS
server {
    listen 80;
    server_name arena.example.com;
    return 301 https://$host$request_uri;
}
```

### Caddy (simpler)

Caddy auto-provisions TLS via Let's Encrypt. Create or edit `Caddyfile`:

```
arena.example.com {
    reverse_proxy 127.0.0.1:3001
}
```

Caddy automatically handles WebSocket upgrades for `Upgrade`-headed requests. No extra configuration needed.

Get a TLS cert with:

```bash
sudo apt install caddy
sudo systemctl enable --now caddy
```

---

## 5. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP + WebSocket listen port |
| `NODE_ENV` | `development` | Set to `production` to enable static serving from `dist/` |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

`npm start` automatically sets `NODE_ENV=production`. When running manually:

```bash
PORT=8080 NODE_ENV=production LOG_LEVEL=debug node server/index.js
```

---

## 6. Health Check

The server exposes a health/stats endpoint:

```
GET /api/status
```

**Response (200):**

```json
{
  "ok": true,
  "uptime": 3621,
  "memory": {
    "rss": 48230400,
    "heapTotal": 18874368,
    "heapUsed": 14230528,
    "external": 1234567,
    "arrayBuffers": 234567
  },
  "rooms": 2,
  "roomBreakdown": { "lobby": 1, "playing": 1, "over": 0 },
  "totalPlayers": 3,
  "avgTickDuration": 48
}
```

Use this for monitoring, load balancer health checks, or uptime monitoring services (UptimeRobot, healthchecks.io, etc.).

Example with `curl`:

```bash
curl -s http://localhost:3001/api/status | jq .
```

---

## 7. Dockerfile

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ server/
COPY shared/ shared/
COPY --from=build /app/dist/ dist/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/status || exit 1

CMD ["node", "server/index.js"]
```

Build and run:

```bash
docker build -t arena .
docker run -d -p 3001:3001 --name arena arena
```

With `docker-compose.yml`:

```yaml
services:
  arena:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/status"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

## 8. Troubleshooting

### WebSocket connection fails over HTTPS

The client auto-selects `ws://` or `wss://` based on `location.protocol`. If your reverse proxy doesn't pass the `Upgrade` header, the WebSocket handshake fails. Check:

- nginx: ensure `proxy_http_version 1.1` and `proxy_set_header Upgrade $http_upgrade` are set on the `/ws` location.
- Caddy: works out of the box — verify with `curl -i -H "Upgrade: websocket" https://arena.example.com/ws`.

### White screen / "Cannot find module" after build

Run `npm run build` again. The `dist/` folder must exist before starting in production mode. The server falls back to a plain text page if `dist/` is missing.

### High memory usage

Each room runs a tick loop at 20 Hz. Memory scales with active rooms and players. Monitor via `/api/status`. If memory grows unbounded, restart with PM2:

```bash
pm2 restart arena
```

Or set `max_memory_restart` in the PM2 ecosystem config.

### Port already in use

Another process is bound to the port. Find and stop it:

```bash
# Linux
lsof -i :3001
kill <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

Or set `PORT=8080` (or any free port) in your environment.

### Players can't connect across the internet

- Ensure the firewall allows inbound traffic on the server port (3001 by default).
- If behind NAT, port-forward 3001 to the server's internal IP.
- If using a reverse proxy, ensure both HTTP (443) and WebSocket (`/ws`) are routed correctly.

### Server crashes on startup

Check that:
1. `npm ci` completed without errors.
2. `npm run build` was run before `npm start` (production mode expects `dist/`).
3. Node.js version is 18+.
4. No other process is using the target port.

View logs:

```bash
# PM2
pm2 logs arena

# Docker
docker logs arena

# Direct
# stdout/stderr from the terminal
```
