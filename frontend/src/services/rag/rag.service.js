import { apiClient } from '../core/api.client.js';

/**
 * Lists all RAG documents uploaded by the authenticated user.
 */
async function listDocuments() {
  try {
    const response = await apiClient.get('/api/rag/documents');
    return response.data.data;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Uploads a PDF for processing (parsing, chunking, embedding).
 * @param {File} file
 */
async function uploadPdf(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Let the browser/axios set the multipart Content-Type (with boundary)
    // automatically for FormData bodies.
    const response = await apiClient.post('/api/rag/documents', formData, {
      timeout: 180000,
    });
    return response.data.data;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Fetches metadata (including processing status) for a single document.
 * @param {string|number} documentId
 */
async function getDocumentMeta(documentId) {
  try {
    const response = await apiClient.get(`/api/rag/documents/${documentId}`);
    return response.data.data;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Deletes a RAG document and cascades deletion of its vectors.
 * @param {string|number} documentId
 */
async function deleteDocument(documentId) {
  try {
    await apiClient.delete(`/api/rag/documents/${documentId}`);
    return true;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Performs a semantic search for excerpts within a document.
 * @param {string|number} documentId
 * @param {string} query
 */
async function searchInDocument(documentId, query) {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/search`,
      { params: { query }, timeout: 60000 },
    );
    return response.data.data;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Asks an AI question grounded strictly in a document's contents.
 * @param {string|number} documentId
 * @param {string} query
 */
async function queryDocument(documentId, query) {
  try {
    const response = await apiClient.post(
      `/api/rag/documents/${documentId}/query`,
      { query },
      { timeout: 60000 },
    );
    return response.data.data;
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Fetches the raw PDF bytes for a document and returns an object URL
 * suitable for an <iframe>. Caller must revoke the URL on cleanup.
 * @param {string|number} documentId
 */
async function fetchPdfObjectUrl(documentId) {
  try {
    const response = await apiClient.get(
      `/api/rag/documents/${documentId}/file`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw handleRagError(error);
  }
}

/**
 * Centralized error handler for RAG service requests.
 */
function handleRagError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
    }
    return new Error(
      'Unable to connect to server. Please check your internet connection.',
    );
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.msg || error.response.data?.message;

  switch (status) {
    case 400:
      return new Error(backendMessage || 'Invalid request.');
    case 401:
      return new Error(backendMessage || 'Please sign in to continue.');
    case 404:
      return new Error(backendMessage || 'Document not found.');
    case 413:
      return new Error(backendMessage || 'File is too large to upload.');
    case 500:
      return new Error(
        'Something went wrong on our end. Please try again later.',
      );
    default:
      return new Error(backendMessage || 'Something went wrong.');
  }
}

/**
 * Service for handling RAG (Knowledge Base) document requests.
 */
export const ragService = {
  listDocuments,
  uploadPdf,
  getDocumentMeta,
  deleteDocument,
  searchInDocument,
  queryDocument,
  fetchPdfObjectUrl,
};
