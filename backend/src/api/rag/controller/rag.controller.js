import { StatusCodes } from 'http-status-codes';
import { BadRequestError } from '../../../utils/errors/index.js';
import {
  createDocumentFromUploadService,
  listDocumentsForUserService,
  getDocumentMetaService,
  getDocumentFilePathService,
  deleteDocumentService,
  searchInDocumentService,
  queryDocumentService,
} from '../service/rag.service.js';

export const createDocumentController = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('A PDF file is required.');
    }

    const data = await createDocumentFromUploadService({
      file: req.file,
      userId: req.user.id,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Document uploaded and processed.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const listDocumentsController = async (req, res, next) => {
  try {
    const data = await listDocumentsForUserService(req.user.id);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Documents fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentMetaController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const data = await getDocumentMetaService({ documentId, userId: req.user.id });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentFileController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { absolutePath } = await getDocumentFilePathService({
      documentId,
      userId: req.user.id,
    });

    res.sendFile(absolutePath, err => {
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const data = await deleteDocumentService({ documentId, userId: req.user.id });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document deleted successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const searchInDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query, k } = req.query;

    const data = await searchInDocumentService({
      documentId,
      userId: req.user.id,
      query,
      k,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Ranked chunk excerpts',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const queryDocumentController = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { query } = req.body;

    const data = await queryDocumentService({
      documentId,
      userId: req.user.id,
      query,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Answer and citations',
      data,
    });
  } catch (error) {
    next(error);
  }
};
