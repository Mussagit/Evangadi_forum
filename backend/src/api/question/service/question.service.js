import { safeExecute } from '../../../../db/config.js';
import { generateHash16 } from '../../../utils/hash.js';
import { embedText, cosineSimilarity } from '../../../utils/ai/gemini.client.js';
import { NotFoundError, ForbiddenError } from '../../../utils/errors/index.js';

const RESULT_LIMIT = 100;
const DEFAULT_K = 5;
const DEFAULT_THRESHOLD = Number(process.env.RECOMMEND_THRESHOLD) || 0.75;

/**
 * Fetches questions, optionally filtered by a keyword search and/or
 * restricted to the authenticated user's own questions.
 *
 * @param {Object} filters
 * @param {string} [filters.search] - Keyword to match against title/content.
 * @param {boolean} [filters.mine] - When true, only return questions owned by `userId`.
 * @param {number} filters.userId - The authenticated user's ID (from the JWT, never the client).
 * @returns {Promise<Object[]>} Formatted question objects.
 */
export const getQuestionsService = async ({ search, mine, userId }) => {
  const conditions = [];
  const params = [];

  if (mine) {
    conditions.push('q.user_id = ?');
    params.push(userId);
  }

  if (search) {
    conditions.push('(q.title LIKE ? OR q.content LIKE ?)');
    const likeTerm = `%${search}%`;
    params.push(likeTerm, likeTerm);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id AS author_id,
      u.first_name AS author_first_name,
      u.last_name AS author_last_name,
      COUNT(a.answer_id) AS answer_count
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    LEFT JOIN answers a ON a.question_id = q.question_id
    ${whereClause}
    GROUP BY q.question_id, u.user_id, u.first_name, u.last_name
    ORDER BY q.created_at DESC
    LIMIT ${RESULT_LIMIT}
  `;

  const rows = await safeExecute(sql, params);

  return rows.map(formatQuestionRow);
};

/**
 * Maps a joined question+author SQL row into the API's camelCase shape.
 */
function formatQuestionRow(row) {
  return {
    id: row.question_id,
    questionHash: row.question_hash,
    title: row.title,
    content: row.content,
    answerCount: Number(row.answer_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
    },
  };
}

/**
 * Creates a new question, stores it, and (best-effort) generates + stores
 * a vector embedding of the title for semantic search.
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 * @param {number} data.userId
 */
export const createQuestionWithVectorService = async ({ title, content, userId }) => {
  const questionHash = generateHash16();

  const insertResult = await safeExecute(
    'INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)',
    [questionHash, userId, title, content],
  );

  const questionId = insertResult.insertId;

  try {
    const embedding = await embedText(title, 'RETRIEVAL_DOCUMENT');
    await safeExecute(
      'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)',
      [questionId, title, JSON.stringify(embedding), 'ready'],
    );
  } catch (error) {
    // Embedding is best-effort: the question itself was already saved.
    await safeExecute(
      'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)',
      [questionId, title, JSON.stringify([]), 'failed'],
    ).catch(() => {});
  }

  return {
    id: questionId,
    questionHash,
    title,
    content,
    userId,
  };
};

/**
 * Fetches a single question (with author) plus all of its answers (with
 * their authors) by the question's public hash.
 *
 * @param {string} questionHash
 */
export const getSingleQuestionService = async questionHash => {
  const questionRows = await safeExecute(
    `SELECT
       q.question_id, q.question_hash, q.title, q.content,
       q.created_at, q.updated_at,
       u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name,
       (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.question_id) AS answer_count
     FROM questions q
     JOIN users u ON u.user_id = q.user_id
     WHERE q.question_hash = ?`,
    [questionHash],
  );

  if (questionRows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  const question = formatQuestionRow(questionRows[0]);

  const answerRows = await safeExecute(
    `SELECT
       a.answer_id, a.content, a.created_at, a.updated_at,
       u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name
     FROM answers a
     JOIN users u ON u.user_id = a.user_id
     WHERE a.question_id = ?
     ORDER BY a.created_at ASC
     LIMIT ${RESULT_LIMIT}`,
    [question.id],
  );

  const answers = answerRows.map(row => ({
    id: row.answer_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
    },
  }));

  return {
    question,
    answers,
    answersMeta: { limit: RESULT_LIMIT, total: answers.length },
  };
};

/**
 * Hydrates a set of `{ questionId, score }` matches with full question +
 * author details, preserving the incoming order (already sorted by score).
 */
async function hydrateScoredQuestions(matches) {
  if (matches.length === 0) return [];

  const ids = matches.map(m => m.questionId);
  const placeholders = ids.map(() => '?').join(',');

  const rows = await safeExecute(
    `SELECT
       q.question_id, q.question_hash, q.title, q.content,
       q.created_at, q.updated_at,
       u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name,
       (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.question_id) AS answer_count
     FROM questions q
     JOIN users u ON u.user_id = q.user_id
     WHERE q.question_id IN (${placeholders})`,
    ids,
  );

  const byId = new Map(rows.map(row => [row.question_id, formatQuestionRow(row)]));

  return matches
    .map(m => {
      const question = byId.get(m.questionId);
      if (!question) return null;
      return { ...question, score: m.score };
    })
    .filter(Boolean);
}

/**
 * Semantic search over all questions using cosine similarity against
 * their stored title embeddings.
 *
 * @param {Object} params
 * @param {string} params.query
 * @param {number} [params.k]
 * @param {number} [params.threshold]
 */
export const searchQuestionsSemanticService = async ({ query, k, threshold }) => {
  const effectiveK = k || DEFAULT_K;
  const effectiveThreshold = threshold ?? DEFAULT_THRESHOLD;

  const queryEmbedding = await embedText(query, 'RETRIEVAL_QUERY');

  const vectorRows = await safeExecute(
    `SELECT question_id, embedding FROM question_vectors WHERE status = 'ready'`,
    [],
  );

  const scored = vectorRows
    .map(row => {
      const embedding = safeParseEmbedding(row.embedding);
      if (!embedding) return null;
      return {
        questionId: row.question_id,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter(Boolean)
    .filter(m => m.score >= effectiveThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, effectiveK);

  const data = await hydrateScoredQuestions(scored);

  return {
    data,
    meta: {
      total: data.length,
      k: effectiveK,
      threshold: effectiveThreshold,
      query,
      questionHash: null,
    },
  };
};

/**
 * Finds questions similar to a given question, excluding itself.
 *
 * @param {Object} params
 * @param {string} params.questionHash
 * @param {number} [params.k]
 * @param {number} [params.threshold]
 */
export const getSimilarQuestionsService = async ({ questionHash, k, threshold }) => {
  const effectiveK = k || DEFAULT_K;
  const effectiveThreshold = threshold ?? DEFAULT_THRESHOLD;

  const sourceRows = await safeExecute(
    `SELECT q.question_id, qv.embedding
     FROM questions q
     LEFT JOIN question_vectors qv ON qv.question_id = q.question_id AND qv.status = 'ready'
     WHERE q.question_hash = ?`,
    [questionHash],
  );

  if (sourceRows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  const sourceEmbedding = safeParseEmbedding(sourceRows[0].embedding);
  const sourceQuestionId = sourceRows[0].question_id;

  if (!sourceEmbedding) {
    return {
      data: [],
      meta: { total: 0, k: effectiveK, threshold: effectiveThreshold, query: null, questionHash },
    };
  }

  const vectorRows = await safeExecute(
    `SELECT question_id, embedding FROM question_vectors WHERE status = 'ready' AND question_id != ?`,
    [sourceQuestionId],
  );

  const scored = vectorRows
    .map(row => {
      const embedding = safeParseEmbedding(row.embedding);
      if (!embedding) return null;
      return {
        questionId: row.question_id,
        score: cosineSimilarity(sourceEmbedding, embedding),
      };
    })
    .filter(Boolean)
    .filter(m => m.score >= effectiveThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, effectiveK);

  const data = await hydrateScoredQuestions(scored);

  return {
    data,
    meta: {
      total: data.length,
      k: effectiveK,
      threshold: effectiveThreshold,
      query: null,
      questionHash,
    },
  };
};

function safeParseEmbedding(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a question's title/content by hash. Used by the Answer Fit
 * feature to ground the AI prompt.
 * @param {string} questionHash
 */
export const getQuestionByHashService = async questionHash => {
  const rows = await safeExecute(
    'SELECT question_id, title, content, user_id FROM questions WHERE question_hash = ?',
    [questionHash],
  );
  if (rows.length === 0) {
    throw new NotFoundError('Question not found.');
  }
  return rows[0];
};

/**
 * Updates a question's title and/or content. Only the question's owner may
 * edit it. Also refreshes the vector embedding so semantic search stays
 * accurate.
 *
 * @param {Object} data
 * @param {string} data.questionHash
 * @param {string} data.title
 * @param {string} data.content
 * @param {number} data.userId  - The authenticated user making the request.
 */
export const updateQuestionService = async ({ questionHash, title, content, userId }) => {
  const rows = await safeExecute(
    'SELECT question_id, user_id FROM questions WHERE question_hash = ?',
    [questionHash],
  );

  if (rows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  if (rows[0].user_id !== userId) {
    throw new ForbiddenError('You can only edit your own questions.');
  }

  const questionId = rows[0].question_id;

  await safeExecute(
    'UPDATE questions SET title = ?, content = ?, updated_at = NOW() WHERE question_id = ?',
    [title, content, questionId],
  );

  // Best-effort: re-embed the updated title so similarity search stays fresh.
  try {
    const embedding = await embedText(title, 'RETRIEVAL_DOCUMENT');
    await safeExecute(
      `INSERT INTO question_vectors (question_id, source_text, embedding, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE source_text = VALUES(source_text),
                               embedding   = VALUES(embedding),
                               status      = VALUES(status)`,
      [questionId, title, JSON.stringify(embedding), 'ready'],
    );
  } catch {
    // Non-fatal: the text update already succeeded.
  }

  const updated = await safeExecute(
    `SELECT q.question_id, q.question_hash, q.title, q.content,
            q.created_at, q.updated_at,
            u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name,
            (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.question_id) AS answer_count
     FROM questions q
     JOIN users u ON u.user_id = q.user_id
     WHERE q.question_id = ?`,
    [questionId],
  );

  return formatQuestionRow(updated[0]);
};

/**
 * Permanently deletes a question (and its answers + vector via CASCADE).
 * Only the owner may delete.
 *
 * @param {Object} data
 * @param {string} data.questionHash
 * @param {number} data.userId
 */
export const deleteQuestionService = async ({ questionHash, userId }) => {
  const rows = await safeExecute(
    'SELECT question_id, user_id FROM questions WHERE question_hash = ?',
    [questionHash],
  );

  if (rows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  if (rows[0].user_id !== userId) {
    throw new ForbiddenError('You can only delete your own questions.');
  }

  await safeExecute('DELETE FROM questions WHERE question_id = ?', [rows[0].question_id]);
};
