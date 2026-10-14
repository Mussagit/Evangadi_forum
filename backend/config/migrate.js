/**
 * Migration: add answer_replies and answer_vectors tables.
 * Run once: node config/migrate.js
 */
import { db } from '../db/config.js';

const migrations = [
  {
    name: 'answer_replies',
    sql: `
      CREATE TABLE IF NOT EXISTS \`answer_replies\` (
        \`reply_id\`   INT AUTO_INCREMENT PRIMARY KEY,
        \`answer_id\`  INT NOT NULL,
        \`user_id\`    INT NOT NULL,
        \`content\`    TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`answer_id\`) REFERENCES \`answers\`(\`answer_id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`)   REFERENCES \`users\`(\`user_id\`)   ON DELETE CASCADE,
        INDEX \`idx_replies_answer_id\`  (\`answer_id\`),
        INDEX \`idx_replies_user_id\`    (\`user_id\`),
        INDEX \`idx_replies_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'answer_vectors',
    sql: `
      CREATE TABLE IF NOT EXISTS \`answer_vectors\` (
        \`vector_id\`   BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`answer_id\`   INT NOT NULL,
        \`source_text\` TEXT NOT NULL,
        \`embedding\`   JSON NOT NULL,
        \`status\`      VARCHAR(20) DEFAULT 'ready',
        \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`answer_id\`) REFERENCES \`answers\`(\`answer_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_answer_vectors_answer_id\` (\`answer_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
];

async function run() {
  const conn = await db.getConnection();
  try {
    for (const m of migrations) {
      console.log(`Running migration: ${m.name}...`);
      await conn.execute(m.sql);
      console.log(`  ✓ ${m.name} ready`);
    }
    console.log('\nAll migrations applied successfully.');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
