# BlueTree Domain Selector

## What it does
Internal tool for BlueTree Digital. Scores publisher domains from a vendor CSV against a client brief using a configurable 7-dimension scoring engine. Returns a ranked shortlist with score breakdowns for the delivery team to review and export.

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Server

cd server
npm install
node index.js

Server runs on http://localhost:3001

### Client

cd client
npm install
npm run dev

Client runs on http://localhost:5173

### Environment variables
Client: create client/.env from client/.env.example
Server: create server/.env from server/.env.example (optional for local — PORT defaults to 3001)

## Deployment

### Frontend → Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Set root directory to: client
4. Add environment variable: VITE_API_URL = https://your-render-backend-url.onrender.com
5. Deploy

### Backend → Render
1. Go to render.com → New → Web Service
2. Connect your GitHub repo
3. Set root directory to: server
4. Set build command: npm install
5. Set start command: node index.js
6. Add environment variables:
   - CORS_ORIGIN = https://your-vercel-frontend-url.vercel.app
   - NODE_ENV = production
7. Deploy

Note: the backend is on Render free tier and may take 20-30 seconds to wake up on first visit. The UI shows a loading indicator during this time.

## How to update the scoring config

The scoring weights are stored in SQLite and editable at runtime without redeployment.

### Profile IDs
- 1 = Standard
- 2 = SaaS
- 3 = Ecommerce
- 4 = Fintech
- 5 = Local

### Update a profile's weights
Send a PUT request to /api/config/profiles/:id

Example — raise niche weight for Ecommerce profile:

curl -X PUT https://your-backend.onrender.com/api/config/profiles/3 \
  -H "Content-Type: application/json" \
  -d '{"niche_weight": 55, "dr_weight": 8, "traffic_weight": 8, "price_weight": 10, "ranking_weight": 10, "geo_weight": 5, "red_flags_weight": 4}'

The change takes effect immediately. A version snapshot is saved automatically before any update.

### View all profiles
GET /api/config/profiles

### View version history
GET /api/config/versions

## How to rollback a config change

1. Get the version ID you want to restore:
GET /api/config/versions

2. Roll back to that version:
POST /api/config/rollback/:versionId

Example:
curl -X POST https://your-backend.onrender.com/api/config/rollback/3

This restores all profile weights to what they were at that snapshot. Takes effect immediately.

## How to update disqualifier thresholds

Minimum DR, minimum traffic, and follow preference are stored per profile in the scoring_profiles table.
Update them via the same PUT /api/config/profiles/:id endpoint.

Example — raise minimum DR for Standard profile to 50:

curl -X PUT https://your-backend.onrender.com/api/config/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"min_dr": 50, "min_traffic": 2000, "follow_preference": "dofollow"}'

## Tech stack
- Frontend: React + Vite, deployed on Vercel
- Backend: Node.js + Express, deployed on Render
- Database: SQLite (better-sqlite3), reseeds automatically on startup
- Scoring: Deterministic keyword overlap, no LLM calls
- Export: xlsx library, 4-tab XLSX matching BlueTree campaign management template
