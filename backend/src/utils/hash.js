import crypto from 'crypto';

/**
 * Generates a random 16-character lowercase hex string, used as the
 * public-facing identifier for questions (`question_hash`).
 * @returns {string}
 */
export function generateHash16() {
  return crypto.randomBytes(8).toString('hex');
}
