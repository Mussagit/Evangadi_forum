import { apiClient } from '../core/api.client.js';

/**
 * Posts a new answer to a question.
 * @param {string|number} questionId
 * @param {string} content
 */
async function postAnswer(questionId, content) {
  try {
    const response = await apiClient.post('/api/answers', {
      questionId,
      content,
    });
    return response.data.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Centralized error handler for answer service requests.
 */
function handleAnswerError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
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
      return new Error(backendMessage || 'Invalid answer content.');
    case 401:
      return new Error(backendMessage || 'Please sign in to continue.');
    case 403:
      return new Error(
        backendMessage || 'You cannot answer your own question.',
      );
    case 500:
      return new Error(
        'Something went wrong on our end. Please try again later.',
      );
    default:
      return new Error(backendMessage || 'Failed to post answer.');
  }
}

/**
 * Updates an answer's content (author only).
 * @param {number} answerId
 * @param {string} content
 */
async function updateAnswer(answerId, content) {
  try {
    const response = await apiClient.patch(`/api/answers/${answerId}`, {
      content,
    });
    return response.data.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Permanently deletes an answer (author only).
 * @param {number} answerId
 */
async function deleteAnswer(answerId) {
  try {
    await apiClient.delete(`/api/answers/${answerId}`);
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Fetches all threaded replies for an answer.
 * @param {number} answerId
 */
async function getReplies(answerId) {
  try {
    const response = await apiClient.get(`/api/answers/${answerId}/replies`);
    return response.data.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Posts a reply to an answer.
 * @param {number} answerId
 * @param {string} content
 */
async function postReply(answerId, content) {
  try {
    const response = await apiClient.post(`/api/answers/${answerId}/replies`, { content });
    return response.data.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Updates a reply's content (author only).
 * @param {number} replyId
 * @param {string} content
 */
async function updateReply(replyId, content) {
  try {
    const response = await apiClient.patch(`/api/answers/replies/${replyId}`, { content });
    return response.data.data;
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Permanently deletes a reply (author only).
 * @param {number} replyId
 */
async function deleteReply(replyId) {
  try {
    await apiClient.delete(`/api/answers/replies/${replyId}`);
  } catch (error) {
    throw handleAnswerError(error);
  }
}

/**
 * Service for handling answer-related requests.
 */
export const answerService = {
  postAnswer,
  updateAnswer,
  deleteAnswer,
  getReplies,
  postReply,
  updateReply,
  deleteReply,
};
