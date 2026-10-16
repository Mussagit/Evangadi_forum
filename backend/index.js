import express from 'express';
import { db, host, port as dbPort, database as dbName, useSsl } from './db/config.js';
import { initDbSchema } from './db/initDb.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';
import cors from 'cors';

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
