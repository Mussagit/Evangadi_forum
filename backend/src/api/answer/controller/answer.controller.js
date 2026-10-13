import { StatusCodes } from 'http-status-codes';
import {
  createAnswerService,
  updateAnswerService,
  deleteAnswerService,
} from '../service/answer.service.js';

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

/**
 * Handles PATCH /api/answers/:answerId - updates an answer's content.
 * Only the original author may edit.
 */
export const updateAnswerController = async (req, res, next) => {
  try {
    const answerId = Number(req.params.answerId);
    const { content } = req.body;
    const userId = req.user.id;

    const answer = await updateAnswerService({ answerId, content, userId });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer updated successfully.',
      data: answer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles DELETE /api/answers/:answerId - permanently removes an answer.
 * Only the original author may delete.
 */
export const deleteAnswerController = async (req, res, next) => {
  try {
    const answerId = Number(req.params.answerId);
    const userId = req.user.id;

    await deleteAnswerService({ answerId, userId });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
