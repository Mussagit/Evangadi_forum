import { param, query, body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const documentIdParamValidation = [
  param('documentId')
    .isInt({ min: 1 })
    .withMessage('documentId must be a positive integer')
    .toInt(),

  validationErrorHandler,
];

export const searchDocumentValidation = [
  param('documentId')
    .isInt({ min: 1 })
    .withMessage('documentId must be a positive integer')
    .toInt(),
  query('query')
    .trim()
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 1 })
    .withMessage('query is required'),
  query('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be an integer between 1 and 20')
    .toInt(),

  validationErrorHandler,
];

export const queryDocumentValidation = [
  param('documentId')
    .isInt({ min: 1 })
    .withMessage('documentId must be a positive integer')
    .toInt(),
  body('query')
    .trim()
    .isString()
    .withMessage('query must be a string')
    .isLength({ min: 1 })
    .withMessage('query is required'),

  validationErrorHandler,
];
