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

/**
 * Asks Gemini to write a complete, well-structured answer to a question.
 * Returns markdown-formatted content the user can review, edit, and post.
 *
 * @param {string} questionHash
 * @returns {Promise<{ answer: string }>}
 */
export const generatePerfectAnswerService = async ({ questionHash }) => {
  const question = await getQuestionByHashService(questionHash);

  const prompt = `You are an expert programming mentor on a student Q&A forum called Evangadi Forum.
A student has asked the following question. Write a complete, clear, and correct answer in Markdown.

Rules:
- Use headings, bullet points, and fenced code blocks where appropriate.
- Be concise but thorough — cover the key concept, explain WHY, then show HOW with a working code example.
- Write in a friendly, encouraging tone suitable for a student learning to code.
- Do NOT include any preamble like "Here is my answer:" — start directly with the answer content.
- Maximum ~600 words.

Question title: ${question.title}
Question details:
${question.content}

Write the answer now:`;

  const raw = await generateText(prompt);
  return { answer: raw.trim() };
};

/**
 * Rewrites a rough question draft into a clear, well-structured forum question.
 * Returns a rewritten title and content the user can review, edit, and post.
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 * @returns {Promise<{ title: string, content: string, tips: string[] }>}
 */
export const rewriteQuestionService = async ({ title, content }) => {
  const prompt = `You are an expert technical writing coach for a programming Q&A forum called Evangadi Forum.
A student has written a rough draft of a question. Rewrite it into a clear, specific, well-structured forum question.

Rules:
- Rewrite the title to be specific and descriptive (e.g. "React: useState resets on navigation" not "why doesn't my code work").
- Rewrite the content with: (1) clear problem description, (2) what was tried, (3) expected vs actual behavior, (4) relevant code in fenced markdown code blocks.
- Keep the student's original intent and technical details — do NOT change the topic.
- Be concise — max 300 words for the content.
- Return ONLY strict JSON in this exact shape, no extra text:
{
  "title": "rewritten title here",
  "content": "rewritten content here in markdown",
  "tips": ["one short tip about what was improved", "another tip"]
}

Original title: ${title || '(no title)'}
Original content:
${content}`;

  try {
    const raw = await generateText(prompt);
    const parsed = parseJsonFromText(raw);
    const rewrittenTitle = typeof parsed?.title === 'string' && parsed.title.trim()
      ? parsed.title.trim()
      : title;
    const rewrittenContent = typeof parsed?.content === 'string' && parsed.content.trim()
      ? parsed.content.trim()
      : content;
    const tips = Array.isArray(parsed?.tips)
      ? parsed.tips.filter(t => typeof t === 'string').slice(0, 4)
      : [];
    return { title: rewrittenTitle, content: rewrittenContent, tips };
  } catch {
    return { title, content, tips: ['AI rewrite is temporarily unavailable.'] };
  }
};
