/**
 * Splits text into overlapping character-window chunks, trimming empty
 * chunks and stopping at `maxChunks` as a safety cap.
 *
 * @param {string} text
 * @param {Object} options
 * @param {number} options.chunkChars - Window size in characters.
 * @param {number} options.overlap - Overlap between consecutive windows.
 * @param {number} options.maxChunks - Hard cap on number of chunks produced.
 * @returns {string[]}
 */
export function chunkText(text, { chunkChars, overlap, maxChunks }) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const step = Math.max(chunkChars - overlap, 1);
  const chunks = [];

  for (let start = 0; start < clean.length && chunks.length < maxChunks; start += step) {
    const chunk = clean.slice(start, start + chunkChars).trim();
    if (chunk) chunks.push(chunk);
    if (start + chunkChars >= clean.length) break;
  }

  return chunks;
}
