import express from 'express';
import { db, host, port as dbPort, database as dbName, useSsl } from './db/config.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3779;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api', mainRouter);

app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    console.log(`Connecting to database at ${host}:${dbPort} (database: "${dbName}", ssl: ${useSsl ? 'enabled' : 'disabled'})...`);
    // Test database connection
    const connection = await db.getConnection();
    console.log('Database connection established successfully.');
    connection.release();

    app.listen(port, err => {
      if (err) {
        console.error('Failed to start the server:', err.message);
        process.exit(1);
      }
      console.log(`Server running on port http://localhost:${port}`);
    });
  } catch (error) {
    console.error(
      'Failed to connect to the database. Server not started.',
      error.message,
    );
    if (error.code === 'ENOTFOUND') {
      console.error(
        `[DNS Error] Host "${host}" could not be resolved. Please verify DB_HOST in your Render Environment settings: ensure there are no accidental spaces, quotes, or trailing port numbers, and verify that your cloud database (Aiven) is active and running.`
      );
    }
    process.exit(1);
  }
};

startServer();
