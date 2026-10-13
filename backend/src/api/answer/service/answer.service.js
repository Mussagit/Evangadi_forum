import { safeExecute } from '../../../../db/config.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../utils/errors/index.js';

/**
 * Creates a new answer for a question, after verifying the question exists
 * and that the caller is not answering their own question.
 *
 * @param {Object} data
 * @param {number} data.questionId
 * @param {string} data.content
 * @param {number} data.userId
 */
export const createAnswerService = async ({ questionId, content, userId }) => {
  const questionRows = await safeExecute(
    'SELECT question_id, user_id FROM questions WHERE question_id = ?',
    [questionId],
  );

  if (questionRows.length === 0) {
    throw new NotFoundError('Question not found.');
  }

  if (questionRows[0].user_id === userId) {
    throw new BadRequestError('You cannot answer your own question.');
  }

  const insertResult = await safeExecute(
    'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)',
    [questionId, userId, content],
  );

  const answerRows = await safeExecute(
    `SELECT
       a.answer_id, a.question_id, a.content, a.created_at, a.updated_at,
       u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name
     FROM answers a
     JOIN users u ON u.user_id = a.user_id
     WHERE a.answer_id = ?`,
    [insertResult.insertId],
  );

  const row = answerRows[0];

  return {
    id: row.answer_id,
    questionId: row.question_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
    },
  };
};

/**
 * Updates an answer's content. Only the answer's author may edit it.
 *
 * @param {Object} data
 * @param {number} data.answerId
 * @param {string} data.content
 * @param {number} data.userId
 */
export const updateAnswerService = async ({ answerId, content, userId }) => {
  const rows = await safeExecute(
    'SELECT answer_id, user_id FROM answers WHERE answer_id = ?',
    [answerId],
  );

  if (rows.length === 0) {
    throw new NotFoundError('Answer not found.');
  }

  if (rows[0].user_id !== userId) {
    throw new ForbiddenError('You can only edit your own answers.');
  }

  await safeExecute(
    'UPDATE answers SET content = ?, updated_at = NOW() WHERE answer_id = ?',
    [content, answerId],
  );

  const updated = await safeExecute(
    `SELECT a.answer_id, a.question_id, a.content, a.created_at, a.updated_at,
            u.user_id AS author_id, u.first_name AS author_first_name, u.last_name AS author_last_name
     FROM answers a
     JOIN users u ON u.user_id = a.user_id
     WHERE a.answer_id = ?`,
    [answerId],
  );

  const row = updated[0];
  return {
    id: row.answer_id,
    questionId: row.question_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.author_id,
      firstName: row.author_first_name,
      lastName: row.author_last_name,
    },
  };
};

/**
 * Permanently deletes an answer. Only the author may delete.
 *
 * @param {Object} data
 * @param {number} data.answerId
 * @param {number} data.userId
 */
export const deleteAnswerService = async ({ answerId, userId }) => {
  const rows = await safeExecute(
    'SELECT answer_id, user_id FROM answers WHERE answer_id = ?',
    [answerId],
  );

  if (rows.length === 0) {
    throw new NotFoundError('Answer not found.');
  }

  if (rows[0].user_id !== userId) {
    throw new ForbiddenError('You can only delete your own answers.');
  }

  await safeExecute('DELETE FROM answers WHERE answer_id = ?', [answerId]);
};
