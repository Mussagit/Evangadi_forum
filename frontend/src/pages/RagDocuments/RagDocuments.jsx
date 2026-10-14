/**
 * RAG Documents (Knowledge Base): Private PDF library, inline reader,
 * semantic search, and AI-grounded query in a unified 2-column interface.
 * Data: `ragService`.
 */

import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Trash2,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { ragService } from '../../services/rag/rag.service.js';
import RagAnswerBody from '../../components/RagAnswerBody/RagAnswerBody.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './RagDocuments.module.css';

export default function RagDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Active document selection
  const [activeDocumentId, setActiveDocumentId] = useState(null);

  // Reader state
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Semantic search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState(null);
  const [askError, setAskError] = useState(null);

  const activeDocument =
    documents.find(doc => doc.document_id === activeDocumentId) || null;

  async function loadDocuments() {
    setIsLoadingList(true);
    setListError(null);
    try {
      const docs = await ragService.listDocuments();
      const list = docs || [];
      setDocuments(list);
      if (list.length > 0 && !activeDocumentId) {
        setActiveDocumentId(list[0].document_id);
      }
    } catch (err) {
      setListError(err.message || 'Failed to load documents.');
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  // Reset search and AI query on active document change
  useEffect(() => {
    setAskQuery('');
    setAskAnswer(null);
    setAskError(null);
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
  }, [activeDocumentId]);

  // Load PDF Object URL for Reader when active document changes
  useEffect(() => {
    if (!activeDocument || activeDocument.status !== 'ready') {
      setPdfObjectUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
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
        if (isMounted) setPreviewError(err.message || 'Failed to load PDF preview.');
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeDocument?.document_id, activeDocument?.status]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError('Please choose a PDF file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await ragService.uploadPdf(selectedFile);
      setDocuments(prev => [uploaded, ...prev]);
      setActiveDocumentId(uploaded.document_id);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(e, documentId) {
    e.stopPropagation();
    try {
      await ragService.deleteDocument(documentId);
      setDocuments(prev => {
        const remaining = prev.filter(doc => doc.document_id !== documentId);
        if (activeDocumentId === documentId) {
          setActiveDocumentId(remaining[0]?.document_id || null);
        }
        return remaining;
      });
    } catch (err) {
      setListError(err.message || 'Failed to delete document.');
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
      setAskError(err.message || 'Could not get an answer.');
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className={styles.ragDocuments}>
      {/* Top Header Card */}
      <header className={styles.ragDocuments__headerCard}>
        <p className={styles.ragDocuments__eyebrow}>KNOWLEDGE BASE</p>
        <h1 className={styles.ragDocuments__title}>Private PDF library</h1>
        <p className={styles.ragDocuments__description}>
          Upload study or reference PDFs to your own workspace. Each file is indexed for semantic search and optional AI answers that cite passages from that document only. File size limits apply on the server; other users never see your uploads.
        </p>
      </header>

      {/* 2-Column Main Workspace */}
      <div className={styles.ragDocuments__workspace}>
        {/* Left Column: Library & Upload */}
        <aside className={styles.ragDocuments__libraryCard}>
          <div className={styles.ragDocuments__libraryHeader}>
            <h2 className={styles.ragDocuments__libraryTitle}>Library</h2>
            <p className={styles.ragDocuments__librarySubtitle}>
              Add PDFs here. Processing runs once per upload.
            </p>
          </div>

          {/* Upload Drop Area */}
          <div className={styles.ragDocuments__uploadBox}>
            <p className={styles.ragDocuments__uploadHint}>
              Accepted format: PDF. Maximum file size is enforced by the server.
            </p>
            <div className={styles.ragDocuments__uploadActions}>
              <button
                type='button'
                className={styles.ragDocuments__chooseBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText size={15} />
                <span>Choose file</span>
              </button>
              <button
                type='button'
                className={styles.ragDocuments__uploadBtn}
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <Loader2 size={15} className={styles.spin} />
                ) : (
                  <UploadCloud size={15} />
                )}
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
              </button>
            </div>
            <p className={styles.ragDocuments__fileNameText}>
              {selectedFile ? selectedFile.name : 'No file selected.'}
            </p>
            <input
              ref={fileInputRef}
              type='file'
              accept='application/pdf'
              hidden
              onChange={handleFileChange}
            />
          </div>

          {uploadError && (
            <p className={styles.ragDocuments__uploadError}>{uploadError}</p>
          )}

          {/* Documents List */}
          <div className={styles.ragDocuments__listSection}>
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
              <p className={styles.ragDocuments__emptyText}>
                No PDFs uploaded yet.
              </p>
            )}

            {!isLoadingList && documents.length > 0 && (
              <div className={styles.ragDocuments__list}>
                {documents.map(doc => {
                  const isActive = doc.document_id === activeDocumentId;
                  const docTitle = doc.title || doc.filename || 'Untitled document';

                  return (
                    <div
                      key={doc.document_id}
                      className={`${styles.ragDocuments__docItem} ${
                        isActive ? styles['ragDocuments__docItem--active'] : ''
                      }`}
                      onClick={() => setActiveDocumentId(doc.document_id)}
                      role='button'
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveDocumentId(doc.document_id);
                        }
                      }}
                    >
                      <div className={styles.ragDocuments__docItemTop}>
                        <span className={styles.ragDocuments__docItemTitle} title={docTitle}>
                          {docTitle}
                        </span>
                        <button
                          type='button'
                          className={styles.ragDocuments__docDeleteBtn}
                          onClick={e => handleDelete(e, doc.document_id)}
                          aria-label='Delete document'
                          title='Delete document'
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className={styles.ragDocuments__docItemBottom}>
                        {doc.status === 'ready' && (
                          <span className={styles.ragDocuments__badgeReady}>READY</span>
                        )}
                        {doc.status === 'processing' && (
                          <span className={styles.ragDocuments__badgeProcessing}>
                            PROCESSING
                          </span>
                        )}
                        {doc.status === 'failed' && (
                          <span className={styles.ragDocuments__badgeFailed}>FAILED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Unified Reader + Semantic Search + Ask with AI */}
        <main className={styles.ragDocuments__contentCard}>
          {!activeDocument ? (
            <div className={styles.ragDocuments__noSelection}>
              <FileText size={36} className={styles.ragDocuments__noSelectionIcon} />
              <h3>No document selected</h3>
              <p>Select a PDF from your library or upload a new one to preview and interact with it.</p>
            </div>
          ) : (
            <>
              {/* 1. Reader Section */}
              <section className={styles.ragDocuments__section}>
                <h2 className={styles.ragDocuments__sectionTitle}>Reader</h2>
                <p className={styles.ragDocuments__sectionSubtitle}>
                  Inline preview of the selected PDF.
                </p>

                <div className={styles.ragDocuments__readerFrame}>
                  {isLoadingPreview && (
                    <div className={styles.ragDocuments__previewStatus}>
                      <Loader2 size={24} className={styles.spin} />
                      <p>Loading PDF preview...</p>
                    </div>
                  )}

                  {previewError && (
                    <div className={styles.ragDocuments__previewStatus}>
                      <p className={styles.ragDocuments__error}>{previewError}</p>
                    </div>
                  )}

                  {pdfObjectUrl && !isLoadingPreview && !previewError && (
                    <iframe
                      src={pdfObjectUrl}
                      title='PDF Preview'
                      className={styles.ragDocuments__iframe}
                    />
                  )}

                  {!pdfObjectUrl && !isLoadingPreview && !previewError && (
                    <div className={styles.ragDocuments__previewStatus}>
                      <p>PDF preview is ready.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Semantic Search Section */}
              <section className={styles.ragDocuments__section}>
                <h2 className={styles.ragDocuments__sectionTitle}>Semantic search</h2>
                <p className={styles.ragDocuments__sectionSubtitle}>
                  Finds passages by meaning (embeddings), not only exact keywords.
                </p>

                <form onSubmit={handleSearch} className={styles.ragDocuments__form}>
                  <label htmlFor='rag-search-input' className={styles.ragDocuments__label}>
                    Search query
                  </label>
                  <input
                    id='rag-search-input'
                    type='text'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Describe the topic or phrase you are looking for'
                    className={styles.ragDocuments__input}
                    disabled={isSearching}
                  />

                  <button
                    type='submit'
                    className={styles.ragDocuments__actionBtn}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>{isSearching ? 'Searching...' : 'Search'}</span>
                  </button>
                </form>

                {searchError && (
                  <div className={styles.ragDocuments__errorBanner} role='alert'>
                    {searchError}
                  </div>
                )}

                {searchResults && searchResults.length === 0 && (
                  <p className={styles.ragDocuments__emptyResults}>
                    No matching passages found in this document.
                  </p>
                )}

                {searchResults && searchResults.length > 0 && (
                  <ul className={styles.ragDocuments__excerptList}>
                    {searchResults.map((result, idx) => (
                      <li key={result.chunkId || idx} className={styles.ragDocuments__excerptItem}>
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
              </section>

              {/* 3. Ask with AI Section */}
              <section className={styles.ragDocuments__section}>
                <h2 className={styles.ragDocuments__sectionTitle}>Ask with AI</h2>
                <p className={styles.ragDocuments__sectionSubtitle}>
                  Answers use only retrieved excerpts from this PDF, with citations where possible. When the document includes code, the reply may show it in formatted blocks you can copy.
                </p>

                <form onSubmit={handleAsk} className={styles.ragDocuments__form}>
                  <label htmlFor='rag-ask-input' className={styles.ragDocuments__label}>
                    Question
                  </label>
                  <textarea
                    id='rag-ask-input'
                    value={askQuery}
                    onChange={e => setAskQuery(e.target.value)}
                    placeholder='What does this PDF recommend for route persistence?'
                    className={styles.ragDocuments__textarea}
                    rows={3}
                    disabled={isAsking}
                  />

                  <button
                    type='submit'
                    className={styles.ragDocuments__actionBtn}
                    disabled={isAsking || !askQuery.trim()}
                  >
                    {isAsking ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>{isAsking ? 'Asking...' : 'Ask'}</span>
                  </button>
                </form>

                {askError && (
                  <div className={styles.ragDocuments__errorBanner} role='alert'>
                    {askError}
                  </div>
                )}

                {askAnswer && (
                  <div className={styles.ragDocuments__answerContainer}>
                    <RagAnswerBody>
                      {askAnswer.answer || askAnswer.text || ''}
                    </RagAnswerBody>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
