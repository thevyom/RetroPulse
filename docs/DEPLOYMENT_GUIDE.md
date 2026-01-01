# RetroPulse Deployment Guide

Complete guide for running, testing, and deploying RetroPulse (frontend + backend).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Docker Development](#docker-development)
4. [Running E2E Tests](#running-e2e-tests)
5. [Production Deployment](#production-deployment)
6. [Environment Variables](#environment-variables)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose (for containerized deployment)
- MongoDB 7.0+ (or use Docker)

### Fastest Path to Running

```bash
# Clone and install
git clone <repo-url>
cd RetroPulse

# Start everything with Docker
docker compose --profile dev up -d

# Access the app
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000
# MongoDB Admin: http://localhost:8081
```

---

## Local Development

Run services directly on your machine for faster iteration.

### 1. Start MongoDB

**Option A: Docker (recommended)**
```bash
docker compose up mongodb -d
```

**Option B: Local MongoDB**
```bash
mongod --dbpath /path/to/data
```

### 2. Start Backend

```bash
cd backend
pnpm install
cp .env.example .env  # Configure if needed
pnpm dev
```

Backend runs at: `http://localhost:3001`

### 3. Start Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs at: `http://localhost:5173`

### 4. Verify Everything Works

1. Open `http://localhost:5173` in your browser
2. Create a new board
3. Join with an alias
4. Create some cards

---

## Docker Development

Use Docker Compose for consistent, isolated environments.

### Available Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| (none) | mongodb only | Local dev with hot reload |
| `dev` | mongodb + mongo-express | Dev with DB admin UI |
| `production` | mongodb + backend + frontend | Full stack containerized |

### Start Commands

```bash
# Just MongoDB (for local backend/frontend dev)
docker compose up mongodb -d

# MongoDB + Admin UI
docker compose --profile dev up -d

# Full stack (all services)
docker compose --profile production up -d

# Rebuild after code changes
docker compose --profile production up -d --build
```

### Service URLs (Docker)

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:8080 | nginx serving built React app |
| Backend API | http://localhost:3000 | Node.js API server |
| MongoDB | localhost:27017 | Database |
| Mongo Express | http://localhost:8081 | DB admin (dev profile only) |

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Running E2E Tests

E2E tests require both frontend and backend running.

### Prerequisites

```bash
# Install Playwright browsers (one time)
cd frontend
npx playwright install chromium
```

### Option 1: Local Services

```bash
# Terminal 1: Start backend
cd backend && pnpm dev

# Terminal 2: Start frontend
cd frontend && pnpm dev

# Terminal 3: Run E2E tests
cd frontend && pnpm test:e2e
```

### Option 2: Docker Services

```bash
# Start backend and MongoDB
docker compose --profile production up mongodb backend -d

# Wait for backend to be healthy
curl http://localhost:3000/health

# Run frontend dev server locally (for Playwright)
cd frontend && pnpm dev

# Run E2E tests
cd frontend && pnpm test:e2e
```

### Option 3: Full Docker E2E (CI/CD)

```bash
# Start all services
docker compose --profile production up -d

# Run Playwright against containerized frontend
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:8080 pnpm test:e2e
```

### E2E Test Results

```bash
# View test UI
cd frontend && pnpm test:e2e:ui

# View HTML report after run
npx playwright show-report
```

### E2E Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BACKEND_READY` | auto-detected | Set by global-setup if backend responds |
| `TEST_BOARD_ID` | generated | Specific board ID for tests |
| `PLAYWRIGHT_BASE_URL` | http://localhost:5173 | Frontend URL to test |

---

## Production Deployment

### Docker Build

```bash
# Build production images
docker compose --profile production build

# Tag for registry
docker tag retropulse-frontend:latest your-registry/retropulse-frontend:v1.0.0
docker tag retropulse-backend:latest your-registry/retropulse-backend:v1.0.0

# Push to registry
docker push your-registry/retropulse-frontend:v1.0.0
docker push your-registry/retropulse-backend:v1.0.0
```

### Production docker-compose.yml

```yaml
version: '3.9'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    image: your-registry/retropulse-backend:v1.0.0
    restart: always
    depends_on:
      mongodb:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017
      MONGODB_DATABASE: retroboard
      COOKIE_SECRET: ${COOKIE_SECRET}
      ADMIN_SECRET_KEY: ${ADMIN_SECRET_KEY}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "3000:3000"

  frontend:
    image: your-registry/retropulse-frontend:v1.0.0
    restart: always
    depends_on:
      - backend
    environment:
      API_URL: ${API_URL:-http://backend:3000}
    ports:
      - "80:8080"

volumes:
  mongo-data:
```

### Cloud Deployment Options

| Platform | Frontend | Backend | Database |
|----------|----------|---------|----------|
| AWS | S3 + CloudFront | ECS/Fargate | DocumentDB |
| GCP | Cloud Storage + CDN | Cloud Run | MongoDB Atlas |
| Azure | Blob Storage + CDN | Container Apps | Cosmos DB |
| Vercel | Vercel | - | - |
| Railway | Railway | Railway | Railway MongoDB |
| Render | Render Static | Render Web Service | MongoDB Atlas |

### Recommended: Static Frontend + API Backend

For production, consider:

1. **Frontend**: Deploy to CDN (Vercel, Netlify, CloudFront)
   ```bash
   cd frontend
   pnpm build
   # Upload dist/ to your CDN
   ```

2. **Backend**: Deploy to container platform
   ```bash
   docker build -t retropulse-backend ./backend
   # Deploy to ECS, Cloud Run, etc.
   ```

3. **Database**: Use managed MongoDB (Atlas recommended)

---

## Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=retroboard

# Security
COOKIE_SECRET=your-secure-cookie-secret-min-32-chars
ADMIN_SECRET_KEY=your-admin-api-key

# CORS
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:3001

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (runtime via env.js)

```bash
# Injected at container startup
API_URL=http://localhost:3001
WS_URL=http://localhost:3001
```

### Docker Compose (.env)

```bash
# MongoDB
MONGO_PASSWORD=your-secure-password

# Backend
COOKIE_SECRET=your-secure-cookie-secret-min-32-chars
ADMIN_SECRET_KEY=your-admin-api-key
FRONTEND_URL=http://localhost:8080

# Frontend
API_URL=http://localhost:3000
```

---

## Troubleshooting

### Backend won't start

```bash
# Check MongoDB is running
docker compose ps mongodb
curl http://localhost:27017

# Check backend logs
docker compose logs backend
# or
cd backend && pnpm dev 2>&1
```

### Frontend can't connect to backend

1. Check CORS configuration in backend
2. Verify `API_URL` matches backend location
3. Check browser console for errors

```bash
# Test backend health
curl http://localhost:3001/health

# Test from frontend container
docker exec retropulse-frontend wget -qO- http://backend:3000/health
```

### E2E tests all skip

```bash
# Check if backend is responding
curl http://localhost:3001/health

# Check E2E_BACKEND_READY is set
cd frontend
E2E_BACKEND_READY=true pnpm test:e2e
```

### MongoDB connection refused

```bash
# Check MongoDB is running
docker compose ps
docker compose logs mongodb

# Check connection string
# Local: mongodb://localhost:27017
# Docker: mongodb://admin:password@mongodb:27017
```

### Docker build fails

```bash
# Clear Docker cache
docker compose build --no-cache

# Check disk space
docker system df
docker system prune -a
```

### WebSocket connection fails

1. Check frontend `WS_URL` configuration
2. Verify no proxy is blocking WebSocket upgrade
3. Check browser console for `socket.io` errors

```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3001/socket.io/
```

---

## Health Checks

### Backend

```bash
curl http://localhost:3001/health
# Response: {"status":"ok","mongodb":"connected"}
```

### Frontend

```bash
curl http://localhost:8080/health
# Response: healthy
```

### MongoDB

```bash
docker exec retropulse-mongodb mongosh --eval "db.adminCommand('ping')"
# Response: { ok: 1 }
```

---

## Ports Summary

| Service | Development | Docker | Production |
|---------|-------------|--------|------------|
| Frontend | 5173 | 8080 | 80/443 |
| Backend | 3001 | 3000 | 3000 |
| MongoDB | 27017 | 27017 | 27017 |
| Mongo Express | - | 8081 | - |

---

## Related Documents

- [Backend Phase 8 - Integration Testing](backend/phases/BACKEND_PHASE_08_INTEGRATION_TESTING.md)
- [Frontend Phase 8 - Polish & Production](frontend/phases/FRONTEND_PHASE_08_POLISH_PRODUCTION.md)
- [Frontend E2E Test Report](frontend/code-review/TEST_PHASE_07_E2ETesting.md)
