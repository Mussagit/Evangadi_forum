# AI-Powered Forum — Frontend

React 19 client for the AI-Powered Forum, built with Vite.

## Stack

- React 19
- Vite 8
- Axios (via shared instance in `src/api/axiosInstance.js`)

## Getting started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Environment variable

Create `frontend/.env` from the example:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:5000/api
```

## Available scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the Vite development server    |
| `npm run build` | Build for production                 |
| `npm run preview` | Preview the production build       |
| `npm run lint`  | Run Oxlint                           |

## Project structure

```text
src/
├── api/          Shared Axios instance
├── components/   Reusable UI components
├── context/      AuthContext and providers
├── pages/        Route-level page components
├── routes/       ProtectedRoute and router config
└── services/     API service functions
```

See the root [README.md](../README.md) for full project setup and the [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
