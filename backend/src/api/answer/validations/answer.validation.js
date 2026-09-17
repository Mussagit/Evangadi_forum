import { body } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

export const createAnswerValidation = [
  body('questionId')
    .isInt({ min: 1 })
    .withMessage('questionId must be a positive integer')
    .toInt(),
  body('content')
    .trim()
    .isString()
    .withMessage('content must be a string')
    .isLength({ min: 20 })
    .withMessage('content must be at least 20 characters'),

  validationErrorHandler,
];
