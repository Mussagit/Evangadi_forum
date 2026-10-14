import { StatusCodes } from 'http-status-codes';
import {
  getQuestionsService,
  createQuestionWithVectorService,
  getSingleQuestionService,
  searchQuestionsSemanticService,
  getSimilarQuestionsService,
  updateQuestionService,
  deleteQuestionService,
  getSimilarAnswersService,
} from '../service/question.service.js';
import {
  generateQuestionDraftCoachService,
  assessAnswerAgainstQuestionService,
  generatePerfectAnswerService,
  rewriteQuestionService,
} from '../service/geminiTextCoach.service.js';

/**
 * Handles requests to list questions, with optional keyword search and
 * an optional filter for the authenticated user's own questions.
 */
export const getQuestionsController = async (req, res, next) => {
  try {
    const { search, mine } = req.query;
    const userId = req.user.id;

    const questions = await getQuestionsService({
      search,
      mine: Boolean(mine),
      userId,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Questions fetched successfully.',
      data: questions,
      meta: {
        limit: 100,
        total: questions.length,
        sortBy: 'newest',
        sortOrder: 'desc',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles POST /api/questions - creates a new question and (best-effort)
 * its vector embedding.
 */
export const createQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const question = await createQuestionWithVectorService({ title, content, userId });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Question posted successfully.',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GET /api/questions/:questionHash - a single question and its
 * answers.
 */
export const getSingleQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    const { question, answers, answersMeta } = await getSingleQuestionService(questionHash);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question fetched successfully',
      question,
      answers,
      answersMeta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GET /api/questions/search - AI semantic search across all
 * questions.
 */
export const searchQuestionsSemanticController = async (req, res, next) => {
  try {
    const { query, k, threshold } = req.query;

    const { data, meta } = await searchQuestionsSemanticService({ query, k, threshold });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Semantic search completed successfully',
      data,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GET /api/questions/:questionHash/similar - questions similar to
 * a given one.
 */
export const getSimilarQuestionsController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { k, threshold } = req.query;

    const { data, meta } = await getSimilarQuestionsService({ questionHash, k, threshold });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Similar questions fetched successfully',
      data,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles POST /api/questions/draft-coach - AI feedback on a draft
 * question.
 */
export const generateQuestionDraftCoachController = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const data = await generateQuestionDraftCoachService({ title, content });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Draft suggestions generated',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles POST /api/questions/:questionHash/answer-fit - AI evaluation of
 * how well a draft answer fits a question.
 */
export const assessAnswerAgainstQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { answerText } = req.body;

    const data = await assessAnswerAgainstQuestionService({ questionHash, answerText });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer fit assessed',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles PATCH /api/questions/:questionHash - updates title and content.
 * Only the question owner may edit.
 */
export const updateQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    const question = await updateQuestionService({ questionHash, title, content, userId });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question updated successfully.',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles DELETE /api/questions/:questionHash - permanently removes a
 * question and all its answers (via CASCADE).
 * Only the question owner may delete.
 */
export const deleteQuestionController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const userId = req.user.id;

    await deleteQuestionService({ questionHash, userId });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles GET /api/questions/:questionHash/similar-answers
 * Returns answers semantically related to a given question.
 */
export const getSimilarAnswersController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const { k, threshold } = req.query;

    const { data, meta } = await getSimilarAnswersService({ questionHash, k, threshold });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Related answers fetched successfully.',
      data,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/questions/:questionHash/generate-answer
 * Generates a complete AI answer for a question.
 * The user reviews, edits, and posts it themselves.
 */
export const generatePerfectAnswerController = async (req, res, next) => {
  try {
    const { questionHash } = req.params;
    const data = await generatePerfectAnswerService({ questionHash });
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'AI answer generated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/questions/rewrite-question
 * Rewrites a rough question draft into a clear, structured forum question.
 */
export const rewriteQuestionController = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const data = await rewriteQuestionService({ title, content });
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Question rewritten successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
