import { apiClient } from '../core/api.client.js';

/**
 * Fetches questions, optionally filtered by a keyword search and/or
 * restricted to the authenticated user's own questions.
 * @param {Object} [filters]
 * @param {string} [filters.search] - Keyword to match against title/content.
 * @param {boolean} [filters.mine] - When true, only return the caller's own questions.
 */
async function getQuestions({ search, mine } = {}) {
  try {
    const params = {};
    if (search) params.search = search;
    if (mine) params.mine = true;

    const response = await apiClient.get('/api/questions', { params });
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Centralized error handler for question service requests.
 */
function handleQuestionError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('The AI is taking longer than usual. Please try again in a moment.');
    }
    return new Error(
      'Unable to connect to server. Please check your internet connection.',
    );
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.msg || error.response.data?.message;

  switch (status) {
    case 400:
      return new Error(backendMessage || 'Invalid request.');
    case 401:
      return new Error(backendMessage || 'Please sign in to continue.');
    case 500:
      return new Error(
        'Something went wrong on our end. Please try again later.',
      );
    default:
      return new Error(backendMessage || 'Failed to fetch questions.');
  }
}

/**
 * Creates a new question.
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 */
async function createQuestion({ title, content }) {
  try {
    const response = await apiClient.post('/api/questions', { title, content });
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Fetches a single question (and its answers) by its public hash.
 * Note: this endpoint returns `{ question, answers, answersMeta }` at the
 * top level (not wrapped in `data`), unlike the other question endpoints.
 * @param {string} questionHash
 */
async function getSingleQuestion(questionHash) {
  try {
    const response = await apiClient.get(`/api/questions/${questionHash}`);
    return {
      question: response.data.question,
      answers: response.data.answers,
    };
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Requests AI Draft Coach feedback on an in-progress question.
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 */
async function generateQuestionDraftCoach({ title, content }) {
  try {
    const response = await apiClient.post(
      '/api/questions/draft-coach',
      { title, content },
      { timeout: 120000 },
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Requests AI feedback on how well a draft answer fits a question.
 * @param {string} questionHash
 * @param {string} answerText
 */
async function assessAnswerFit(questionHash, answerText) {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/answer-fit`,
      { answerText },
      { timeout: 120000 },
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Finds conceptually related questions using AI vector cosine similarity.
 * @param {string} query
 */
async function searchQuestionsSemantic(query) {
  try {
    const response = await apiClient.get('/api/questions/search', {
      params: { query },
      timeout: 60000,
    });
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Finds questions similar to an existing thread via stored embeddings.
 * @param {string} questionHash
 */
async function getSimilarQuestions(questionHash) {
  try {
    const response = await apiClient.get(
      `/api/questions/${questionHash}/similar`,
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Finds answers semantically related to a given question.
 * @param {string} questionHash
 */
async function getSimilarAnswers(questionHash) {
  try {
    const response = await apiClient.get(
      `/api/questions/${questionHash}/similar-answers`,
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Updates a question's title and content (owner only).
 * @param {string} questionHash
 * @param {{ title: string, content: string }} data
 */
async function updateQuestion(questionHash, { title, content }) {
  try {
    const response = await apiClient.patch(`/api/questions/${questionHash}`, {
      title,
      content,
    });
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Permanently deletes a question (owner only).
 * @param {string} questionHash
 */
async function deleteQuestion(questionHash) {
  try {
    await apiClient.delete(`/api/questions/${questionHash}`);
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Asks AI to generate a complete, well-structured answer for a question.
 * @param {string} questionHash
 */
async function generatePerfectAnswer(questionHash) {
  try {
    const response = await apiClient.post(
      `/api/questions/${questionHash}/generate-answer`,
      {},
      { timeout: 120000 }, // Gemini text generation can take up to 60-90s
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Asks AI to rewrite a rough question draft into a clear forum question.
 * @param {{ title: string, content: string }} data
 */
async function rewriteQuestion({ title, content }) {
  try {
    const response = await apiClient.post(
      '/api/questions/rewrite-question',
      { title, content },
      { timeout: 120000 }, // Gemini text generation can take up to 60-90s
    );
    return response.data.data;
  } catch (error) {
    throw handleQuestionError(error);
  }
}

/**
 * Service for handling question-related requests.
 */
export const questionService = {
  getQuestions,
  searchQuestionsSemantic,
  getSimilarQuestions,
  getSimilarAnswers,
  createQuestion,
  getSingleQuestion,
  generateQuestionDraftCoach,
  assessAnswerFit,
  updateQuestion,
  deleteQuestion,
  generatePerfectAnswer,
  rewriteQuestion,
};
