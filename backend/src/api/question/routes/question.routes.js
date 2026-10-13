import express from 'express';
import {
  getQuestionsController,
  createQuestionController,
  getSingleQuestionController,
  searchQuestionsSemanticController,
  getSimilarQuestionsController,
  generateQuestionDraftCoachController,
  assessAnswerAgainstQuestionController,
  updateQuestionController,
  deleteQuestionController,
} from '../controller/question.controller.js';
import {
  getQuestionsValidation,
  createQuestionValidation,
  questionHashParamValidation,
  searchQuestionsValidation,
  similarQuestionsValidation,
  draftCoachValidation,
  answerFitValidation,
  updateQuestionValidation,
  deleteQuestionValidation,
} from '../validations/question.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';

const router = express.Router();

/**
 * @route GET /api/questions
 * @desc List questions, optionally filtered by ?search= and/or ?mine=true
 * @access Protected
 */
router.get('/', authenticateUser, getQuestionsValidation, getQuestionsController);

/**
 * @route POST /api/questions
 * @desc Create a new question (auto-generates a vector embedding)
 * @access Protected
 */
router.post('/', authenticateUser, createQuestionValidation, createQuestionController);

/**
 * @route POST /api/questions/draft-coach
 * @desc AI feedback on an in-progress question draft
 * @access Protected
 */
router.post(
  '/draft-coach',
  authenticateUser,
  draftCoachValidation,
  generateQuestionDraftCoachController,
);

/**
 * @route GET /api/questions/search
 * @desc AI semantic search across all questions
 * @access Protected
 * NOTE: must be registered before the `/:questionHash` route below.
 */
router.get(
  '/search',
  authenticateUser,
  searchQuestionsValidation,
  searchQuestionsSemanticController,
);

/**
 * @route GET /api/questions/:questionHash
 * @desc Fetch a single question and its answers
 * @access Protected
 */
router.get(
  '/:questionHash',
  authenticateUser,
  questionHashParamValidation,
  getSingleQuestionController,
);

/**
 * @route GET /api/questions/:questionHash/similar
 * @desc Find questions similar to a given one
 * @access Protected
 */
router.get(
  '/:questionHash/similar',
  authenticateUser,
  similarQuestionsValidation,
  getSimilarQuestionsController,
);

/**
 * @route POST /api/questions/:questionHash/answer-fit
 * @desc AI evaluation of how well a draft answer fits a question
 * @access Protected
 */
router.post(
  '/:questionHash/answer-fit',
  authenticateUser,
  answerFitValidation,
  assessAnswerAgainstQuestionController,
);

/**
 * @route PATCH /api/questions/:questionHash
 * @desc Update the title and content of a question (owner only)
 * @access Protected
 */
router.patch(
  '/:questionHash',
  authenticateUser,
  updateQuestionValidation,
  updateQuestionController,
);

/**
 * @route DELETE /api/questions/:questionHash
 * @desc Permanently delete a question and all its answers (owner only)
 * @access Protected
 */
router.delete(
  '/:questionHash',
  authenticateUser,
  deleteQuestionValidation,
  deleteQuestionController,
);

export default router;
