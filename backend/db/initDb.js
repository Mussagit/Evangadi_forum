import { db } from './config.js';

const tables = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`user_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`first_name\` VARCHAR(50) NOT NULL,
        \`last_name\` VARCHAR(50) NOT NULL,
        \`email\` VARCHAR(320) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'questions',
    sql: `
      CREATE TABLE IF NOT EXISTS \`questions\` (
        \`question_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`question_hash\` CHAR(16) NOT NULL UNIQUE,
        \`user_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        INDEX \`idx_questions_user_id\` (\`user_id\`),
        INDEX \`idx_questions_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'question_vectors',
    sql: `
      CREATE TABLE IF NOT EXISTS \`question_vectors\` (
        \`vector_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`question_id\` INT NOT NULL,
        \`source_text\` TEXT NOT NULL,
        \`embedding\` JSON NOT NULL,
        \`status\` VARCHAR(20) DEFAULT 'ready',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`question_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_question_vectors_question_id\` (\`question_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'answers',
    sql: `
      CREATE TABLE IF NOT EXISTS \`answers\` (
        \`answer_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`question_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`content\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`question_id\`) REFERENCES \`questions\`(\`question_id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        INDEX \`idx_answers_question_id\` (\`question_id\`),
        INDEX \`idx_answers_user_id\` (\`user_id\`),
        INDEX \`idx_answers_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'documents',
    sql: `
      CREATE TABLE IF NOT EXISTS \`documents\` (
        \`document_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`title\` VARCHAR(512) NOT NULL,
        \`mime_type\` VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
        \`storage_path\` VARCHAR(1024) NOT NULL,
        \`byte_size\` BIGINT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
        \`error_message\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        INDEX \`idx_documents_user_created\` (\`user_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'document_chunks',
    sql: `
      CREATE TABLE IF NOT EXISTS \`document_chunks\` (
        \`chunk_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`document_id\` INT NOT NULL,
        \`chunk_index\` INT NOT NULL,
        \`content\` TEXT NOT NULL,
        \`page_start\` INT NULL,
        \`page_end\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`document_id\`) REFERENCES \`documents\`(\`document_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_document_chunks_doc_index\` (\`document_id\`, \`chunk_index\`),
        INDEX \`idx_document_chunks_document_id\` (\`document_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'document_chunk_vectors',
    sql: `
      CREATE TABLE IF NOT EXISTS \`document_chunk_vectors\` (
        \`chunk_vector_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`chunk_id\` BIGINT NOT NULL,
        \`source_text\` TEXT NOT NULL,
        \`embedding\` JSON NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'ready',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`chunk_id\`) REFERENCES \`document_chunks\`(\`chunk_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_chunk_vectors_chunk_id\` (\`chunk_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'answer_replies',
    sql: `
      CREATE TABLE IF NOT EXISTS \`answer_replies\` (
        \`reply_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`answer_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`content\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`answer_id\`) REFERENCES \`answers\`(\`answer_id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        INDEX \`idx_replies_answer_id\` (\`answer_id\`),
        INDEX \`idx_replies_user_id\` (\`user_id\`),
        INDEX \`idx_replies_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'answer_vectors',
    sql: `
      CREATE TABLE IF NOT EXISTS \`answer_vectors\` (
        \`vector_id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`answer_id\` INT NOT NULL,
        \`source_text\` TEXT NOT NULL,
        \`embedding\` JSON NOT NULL,
        \`status\` VARCHAR(20) DEFAULT 'ready',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`answer_id\`) REFERENCES \`answers\`(\`answer_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_answer_vectors_answer_id\` (\`answer_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
];

export async function initDbSchema() {
  const conn = await db.getConnection();
  try {
    for (const table of tables) {
      await conn.query(table.sql);
    }
    console.log('Database tables verified / initialized successfully.');
  } catch (err) {
    console.warn('Database initialization note:', err.message);
  } finally {
    conn.release();
  }
}
