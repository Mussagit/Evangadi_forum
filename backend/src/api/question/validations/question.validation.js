import { query, body, param } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const getQuestionsValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string')
    .trim(),
  query('mine')
    .optional()
    .isBoolean()
    .withMessage('mine must be a boolean')
    .toBoolean(),

  validationErrorHandler,
];

export const createQuestionValidation = [
  body('title')
    .trim()
    .isString()
    .withMessage('title must be a string')
    .isLength({ min: 5, max: 255 })
    .withMessage('title must be 5-255 characters'),
  body('content')
    .trim()
    .isString()
    .withMessage('content must be a string')
    .isLength({ min: 10 })
    .withMessage('content must be at least 10 characters'),

  validationErrorHandler,
];

export const questionHashParamValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),

  validationErrorHandler,
];

export const searchQuestionsValidation = [
  query('query')
    .trim()
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 5 })
    .withMessage('query must be at least 5 characters'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a number between 0 and 1')
    .toFloat(),

  validationErrorHandler,
];

export const similarQuestionsValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),
  query('threshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('threshold must be a number between 0 and 1')
    .toFloat(),

  validationErrorHandler,
];

export const draftCoachValidation = [
  body('title').optional().isString().withMessage('title must be a string').trim(),
  body('content')
    .trim()
    .isString()
    .withMessage('content is required')
    .isLength({ min: 1 })
    .withMessage('content is required'),

  validationErrorHandler,
];

export const answerFitValidation = [
  param('questionHash')
    .matches(/^[a-f0-9]{16}$/)
    .withMessage('questionHash must be a 16-character hex string'),
  body('answerText')
    .trim()
    .isString()
    .withMessage('answerText must be a string')
    .isLength({ min: 20 })
    .withMessage('answerText must be at least 20 characters'),

  validationErrorHandler,
];
