# Multi-Tenant Task Management Platform — Build Guide

Step-by-step guide from environment setup to running the full stack.

---

## Step 0: Prerequisites

Install these before starting:

| Tool | Purpose | Install / Check |
|------|---------|-----------------|
| **Node.js** (v18+) | Backend + frontend | [nodejs.org](https://nodejs.org) or `node -v` |
| **MongoDB** | Primary database | [mongodb.com/try](https://www.mongodb.com/try/download/community) or Docker |
| **Redis** | Cache + Pub/Sub | [redis.io](https://redis.io/download) or Docker |
| **Git** | Version control | `git --version` |

Optional for production-style setup:

- **Docker** — to run MongoDB + Redis in containers  
- **Nginx** — API gateway / reverse proxy (we provide config)

---

## Step 1: Environment Setup

### 1.1 Clone or create project folder

```bash
cd d:\Users\chakridhar\Downloads\task
```

### 1.2 Install MongoDB & Redis (choose one)

**Option A — Local install**

- Install MongoDB and start the service.
- Install Redis and start with `redis-server`.

**Option B — Docker (recommended)**

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 1.3 Environment variables

Copy `.env.example` to `.env` in the project root, then edit if needed:

```bash
copy .env.example .env
```

Create or edit `.env` (example):

```env
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/taskplatform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

## Step 2: Project Structure

```
task/
├── backend/                 # Node.js API + Auth + WebSocket
│   ├── src/
│   │   ├── config/          # DB, Redis, env
│   │   ├── models/          # Organization, User, Task
│   │   ├── middleware/      # auth, rbac, rateLimit
│   │   ├── routes/           # auth, tasks, users, orgs
│   │   ├── services/         # auth, task, cache
│   │   ├── websocket/        # real-time server
│   │   └── index.js
│   ├── package.json
│   └── .env
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/        # API, auth, WebSocket
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── nginx/                    # API gateway config (optional)
│   └── nginx.conf
├── .env.example
└── BUILD_GUIDE.md           # this file
```

---

## Step 3: Backend Setup

### 3.1 Initialize backend

```bash
cd backend
npm install
```
(The `package.json` already includes express, mongoose, ioredis, jsonwebtoken, bcryptjs, dotenv, cors, socket.io, express-rate-limit.)

### 3.2 Implement in this order

1. **Config** — `src/config/db.js`, `src/config/redis.js`, load `.env`.
2. **Models** — `Organization`, `User`, `Task` with indexes: `(orgId)`, `(orgId, status)`, `(assignedTo)`.
3. **Auth** — register, login, refresh token, logout (hashed refresh tokens in DB).
4. **Middleware** — JWT verify, RBAC (Admin / Manager / User), rate limiting (Redis-backed).
5. **Routes** — `/auth`, `/orgs`, `/users`, `/tasks` (all scoped by `orgId`).
6. **Cache** — read-through cache for tasks, TTL 5 min, invalidate on write.
7. **WebSocket** — rooms per `orgId`, subscribe to Redis Pub/Sub for task updates; on task change → publish → broadcast to room.

### 3.3 Run backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:4000`. Health: `GET /health`.

---

## Step 4: Frontend Setup

### 4.1 Create React app (Vite)

The `frontend` folder is already set up. Install dependencies:

```bash
cd frontend
npm install
```
(Dependencies: react, react-router-dom, axios, socket.io-client; Vite is the build tool.)

### 4.2 Implement in this order

1. **Auth** — login/register pages, store access + refresh tokens, interceptors for refresh on 401.
2. **API service** — base URL to backend, auth headers, org context.
3. **Pages** — Dashboard, Task list (by status), Create/Edit task, User/Org management (by role).
4. **WebSocket** — connect to WS server, join org room, listen for task updates and refresh list.

### 4.3 Run frontend

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`.

---

## Step 5: Nginx (Optional — API Gateway)

Use Nginx in front of the Node app for:

- Reverse proxy to backend
- Load balancing (when you run multiple Node instances)
- Static files or future services

Place `nginx/nginx.conf` and point it to `http://localhost:4000`. Start Nginx and use its port (e.g. 80) as the “API” URL from the frontend.

---

## Step 6: Run Full Stack

1. Start **MongoDB** and **Redis**.
2. Start **backend**: `cd backend && npm run dev`.
3. Start **frontend**: `cd frontend && npm run dev`.
4. Open `http://localhost:5173`, register an org + user, create tasks. Open another browser/tab in same org to see real-time updates.

---

## Step 7: Verification Checklist

- [ ] User can register (org + first user).
- [ ] Login returns access + refresh tokens.
- [ ] Refresh token rotates and works until logout.
- [ ] Tasks are filtered by `orgId` (multi-tenant isolation).
- [ ] RBAC: Admin can manage users; Manager can assign; User can update own tasks.
- [ ] Task list reads from cache when possible (check Redis or logs).
- [ ] Editing a task in one tab updates the list in another (WebSocket).
- [ ] Rate limiting responds with 429 after limit.

---

## Quick Reference: Main Tech Choices

| Area | Choice | Reason |
|------|--------|--------|
| Auth | JWT + refresh tokens | Stateless, scalable |
| DB | MongoDB | Document model fits org/task/user |
| Cache / Pub/Sub | Redis | Cache + rate limit + real-time |
| Real-time | WebSocket + Redis Pub/Sub | Per-org rooms, horizontal scale |
| Scaling | Stateless Node, shard by orgId | Horizontal scaling path |

Use this guide as you implement each part. Start with **Step 1** (prerequisites + env), then **Step 2** (structure), then **Step 3** (backend) and **Step 4** (frontend).
