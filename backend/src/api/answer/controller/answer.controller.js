import { StatusCodes } from 'http-status-codes';
import { createAnswerService } from '../service/answer.service.js';

/**
 * Handles POST /api/answers - posts a new answer to a question.
 */
export const createAnswerController = async (req, res, next) => {
  try {
    const { questionId, content } = req.body;
    const userId = req.user.id;

    const answer = await createAnswerService({ questionId, content, userId });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Answer posted successfully',
      data: answer,
    });
  } catch (error) {
    next(error);
  }
};
