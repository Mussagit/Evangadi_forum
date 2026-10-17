import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

function getPoolConfig() {
  const uri = process.env.DATABASE_URL || process.env.MYSQL_URL;

  // Defaults with support for standard alternatives (DB_PASS / DB_PASSWORD, DB_NAME / DB_DATABASE, etc.)
  let host = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
  let port = process.env.DB_PORT || process.env.MYSQLPORT ? Number(process.env.DB_PORT || process.env.MYSQLPORT) : 3306;
  let user = process.env.DB_USER || process.env.DB_USERNAME || process.env.MYSQLUSER || 'root';
  let password = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
  let database = process.env.DB_NAME || process.env.DB_DATABASE || process.env.MYSQLDATABASE || 'evangadi_forum';

  // If a connection URI is provided (e.g. from Aiven Service URI or Railway)
  if (uri && uri.trim()) {
    try {
      const parsed = new URL(uri.trim());
      if (parsed.hostname) host = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
      if (parsed.username) user = decodeURIComponent(parsed.username);
      if (parsed.password) password = decodeURIComponent(parsed.password);
      if (parsed.pathname && parsed.pathname.length > 1) {
        database = decodeURIComponent(parsed.pathname.slice(1));
      }
    } catch (e) {
      console.warn('Could not parse connection URI, falling back to individual DB_* vars:', e.message);
    }
  }

  // Explicit individual variables take highest priority if set
  if (process.env.DB_PASS || process.env.DB_PASSWORD) {
    password = process.env.DB_PASS || process.env.DB_PASSWORD;
  }
  if (process.env.DB_USER || process.env.DB_USERNAME) {
    user = process.env.DB_USER || process.env.DB_USERNAME;
  }
  if (process.env.DB_HOST) {
    host = process.env.DB_HOST;
  }
  if (process.env.DB_PORT) {
    port = Number(process.env.DB_PORT);
  }
  if (process.env.DB_NAME || process.env.DB_DATABASE) {
    database = process.env.DB_NAME || process.env.DB_DATABASE;
  }

  // Clean up host (trim spaces/newlines, remove quotes, strip protocol or attached port)
  if (typeof host === 'string') {
    host = host.trim().replace(/^["']|["']$/g, '');
    if (host.includes('://')) {
      try {
        const parsed = new URL(host);
        if (parsed.port) port = Number(parsed.port);
        if (parsed.pathname && parsed.pathname.length > 1 && !process.env.DB_NAME) {
          database = decodeURIComponent(parsed.pathname.slice(1));
        }
        host = parsed.hostname;
      } catch (_) {
        host = host.replace(/^[a-zA-Z]+:\/\//, '');
      }
    }
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      const parsedPort = Number(parts[1]);
      if (!isNaN(parsedPort) && parsedPort > 0) {
        port = parsedPort;
      }
    }
    host = host.replace(/\/+$/, '').trim();
  }

  if (typeof user === 'string') user = user.trim().replace(/^["']|["']$/g, '');
  if (typeof password === 'string') password = password.trim().replace(/^["']|["']$/g, '');
  if (typeof database === 'string') database = database.trim().replace(/^["']|["']$/g, '');

  // For Aiven cloud MySQL, the default database is 'defaultdb'
  if (!process.env.DB_NAME && !process.env.DB_DATABASE && host.includes('aivencloud.com') && database === 'evangadi_forum') {
    database = 'defaultdb';
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1';
  // SSL: Cloud MySQL hosts (Aiven, TiDB, PlanetScale, Railway) require SSL.
  // Explicit DB_SSL overrides: 'true' -> enable, 'false' -> disable.
  const useSsl = process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === 'true'
    : !isLocal;

  console.log('[DB Config] Initialized settings:', {
    host,
    port: port || 3306,
    user,
    database,
    useSsl,
    hasPassword: Boolean(password),
    passLength: password ? password.length : 0,
  });

  const poolOptions = {
    host,
    port: port || 3306,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  if (useSsl) {
    poolOptions.ssl = {
      rejectUnauthorized: false,
    };
  }

  return { poolOptions, host, port: port || 3306, database, user, useSsl };
}

const { poolOptions, host, port, database, user, useSsl } = getPoolConfig();

export { host, port, database, user, useSsl };

// Database connection pool
export const db = mysql.createPool(poolOptions);

const ensureParams = params => {
  if (params === undefined || params === null) {
    throw new Error('SQL parameters are required');
  }
  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === 'object';
  if (!isArray && !isObject) {
    throw new Error('SQL parameters must be an array or object');
  }
};

export const safeExecute = async (sql, params) => {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error('SQL query must be a non-empty string');
  }
  ensureParams(params);
  const [result] = await db.execute(sql, params);
  return result;
};
