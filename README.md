# AI-Powered Forum

A full-stack web application built with React, Express, and MySQL. This repository contains the backend API and frontend client for the AI-Powered Forum project.

## Tech stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Frontend | React 19, Vite, Axios          |
| Backend  | Node.js, Express               |
| Database | MySQL                          |
| Auth     | JWT, bcrypt                    |

## Repository structure

```text
ai-powered-forum/
├── backend/    Express API server
└── frontend/   React client
```

## Prerequisites

- Node.js 18 or later
- MySQL 8 or later
- npm

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/eyob-github/ai-powered-forum.git
cd ai-powered-forum
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit each `.env` file with your local values. Never commit `.env` files.

### 4. Set up the database

Apply the migration in `backend/database/migrations/` to your MySQL instance.

### 5. Start the development servers

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run dev
```

```bash
# Terminal 2 — frontend
cd frontend
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173` by default.

## Environment variables

### Backend (`backend/.env`)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

Do not add secrets to variables prefixed with `VITE_` — Vite bundles them into the browser.

## API health check

```bash
curl http://localhost:5000/api/health
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, coding standards, commit conventions, and pull-request guidelines.

See [TASKS.md](TASKS.md) for the milestone task breakdown and end-to-end verification checklist.

See [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md) for daily coordination, dependency rules, and integration workflow.
