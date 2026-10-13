import { GoogleGenAI } from '@google/genai';

let client = null;

/**
 * Lazily creates (and caches) the GoogleGenAI client. Kept lazy so the
 * server can still boot (and non-AI routes still work) if the key is
 * missing in a local/dev environment.
 */
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required for AI features');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Generates a vector embedding for a piece of text.
 * @param {string} text
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {Promise<number[]>}
 */
export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const ai = getClient();
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  const result = await ai.models.embedContent({
    model: embeddingModel,
    contents: text,
    config: { taskType },
  });
  const values = result?.embeddings?.[0]?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini embedding response did not contain vector values');
  }
  return values;
}

/**
 * Generates free-form text content from a prompt with automatic model fallback.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateText(prompt) {
  const ai = getClient();
  const modelsToTry = [
    process.env.GEMINI_TEXT_MODEL,
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ].filter(Boolean);

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = typeof response.text === 'function' ? response.text() : response.text || '';
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini generateText] Model ${model} failed, trying next fallback... Error:`, err.message || err);
    }
  }

  throw lastError || new Error('All Gemini text models failed');
}

/**
 * Attempts to parse a JSON object out of an LLM text response. Models
 * sometimes wrap JSON in markdown code fences, so those are stripped first.
 * @param {string} raw
 * @returns {Object|null}
 */
export function parseJsonFromText(raw) {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Computes cosine similarity between two equal-length numeric vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
