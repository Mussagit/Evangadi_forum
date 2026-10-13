import express from 'express';
import {
  createAnswerController,
  updateAnswerController,
  deleteAnswerController,
} from '../controller/answer.controller.js';
import {
  createAnswerValidation,
  updateAnswerValidation,
  deleteAnswerValidation,
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

export default router;
