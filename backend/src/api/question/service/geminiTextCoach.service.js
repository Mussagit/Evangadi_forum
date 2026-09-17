import { generateText, parseJsonFromText } from '../../../utils/ai/gemini.client.js';
import { getQuestionByHashService } from './question.service.js';

/**
 * Asks Gemini to review an in-progress question draft and return a short
 * list of actionable tips (e.g. "add a code snippet").
 *
 * @param {Object} data
 * @param {string} [data.title]
 * @param {string} data.content
 * @returns {Promise<{ tips: string[] }>}
 */
export const generateQuestionDraftCoachService = async ({ title, content }) => {
  const prompt = `You are a helpful coach for a programming Q&A forum. A student is drafting a question.
Review the draft below for clarity, completeness, and formatting (e.g. missing error messages,
missing code snippets, vague titles). Respond ONLY with strict JSON in this exact shape, no extra text:
{"tips": ["short actionable tip", "another short actionable tip"]}
Give at most 5 concise tips (each under 20 words). If the draft is already strong, return fewer tips.

Draft title: ${title || '(no title yet)'}
Draft content:
${content}`;

  try {
    const raw = await generateText(prompt);
    const parsed = parseJsonFromText(raw);
    const tips = Array.isArray(parsed?.tips) ? parsed.tips.filter(t => typeof t === 'string') : [];
    return { tips };
  } catch (error) {
    // Degrade gracefully: the page should still work without AI tips.
    return { tips: [] };
  }
};

/**
 * Asks Gemini how well a draft answer addresses a given question, returning
 * a coarse `level` (strong/partial/weak) plus a short explanatory `note`.
 *
 * @param {Object} data
 * @param {string} data.questionHash
 * @param {string} data.answerText
 * @returns {Promise<{ level: string, note: string }>}
 */
export const assessAnswerAgainstQuestionService = async ({ questionHash, answerText }) => {
  const question = await getQuestionByHashService(questionHash);

  const prompt = `You are grading how well a draft forum answer addresses a question.
Respond ONLY with strict JSON in this exact shape, no extra text:
{"level": "strong" | "partial" | "weak", "note": "one or two sentence explanation"}

Question title: ${question.title}
Question content:
${question.content}

Draft answer:
${answerText}`;

  try {
    const raw = await generateText(prompt);
    const parsed = parseJsonFromText(raw);
    const level = ['strong', 'partial', 'weak'].includes(parsed?.level) ? parsed.level : 'partial';
    const note = typeof parsed?.note === 'string' ? parsed.note : 'Unable to generate detailed feedback right now.';
    return { level, note };
  } catch (error) {
    return { level: 'partial', note: 'AI feedback is temporarily unavailable. You can still post your answer.' };
  }
};
