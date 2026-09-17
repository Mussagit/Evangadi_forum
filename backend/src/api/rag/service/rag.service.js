import fs from 'fs/promises';
import path from 'path';
import { safeExecute } from '../../../../db/config.js';
import { NotFoundError, BadRequestError } from '../../../utils/errors/index.js';
import { embedText, generateText, cosineSimilarity } from '../../../utils/ai/gemini.client.js';
import { extractPdfText } from '../../../utils/pdf/extract-text.js';
import { chunkText } from '../../../utils/pdf/chunk-text.js';
import { ragUploadRoot } from '../config/rag.upload.config.js';

const CHUNK_CHARS = Number(process.env.RAG_CHUNK_CHARS) || 900;
const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP) || 120;
const MAX_CHUNKS_PER_DOC = Number(process.env.RAG_MAX_CHUNKS_PER_DOC) || 1000;
const MAX_PDFS_PER_USER = Number(process.env.RAG_MAX_PDFS_PER_USER) || 20;
const MIN_TEXT_CHARS = Number(process.env.RAG_MIN_TEXT_CHARS) || 50;
const SEARCH_THRESHOLD = Number(process.env.RAG_SEARCH_THRESHOLD) || 0.45;
const SEARCH_K = Number(process.env.RAG_SEARCH_K) || 10;

function formatDocumentRow(row) {
  return {
    document_id: row.document_id,
    title: row.title,
    mime_type: row.mime_type,
    byte_size: row.byte_size,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...(row.user_id !== undefined ? { user_id: row.user_id } : {}),
    ...(row.storage_path !== undefined ? { storage_path: row.storage_path } : {}),
  };
}

/**
 * Processes an already-uploaded PDF (parses, chunks, embeds, stores),
 * finalizing the document's status as `ready` or `failed`.
 *
 * @param {Object} params
 * @param {import('multer').File} params.file
 * @param {number} params.userId
 */
export const createDocumentFromUploadService = async ({ file, userId }) => {
  const countRows = await safeExecute(
    'SELECT COUNT(*) AS total FROM documents WHERE user_id = ?',
    [userId],
  );
  if (countRows[0].total >= MAX_PDFS_PER_USER) {
    await fs.unlink(file.path).catch(() => {});
    throw new BadRequestError(`You can upload at most ${MAX_PDFS_PER_USER} PDFs.`);
  }

  const storagePath = path.join(String(userId), path.basename(file.path));

  const insertResult = await safeExecute(
    `INSERT INTO documents (user_id, title, mime_type, storage_path, byte_size, status)
     VALUES (?, ?, ?, ?, ?, 'processing')`,
    [userId, file.originalname, file.mimetype, storagePath, file.size],
  );
  const documentId = insertResult.insertId;

  try {
    const buffer = await fs.readFile(file.path);
    const text = await extractPdfText(buffer);

    if (!text || text.trim().length < MIN_TEXT_CHARS) {
      throw new Error('Could not extract usable text from this PDF.');
    }

    const chunks = chunkText(text, {
      chunkChars: CHUNK_CHARS,
      overlap: CHUNK_OVERLAP,
      maxChunks: MAX_CHUNKS_PER_DOC,
    });

    if (chunks.length === 0) {
      throw new Error('No text chunks could be generated from this PDF.');
    }

    for (let i = 0; i < chunks.length; i += 1) {
      const chunkResult = await safeExecute(
        `INSERT INTO document_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)`,
        [documentId, i, chunks[i]],
      );
      const chunkId = chunkResult.insertId;

      try {
        const embedding = await embedText(chunks[i], 'RETRIEVAL_DOCUMENT');
        await safeExecute(
          `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status)
           VALUES (?, ?, ?, 'ready')`,
          [chunkId, chunks[i], JSON.stringify(embedding)],
        );
      } catch {
        await safeExecute(
          `INSERT INTO document_chunk_vectors (chunk_id, source_text, embedding, status)
           VALUES (?, ?, ?, 'failed')`,
          [chunkId, chunks[i], JSON.stringify([])],
        );
      }
    }

    await safeExecute(`UPDATE documents SET status = 'ready' WHERE document_id = ?`, [documentId]);
  } catch (error) {
    await safeExecute(
      `UPDATE documents SET status = 'failed', error_message = ? WHERE document_id = ?`,
      [String(error.message || error).slice(0, 500), documentId],
    );
  }

  const [finalRow] = await safeExecute('SELECT * FROM documents WHERE document_id = ?', [documentId]);
  return formatDocumentRow(finalRow);
};

/**
 * Lists all documents owned by a user, newest first.
 * @param {number} userId
 */
