import { body, param } from 'express-validator';
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

export const updateAnswerValidation = [
  param('answerId')
    .isInt({ min: 1 })
    .withMessage('answerId must be a positive integer')
    .toInt(),
  body('content')
    .trim()
    .isString()
    .withMessage('content must be a string')
    .isLength({ min: 20 })
    .withMessage('content must be at least 20 characters'),

  validationErrorHandler,
];

export const deleteAnswerValidation = [
  param('answerId')
    .isInt({ min: 1 })
    .withMessage('answerId must be a positive integer')
    .toInt(),

  validationErrorHandler,
];
