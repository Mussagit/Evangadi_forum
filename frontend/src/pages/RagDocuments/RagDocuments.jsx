/**
 * RAG Documents (Knowledge Base): upload PDFs, list them, and interact with
 * an active document via three tabs - Ask AI, Semantic Search, Preview.
 * Data: `ragService`.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Send,
  Search,
} from 'lucide-react';
import { ragService } from '../../services/rag/rag.service.js';
import RagAnswerBody from '../../components/RagAnswerBody/RagAnswerBody.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './RagDocuments.module.css';

const TABS = [
  { id: 'ask', label: 'Ask AI' },
  { id: 'search', label: 'Search' },
  { id: 'preview', label: 'Preview' },
];

export default function RagDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [activeTab, setActiveTab] = useState('ask');

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState(null);
  const [askError, setAskError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Preview state
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const activeDocument = documents.find(doc => doc.document_id === activeDocumentId) || null;

  async function loadDocuments() {
    setIsLoadingList(true);
    setListError(null);
    try {
      const docs = await ragService.listDocuments();
      setDocuments(docs || []);
    } catch (err) {
      setListError(err.message || 'Failed to load documents.');
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  // Reset per-document state and load the preview when switching documents/tabs.
  useEffect(() => {
    setAskQuery('');
    setAskAnswer(null);
    setAskError(null);
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
    setPdfObjectUrl(prevUrl => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return null;
    });
  }, [activeDocumentId]);

  useEffect(() => {
    if (activeTab !== 'preview' || !activeDocument || activeDocument.status !== 'ready') {
      return undefined;
    }

    let isMounted = true;
    let objectUrl = null;

    async function loadPreview() {
      setIsLoadingPreview(true);
      setPreviewError(null);
      try {
        objectUrl = await ragService.fetchPdfObjectUrl(activeDocument.document_id);
        if (isMounted) setPdfObjectUrl(objectUrl);
      } catch (err) {
        if (isMounted) setPreviewError(err.message || 'Failed to load PDF.');
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeDocument?.document_id, activeDocument?.status]);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setListError('Only PDF files are supported.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setListError(null);
    try {
      const uploaded = await ragService.uploadPdf(file);
      setDocuments(prev => [uploaded, ...prev]);
      setActiveDocumentId(uploaded.document_id);
      setActiveTab('ask');
    } catch (err) {
      setListError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(documentId) {
    try {
      await ragService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));
      if (activeDocumentId === documentId) setActiveDocumentId(null);
    } catch (err) {
      setListError(err.message || 'Failed to delete document.');
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!askQuery.trim() || !activeDocument) return;
    setIsAsking(true);
    setAskError(null);
    try {
      const result = await ragService.queryDocument(
        activeDocument.document_id,
        askQuery.trim(),
      );
      setAskAnswer(result);
    } catch (err) {
      setAskError(err.message || 'Failed to get an answer.');
    } finally {
      setIsAsking(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim() || !activeDocument) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await ragService.searchInDocument(
        activeDocument.document_id,
        searchQuery.trim(),
      );
      setSearchResults(result?.results || []);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className={styles.ragDocuments}>
      <aside className={styles.ragDocuments__sidebar}>
        <div className={styles.ragDocuments__sidebarHeader}>
          <h3 className={styles.ragDocuments__sidebarTitle}>Your documents</h3>
          <button
            type='button'
            className={styles.ragDocuments__uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <Upload size={16} />
            )}
            {isUploading ? 'Uploading...' : 'Upload PDF'}
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='application/pdf'
            hidden
            onChange={handleFileSelected}
          />
        </div>

        {isLoadingList && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}>
            Loading documents...
          </p>
        )}

        {!isLoadingList && listError && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}>
            {listError}
          </p>
        )}

        {!isLoadingList && !listError && documents.length === 0 && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
            No PDFs yet. Upload one to build your knowledge base.
          </p>
        )}

        {!isLoadingList && documents.length > 0 && (
          <ul className={styles.ragDocuments__list}>
            {documents.map(doc => (
              <li key={doc.document_id}>
                <button
                  type='button'
                  className={`${styles.ragDocuments__listItem} ${
                    doc.document_id === activeDocumentId
                      ? styles['ragDocuments__listItem--active']
                      : ''
                  }`}
                  onClick={() => setActiveDocumentId(doc.document_id)}
                >
                  <FileText size={16} className={styles.ragDocuments__listIcon} />
                  <span className={styles.ragDocuments__listName}>
                    {doc.title || doc.filename || 'Untitled document'}
                  </span>
                  {doc.status === 'processing' && (
                    <span className={styles.ragDocuments__badgePending}>
                      Processing
                    </span>
                  )}
                  {doc.status === 'failed' && (
                    <span className={styles.ragDocuments__badgePending}>
                      Failed
                    </span>
                  )}
                </button>
                <button
                  type='button'
                  className={styles.ragDocuments__deleteButton}
                  onClick={() => handleDelete(doc.document_id)}
                  aria-label='Delete document'
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className={styles.ragDocuments__main}>
        {!activeDocument && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
            Select a document from the list, or upload a new PDF to get
            started.
          </p>
        )}

        {activeDocument && activeDocument.status === 'failed' && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}>
            {activeDocument.error_message ||
              'This document failed to process. Delete it and try uploading again.'}
          </p>
        )}

        {activeDocument && activeDocument.status === 'processing' && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}>
            {activeDocument.title || 'This document'} is still processing.
            Check back shortly.
          </p>
        )}

        {activeDocument &&
          activeDocument.status !== 'processing' &&
          activeDocument.status !== 'failed' && (
          <>
            <div className={styles.ragDocuments__docHeader}>
              <h3>{activeDocument.title || activeDocument.filename}</h3>
            </div>

            <div className={styles.ragDocuments__tabs} role='tablist'>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={activeTab === tab.id}
                  className={`${styles.ragDocuments__tab} ${
                    activeTab === tab.id ? styles['ragDocuments__tab--active'] : ''
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'ask' && (
              <div className={styles.ragDocuments__tabPanel}>
                <form onSubmit={handleAsk} className={styles.ragDocuments__queryForm}>
                  <input
                    type='text'
                    value={askQuery}
                    onChange={e => setAskQuery(e.target.value)}
                    placeholder='Ask a question about this document...'
                    className={styles.ragDocuments__queryInput}
                    disabled={isAsking}
                  />
                  <button
                    type='submit'
                    className={styles.ragDocuments__queryButton}
                    disabled={isAsking || !askQuery.trim()}
                  >
                    {isAsking ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>

                {askError && (
                  <p className={styles.ragDocuments__error}>{askError}</p>
                )}

                {askAnswer && (
                  <div className={styles.ragDocuments__answerPanel}>
                    <RagAnswerBody>
                      {askAnswer.answer || askAnswer.text || ''}
                    </RagAnswerBody>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className={styles.ragDocuments__tabPanel}>
                <form
                  onSubmit={handleSearch}
                  className={styles.ragDocuments__queryForm}
                >
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Search excerpts in this document...'
                    className={styles.ragDocuments__queryInput}
                    disabled={isSearching}
                  />
                  <button
                    type='submit'
                    className={styles.ragDocuments__queryButton}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      <Search size={16} />
                    )}
                  </button>
                </form>

                {searchError && (
                  <p className={styles.ragDocuments__error}>{searchError}</p>
                )}

                {searchResults && searchResults.length === 0 && (
                  <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
                    No matching excerpts found.
                  </p>
                )}

                {searchResults && searchResults.length > 0 && (
                  <ul className={styles.ragDocuments__excerptList}>
                    {searchResults.map(result => (
                      <li
                        key={result.chunkId}
                        className={styles.ragDocuments__excerpt}
                      >
                        <p className={styles.ragDocuments__excerptText}>
                          {result.excerpt}
                        </p>
                        {typeof result.score === 'number' && (
                          <span className={styles.ragDocuments__excerptScore}>
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <div className={styles.ragDocuments__tabPanel}>
                {isLoadingPreview && (
                  <p className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}>
                    Loading preview...
                  </p>
                )}
                {previewError && (
                  <p className={styles.ragDocuments__error}>{previewError}</p>
                )}
                {pdfObjectUrl && !isLoadingPreview && (
                  <iframe
                    src={pdfObjectUrl}
                    title='PDF preview'
                    className={styles.ragDocuments__pdfFrame}
                  />
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