export const listDocumentsForUserService = async userId => {
  const rows = await safeExecute(
    `SELECT document_id, title, mime_type, byte_size, status, error_message, created_at, updated_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(formatDocumentRow);
};

/**
 * Fetches a document's full row and verifies it belongs to `userId`.
 * Throws NotFoundError if missing or not owned. Shared by the meta,
 * file-stream, delete, search, and query endpoints.
 *
 * @param {number} documentId
 * @param {number} userId
 */
export const assertOwnedDocument = async (documentId, userId) => {
  const rows = await safeExecute(
    'SELECT * FROM documents WHERE document_id = ? AND user_id = ?',
    [documentId, userId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('Document not found.');
  }
  return rows[0];
};

/**
 * Metadata for a single document (ownership-checked).
 */
export const getDocumentMetaService = async ({ documentId, userId }) => {
  const row = await assertOwnedDocument(documentId, userId);
  return formatDocumentRow(row);
};

/**
 * Resolves the absolute on-disk path for a document's PDF, after an
 * ownership check.
 */
export const getDocumentFilePathService = async ({ documentId, userId }) => {
  const row = await assertOwnedDocument(documentId, userId);
  // storage_path is `${userId}/${filename}`, relative to the upload root.
  return {
    absolutePath: path.join(ragUploadRoot, row.storage_path),
    title: row.title,
  };
};

/**
 * Deletes a document: removes the PDF from disk (best-effort) and the DB
 * row (chunks + vectors cascade via FK constraints).
 */
export const deleteDocumentService = async ({ documentId, userId }) => {
  const row = await assertOwnedDocument(documentId, userId);

  const absolutePath = path.join(ragUploadRoot, row.storage_path);
  await fs.unlink(absolutePath).catch(() => {});

  await safeExecute('DELETE FROM documents WHERE document_id = ?', [documentId]);

  return { id: documentId };
};

/**
 * Core semantic search: embeds the query, compares against this
 * document's chunk vectors, and returns the top-scoring excerpts.
 *
 * @param {Object} params
 * @param {number} params.documentId
 * @param {number} params.userId
 * @param {string} params.query
 * @param {number} [params.k]
 */
export const searchInDocumentService = async ({ documentId, userId, query, k }) => {
  const document = await assertOwnedDocument(documentId, userId);
  if (document.status !== 'ready') {
    throw new BadRequestError('This document is not ready for search yet.');
  }

  const effectiveK = k || SEARCH_K;
  const queryEmbedding = await embedText(query, 'RETRIEVAL_QUERY');

  const rows = await safeExecute(
    `SELECT dc.chunk_id, dc.chunk_index, dc.content, dcv.embedding
     FROM document_chunks dc
     JOIN document_chunk_vectors dcv ON dcv.chunk_id = dc.chunk_id
     WHERE dc.document_id = ? AND dcv.status = 'ready'`,
    [documentId],
  );

  const scored = rows
    .map(row => {
      let embedding;
      try {
        embedding = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
      } catch {
        return null;
      }
      if (!Array.isArray(embedding) || embedding.length === 0) return null;
      return {
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter(Boolean)
    .filter(r => r.score >= SEARCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, effectiveK);

  return {
    query,
    results: scored.map(r => ({
      chunkId: r.chunkId,
      chunkIndex: r.chunkIndex,
      score: r.score,
      excerpt: r.content,
    })),
  };
};

/**
 * Answers a question grounded strictly in a document's top-matching
 * chunks, returning the AI answer plus which chunks were used.
 *
 * @param {Object} params
 * @param {number} params.documentId
 * @param {number} params.userId
 * @param {string} params.query
 */
export const queryDocumentService = async ({ documentId, userId, query }) => {
  const { results } = await searchInDocumentService({ documentId, userId, query, k: 5 });

  if (results.length === 0) {
    return {
      answer: "I couldn't find anything relevant to that question in this document.",
      citations: [],
      chunksUsed: [],
    };
  }

  const context = results
    .map((r, idx) => `[${idx + 1}] (chunk ${r.chunkIndex}): ${r.excerpt}`)
    .join('\n\n');

  const prompt = `Answer the user's question using ONLY the context excerpts below. If the answer
isn't contained in the context, say you don't have enough information. Cite excerpts inline using
their bracketed numbers, e.g. [1].

Context:
${context}

Question: ${query}

Answer:`;

  let answer;
  try {
    answer = await generateText(prompt);
  } catch {
    answer = 'AI answer generation is temporarily unavailable. Please try again shortly.';
  }

  return {
    answer,
    citations: results.map((r, idx) => ({ ref: idx + 1, chunkIndex: r.chunkIndex })),
    chunksUsed: results.map(r => r.chunkId),
  };
};
