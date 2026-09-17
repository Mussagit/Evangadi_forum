import express from 'express';
import {
  createDocumentController,
  listDocumentsController,
  getDocumentMetaController,
  getDocumentFileController,
  deleteDocumentController,
  searchInDocumentController,
  queryDocumentController,
} from '../controller/rag.controller.js';
import {
  documentIdParamValidation,
  searchDocumentValidation,
  queryDocumentValidation,
} from '../validations/rag.validation.js';
import { authenticateUser } from '../../../middleware/authentication.js';
import { ragUpload, createDocumentMulterErrorHandler } from '../config/rag.upload.config.js';

const router = express.Router();

/**
 * @route GET /api/rag/documents
 * @desc List the authenticated user's RAG documents
 */
router.get('/', authenticateUser, listDocumentsController);

/**
 * @route POST /api/rag/documents
 * @desc Upload a PDF, parse/chunk/embed it, and store it
 */
router.post(
  '/',
  authenticateUser,
  ragUpload.single('file'),
  createDocumentMulterErrorHandler,
  createDocumentController,
);

/**
 * @route GET /api/rag/documents/:documentId
 * @desc Metadata for a single document
 */
router.get('/:documentId', authenticateUser, documentIdParamValidation, getDocumentMetaController);

/**
 * @route DELETE /api/rag/documents/:documentId
 * @desc Delete a document (file + DB row, cascading chunks/vectors)
 */
router.delete(
  '/:documentId',
  authenticateUser,
  documentIdParamValidation,
  deleteDocumentController,
);

/**
 * @route GET /api/rag/documents/:documentId/file
 * @desc Stream the raw PDF file
 */
router.get(
  '/:documentId/file',
  authenticateUser,
  documentIdParamValidation,
  getDocumentFileController,
);

/**
 * @route GET /api/rag/documents/:documentId/search
 * @desc Semantic search for excerpts within a document
 */
router.get(
  '/:documentId/search',
  authenticateUser,
  searchDocumentValidation,
  searchInDocumentController,
);

/**
 * @route POST /api/rag/documents/:documentId/query
 * @desc AI answer grounded in a document's contents
 */
router.post(
  '/:documentId/query',
  authenticateUser,
  queryDocumentValidation,
  queryDocumentController,
);

export default router;
