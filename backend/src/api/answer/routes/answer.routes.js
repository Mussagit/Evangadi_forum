import express from 'express';
import {
  createAnswerController,
  updateAnswerController,
  deleteAnswerController,
  getRepliesController,
  createReplyController,
  updateReplyController,
  deleteReplyController,
} from '../controller/answer.controller.js';
import {
  createAnswerValidation,
  updateAnswerValidation,
  deleteAnswerValidation,
  createReplyValidation,
  updateReplyValidation,
  deleteReplyValidation,
  getAnswerRepliesValidation,
} from '../validations/answer.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route POST /api/answers
 * @desc Post a new answer to a question
 * @access Protected
 */
router.post('/', authenticateUser, createAnswerValidation, createAnswerController);

/**
 * @route PATCH /api/answers/replies/:replyId
 * @desc Edit a reply (author only)
 * @access Protected
 *
 * NOTE: must be registered BEFORE /:answerId to prevent Express from
 *       matching the literal "replies" segment as an answerId integer.
 */
router.patch('/replies/:replyId', authenticateUser, updateReplyValidation, updateReplyController);

/**
 * @route DELETE /api/answers/replies/:replyId
 * @desc Delete a reply (author only)
 * @access Protected
 *
 * NOTE: same ordering reason as PATCH above.
 */
router.delete('/replies/:replyId', authenticateUser, deleteReplyValidation, deleteReplyController);

/**
 * @route PATCH /api/answers/:answerId
 * @desc Update an answer's content (author only)
 * @access Protected
 */
router.patch('/:answerId', authenticateUser, updateAnswerValidation, updateAnswerController);

/**
 * @route DELETE /api/answers/:answerId
 * @desc Permanently delete an answer (author only)
 * @access Protected
 */
router.delete('/:answerId', authenticateUser, deleteAnswerValidation, deleteAnswerController);

/**
 * @route GET /api/answers/:answerId/replies
 * @desc List all threaded replies for an answer
 * @access Protected
 */
router.get('/:answerId/replies', authenticateUser, getAnswerRepliesValidation, getRepliesController);

/**
 * @route POST /api/answers/:answerId/replies
 * @desc Post a reply to an answer
 * @access Protected
 */
router.post('/:answerId/replies', authenticateUser, createReplyValidation, createReplyController);

export default router;
