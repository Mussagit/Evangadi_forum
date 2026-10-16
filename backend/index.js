import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, host, port as dbPort, database as dbName, useSsl } from './db/config.js';
import { initDbSchema } from './db/initDb.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

const app = express();
const port = process.env.PORT || 3779;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let isDbConnected = false;
let dbInitError = null;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isDbConnected ? 'connected' : (dbInitError ? `error: ${dbInitError.message}` : 'connecting'),
    timestamp: new Date(),
  });
});

// Guard API routes if database is not reachable yet
app.use('/api', (req, res, next) => {
  if (!isDbConnected && dbInitError) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'The server could not connect to the database. Please verify your database settings (DATABASE_URL or DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT, DB_SSL) in the Render Environment tab.',
      details: dbInitError.message,
    });
  }
  next();
});

app.use('/api', mainRouter);

// Serve static frontend files if frontend build exists
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Fallback status card if frontend has not been built
app.get('/', (req, res, next) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Evangadi Forum API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border-radius: 12px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
        h1 { margin-top: 0; font-size: 24px; color: #38bdf8; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        .badge-success { background: #065f46; color: #34d399; }
        .badge-warning { background: #78350f; color: #fbbf24; }
        p { color: #94a3b8; line-height: 1.6; }
        ul { padding-left: 20px; color: #cbd5e1; }
        li { margin-bottom: 8px; }
        a { color: #38bdf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #f472b6; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Evangadi Forum API</h1>
        <div class="badge ${isDbConnected ? 'badge-success' : 'badge-warning'}">
          ${isDbConnected ? '● Online & Database Connected' : '▲ Online (Database Connecting...)'}
        </div>
        <p>The backend API server is up and running successfully on Render.</p>
        <ul>
          <li><strong>Health Check:</strong> <a href="/health">/health</a></li>
          <li><strong>API Base:</strong> <code>/api</code></li>
          <li><strong>Questions API:</strong> <a href="/api/questions">/api/questions</a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Single Page Application (SPA) routing: any frontend route loads index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.use(errorHandler);

// Attempt database connection with retries without crashing the HTTP server
const connectDbWithRetry = async (retries = 3, delayMs = 4000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Connecting to database at ${host}:${dbPort} (database: "${dbName}", ssl: ${useSsl ? 'enabled' : 'disabled'})...`);
      const connection = await db.getConnection();
      console.log('Database connection established successfully.');
      connection.release();

      await initDbSchema();
      isDbConnected = true;
      dbInitError = null;
      console.log('Database schema verified. All systems ready.');
      return;
    } catch (error) {
      dbInitError = error;
      console.error(`Database connection attempt ${attempt} failed:`, error.message);
      if (error.code === 'ENOTFOUND') {
        console.error(`[DNS Error] Host "${host}" could not be resolved. Please verify DB_HOST in your Render Environment settings.`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`[Connection Refused] Could not connect to "${host}:${dbPort}". If this is on Render, 127.0.0.1 is not accessible. Please add your remote MySQL database credentials (e.g. Aiven) to the Render Environment tab.`);
      }
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
};

// Start server
const startServer = () => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running and listening on 0.0.0.0:${port}`);
    // Initiate DB connection in background so Render health-check passes immediately
    connectDbWithRetry();
  });

  server.on('error', err => {
    console.error('Failed to start the server:', err.message);
    process.exit(1);
  });
};

startServer();

export { app };
