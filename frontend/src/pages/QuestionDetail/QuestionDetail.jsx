/**
 * Question Detail: full question thread with answers, a post-answer form,
 * an "AI Answer Fit" check before submitting a reply, and a Related Questions sidebar.
 * Owners can edit or delete their own question and their own answers.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  MessageSquare,
  Sparkles,
  Loader2,
  Send,
  Check,
  Copy,
  Code,
  Link2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-bash';
import { questionService } from '../../services/question/question.service.js';
import { answerService } from '../../services/answer/answer.service.js';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthoredByUser } from '../../lib/utils';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import styles from './QuestionDetail.module.css';

const ANSWER_MIN = 20;

const FIT_LABELS = {
  strong: 'STRONG FIT',
  partial: 'PARTIAL FIT',
  weak: 'WEAK FIT',
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function normalizeMarkdownContent(text) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const result = [];
  let inFence = false;
  let codeBuffer = [];

  function isCodeLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^(import |export |const |let |var |function |class |interface |type |return |from ["']|CREATE TABLE|SELECT |INSERT INTO|UPDATE |DELETE FROM)/i.test(trimmed)) return true;
    if (/^<[\w.]+[\s\S]*\/?>$/i.test(trimmed) || /^<\/[\w.]+>$/i.test(trimmed)) return true;
    if (/[;{}]$/.test(trimmed) || /\/>$/.test(trimmed)) return true;
    if (/(\(\s*\)\s*=>|=>|\buseState\(|\buseEffect\(|\buseParams\(|\bconsole\.log\()/.test(trimmed)) return true;
    if (line.startsWith('  ') && /[a-zA-Z0-9_$]/.test(trimmed)) return true;
    return false;
  }

  function flushCodeBuffer() {
    if (codeBuffer.length === 0) return;
    const strongCodeLines = codeBuffer.filter(l =>
      /^(import |export |function |const |let |var |class |CREATE TABLE|SELECT )/.test(l.trim()) ||
      /<[A-Z][\w.]*[\s\S]*\/?>/.test(l.trim())
    );
    if (codeBuffer.length >= 2 || strongCodeLines.length >= 1) {
      result.push('```jsx');
      result.push(...codeBuffer);
      result.push('```');
    } else {
      result.push(...codeBuffer);
    }
    codeBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) { flushCodeBuffer(); inFence = !inFence; result.push(line); continue; }
    if (inFence) { result.push(line); continue; }
    if (isCodeLine(line)) {
      codeBuffer.push(line);
    } else if (!trimmed && codeBuffer.length > 0) {
      const nextLine = lines[i + 1];
      if (nextLine && isCodeLine(nextLine)) { codeBuffer.push(line); }
      else { flushCodeBuffer(); result.push(line); }
    } else { flushCodeBuffer(); result.push(line); }
  }
  flushCodeBuffer();
  return result.join('\n');
}

function CodeBlock({ children, className }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const raw = typeof children === 'string'
    ? children
    : Array.isArray(children)
    ? children.map(c => (typeof c === 'string' ? c : c?.props?.children || '')).join('')
    : (children?.props?.children || '');
  const langMatch = typeof className === 'string' ? className.match(/language-([\w+#.-]+)/) : null;
  const lang = (langMatch ? langMatch[1] : 'javascript').toLowerCase();

  const handleCopy = () => {
    if (!raw) return;
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let highlightedHtml = '';
  try {
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    highlightedHtml = Prism.highlight(raw, grammar, lang);
  } catch { highlightedHtml = ''; }

  return (
    <div className={styles.codeWrap}>
      <button type='button' className={styles.codeCopyBtn} onClick={handleCopy} aria-label='Copy code' title='Copy code to clipboard'>
        {copied ? (<><Check size={13} /><span>Copied</span></>) : (<><Copy size={13} /><span>Copy</span></>)}
      </button>
      <pre ref={preRef} className={styles.pre}>
        {highlightedHtml
          ? <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          : <code>{raw}</code>}
      </pre>
    </div>
  );
}

function FormattedMarkdown({ content }) {
  if (!content) return null;
  const normalized = normalizeMarkdownContent(content);
  return (
    <div className={styles.markdownRoot}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node: _n, ...props }) => <p className={styles.markdownP} {...props} />,
          strong: ({ node: _n, ...props }) => <strong className={styles.markdownStrong} {...props} />,
          b: ({ node: _n, ...props }) => <strong className={styles.markdownStrong} {...props} />,
          em: ({ node: _n, ...props }) => <em className={styles.markdownEm} {...props} />,
          i: ({ node: _n, ...props }) => <em className={styles.markdownEm} {...props} />,
          ul: ({ node: _n, ...props }) => <ul className={styles.markdownUl} {...props} />,
          ol: ({ node: _n, ...props }) => <ol className={styles.markdownOl} {...props} />,
          li: ({ node: _n, ...props }) => <li className={styles.markdownLi} {...props} />,
          h1: ({ node: _n, ...props }) => <h2 className={styles.markdownH1} {...props} />,
          h2: ({ node: _n, ...props }) => <h3 className={styles.markdownH2} {...props} />,
          h3: ({ node: _n, ...props }) => <h4 className={styles.markdownH3} {...props} />,
          h4: ({ node: _n, ...props }) => <h5 className={styles.markdownH4} {...props} />,
          blockquote: ({ node: _n, ...props }) => <blockquote className={styles.markdownBlockquote} {...props} />,
          a: ({ node: _n, ...props }) => <a className={styles.markdownA} target='_blank' rel='noreferrer noopener' {...props} />,
          hr: ({ node: _n, ...props }) => <hr className={styles.markdownHr} {...props} />,
          pre: ({ node: _n, children }) => {
            const codeChild = Array.isArray(children) ? children[0] : children;
            const codeProps = codeChild?.props || {};
            return <CodeBlock className={codeProps.className || ''}>{codeProps.children || ''}</CodeBlock>;
          },
          code: ({ node: _n, className: codeCls, children, ...props }) => {
            const isBlock = Boolean(codeCls?.trim());
            if (isBlock) return <code className={codeCls} {...props}>{children}</code>;
            return <code className={styles.markdownInlineCode} {...props}>{children}</code>;
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

/** Inline markdown toolbar — reused for both answer form and edit forms */
function MarkdownToolbar({ onInsert, charCount }) {
  return (
    <div className={styles.questionDetail__toolbar}>
      <div className={styles.questionDetail__toolButtons}>
        <button type='button' className={styles.questionDetail__toolBtn} onClick={() => onInsert('bold')} title='Bold' aria-label='Bold'><strong>B</strong></button>
        <button type='button' className={styles.questionDetail__toolBtn} onClick={() => onInsert('italic')} title='Italic' aria-label='Italic'><em>I</em></button>
        <button type='button' className={styles.questionDetail__toolBtn} onClick={() => onInsert('code')} title='Code block' aria-label='Code block'><Code size={15} /></button>
        <button type='button' className={styles.questionDetail__toolBtn} onClick={() => onInsert('link')} title='Link' aria-label='Link'><Link2 size={15} /></button>
      </div>
      <span className={styles.questionDetail__charCount}>{charCount} characters</span>
    </div>
  );
}

/** Reusable delete confirmation dialog */
function DeleteConfirmDialog({ label, onConfirm, onCancel, isDeleting }) {
  return (
    <div className={styles.deleteDialog} role='dialog' aria-modal='true' aria-label={`Confirm delete ${label}`}>
      <p className={styles.deleteDialog__message}>
        Delete this {label}? This cannot be undone.
      </p>
      <div className={styles.deleteDialog__actions}>
        <button type='button' className={styles.deleteDialog__cancelBtn} onClick={onCancel} disabled={isDeleting}>
          Cancel
        </button>
        <button type='button' className={styles.deleteDialog__confirmBtn} onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />}
          {isDeleting ? 'Deleting...' : 'Yes, delete'}
        </button>
      </div>
    </div>
  );
}

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const answerTextareaRef = useRef(null);

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── New answer form ────────────────────────────────────────────────────────
  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  // ── AI answer-fit ──────────────────────────────────────────────────────────
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState(null);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [copied, setCopied] = useState(false);

  // ── Question edit ──────────────────────────────────────────────────────────
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editQError, setEditQError] = useState(null);
  const editQContentRef = useRef(null);

  // ── Question delete ────────────────────────────────────────────────────────
  const [showDeleteQuestion, setShowDeleteQuestion] = useState(false);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  // ── Answer edit (keyed by answer id) ──────────────────────────────────────
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAContent, setEditAContent] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [editAError, setEditAError] = useState(null);
  const editAContentRef = useRef(null);

  // ── Answer delete ──────────────────────────────────────────────────────────
  const [deletingAnswerId, setDeletingAnswerId] = useState(null);
  const [isDeletingAnswer, setIsDeletingAnswer] = useState(false);

  // ── Formatting helper (shared by all textareas via a ref + setter) ─────────
  function makeInserter(getText, setText, ref) {
    return function insertFormatting(type) {
      const textarea = ref.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = getText();
      const selection = text.substring(start, end);
      let replacement = '';
      let cursorOffset = 0;
      const beforeChar = start > 0 ? text[start - 1] : '';
      const afterChar = end < text.length ? text[end] : '';
      switch (type) {
        case 'bold': {
          const ls = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
          const ts = afterChar && !/\s/.test(afterChar) ? ' ' : '';
          const inner = selection || 'bold text';
          replacement = `${ls}**${inner}**${ts}`;
          cursorOffset = ls.length + 2 + (selection ? selection.length : 0);
          break;
        }
        case 'italic': {
          const ls = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
          const ts = afterChar && !/\s/.test(afterChar) ? ' ' : '';
          const inner = selection || 'italic text';
          replacement = `${ls}*${inner}*${ts}`;
          cursorOffset = ls.length + 1 + (selection ? selection.length : 0);
          break;
        }
        case 'code': {
          if (selection.includes('\n') || !selection) {
            const pre = start > 0 && beforeChar !== '\n' ? '\n\n' : start > 0 && text[start - 2] !== '\n' && beforeChar === '\n' ? '\n' : '';
            const suf = afterChar && afterChar !== '\n' ? '\n\n' : '\n';
            const inner = selection || '// code here';
            replacement = `${pre}\`\`\`javascript\n${inner}\n\`\`\`${suf}`;
            cursorOffset = pre.length + 14 + (selection ? selection.length : 0);
          } else {
            replacement = `\`${selection}\``;
            cursorOffset = replacement.length;
          }
          break;
        }
        case 'link': {
          const ls = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
          const inner = selection || 'link text';
          replacement = `${ls}[${inner}](https://example.com)`;
          cursorOffset = ls.length + 1 + inner.length + 2;
          break;
        }
        default: return;
      }
      const newContent = text.substring(0, start) + replacement + text.substring(end);
      setText(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }, 0);
    };
  }

  const insertAnswerFormatting = makeInserter(() => answerText, setAnswerText, answerTextareaRef);
  const insertEditQFormatting  = makeInserter(() => editQContent, setEditQContent, editQContentRef);
  const insertEditAFormatting  = makeInserter(() => editAContent, setEditAContent, editAContentRef);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function fetchQuestion() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await questionService.getSingleQuestion(questionHash);
        if (!isMounted) return;
        setQuestion(data?.question || data);
        setAnswers(data?.answers || []);
        try {
          const similar = await questionService.getSimilarQuestions(questionHash);
          if (isMounted) setSimilarQuestions(similar || []);
        } catch { if (isMounted) setSimilarQuestions([]); }
      } catch (err) {
        if (isMounted) setLoadError(err.message || 'Failed to load question details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchQuestion();
    return () => { isMounted = false; };
  }, [questionHash]);

  const isOwnQuestion = isAuthoredByUser(question, user);

  // ── Share ──────────────────────────────────────────────────────────────────
  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Question edit handlers ─────────────────────────────────────────────────
  function startEditQuestion() {
    setEditQTitle(question.title || '');
    setEditQContent(question.content || '');
    setEditQError(null);
    setIsEditingQuestion(true);
    setShowDeleteQuestion(false);
  }

  function cancelEditQuestion() {
    setIsEditingQuestion(false);
    setEditQError(null);
  }

  async function handleSaveQuestion(e) {
    e.preventDefault();
    if (editQTitle.trim().length < 5) { setEditQError('Title must be at least 5 characters.'); return; }
    if (editQContent.trim().length < 10) { setEditQError('Content must be at least 10 characters.'); return; }
    setEditQError(null);
    setIsSavingQuestion(true);
    try {
      const updated = await questionService.updateQuestion(questionHash, {
        title: editQTitle.trim(),
        content: editQContent.trim(),
      });
      setQuestion(prev => ({ ...prev, ...updated }));
      setIsEditingQuestion(false);
    } catch (err) {
      setEditQError(err.message || 'Failed to update question.');
    } finally {
      setIsSavingQuestion(false);
    }
  }

  // ── Question delete handlers ───────────────────────────────────────────────
  async function handleDeleteQuestion() {
    setIsDeletingQuestion(true);
    try {
      await questionService.deleteQuestion(questionHash);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setIsDeletingQuestion(false);
      setShowDeleteQuestion(false);
      alert(err.message || 'Failed to delete question.');
    }
  }

  // ── Answer edit handlers ───────────────────────────────────────────────────
  function startEditAnswer(answer) {
    setEditingAnswerId(answer.id);
    setEditAContent(answer.content || '');
    setEditAError(null);
    setDeletingAnswerId(null);
  }

  function cancelEditAnswer() {
    setEditingAnswerId(null);
    setEditAError(null);
  }

  async function handleSaveAnswer(e, answerId) {
    e.preventDefault();
    if (editAContent.trim().length < ANSWER_MIN) {
      setEditAError(`Answer must be at least ${ANSWER_MIN} characters.`);
      return;
    }
    setEditAError(null);
    setIsSavingAnswer(true);
    try {
      const updated = await answerService.updateAnswer(answerId, editAContent.trim());
      setAnswers(prev => prev.map(a => (a.id === answerId ? { ...a, ...updated } : a)));
      setEditingAnswerId(null);
    } catch (err) {
      setEditAError(err.message || 'Failed to update answer.');
    } finally {
      setIsSavingAnswer(false);
    }
  }

  // ── Answer delete handlers ─────────────────────────────────────────────────
  async function handleDeleteAnswer(answerId) {
    setIsDeletingAnswer(true);
    try {
      await answerService.deleteAnswer(answerId);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
      setDeletingAnswerId(null);
    } catch (err) {
      setIsDeletingAnswer(false);
      setDeletingAnswerId(null);
      alert(err.message || 'Failed to delete answer.');
    }
  }

  // ── AI fit ─────────────────────────────────────────────────────────────────
  async function handleCheckFit() {
    if (answerText.trim().length < ANSWER_MIN) { setFitError(`Answer must be at least ${ANSWER_MIN} characters.`); return; }
    setFitError(null);
    setIsCheckingFit(true);
    try {
      const result = await questionService.assessAnswerFit(questionHash, answerText);
      setFitResult(result);
    } catch (err) {
      setFitError(err.message || 'Failed to check answer fit.');
    } finally {
      setIsCheckingFit(false);
    }
  }

  // ── Post new answer ────────────────────────────────────────────────────────
  async function handlePostAnswer(e) {
    e.preventDefault();
    if (answerText.trim().length < ANSWER_MIN) { setPostError(`Answer must be at least ${ANSWER_MIN} characters.`); return; }
    setPostError(null);
    setIsPosting(true);
    try {
      const newAnswer = await answerService.postAnswer(question.id, answerText.trim());
      setAnswers(prev => [...prev, newAnswer]);
      setAnswerText('');
      setFitResult(null);
    } catch (err) {
      setPostError(err.message || 'Failed to post answer.');
    } finally {
      setIsPosting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.questionDetail__centerState}>
        <Loader2 size={32} className={styles.spin} />
        <p className={styles.questionDetail__loadingText}>Loading question details...</p>
      </div>
    );
  }

  if (loadError || !question) {
    return (
      <div className={styles.questionDetail__centerState}>
        <h2 className={styles.questionDetail__errorHeading}>{loadError || 'Failed to load question details.'}</h2>
        <button type='button' className={styles.questionDetail__returnBtn} onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Anonymous';
  const postedDate = formatDate(question.createdAt);

  return (
    <div className={styles.questionDetail}>
      {/* Back Navigation */}
      <button type='button' className={styles.questionDetail__backNav} onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        <span>Back to feed</span>
      </button>

      <div className={styles.questionDetail__layout}>
        {/* ── Left Column ────────────────────────────────────────────────── */}
        <div className={styles.questionDetail__mainColumn}>

          {/* ── Question Card ─────────────────────────────────────────────── */}
          <article className={styles.questionDetail__questionCard}>
            <div className={styles.questionDetail__authorHeader}>
              <UserAvatar name={authorName} size='lg' />
              <div className={styles.questionDetail__authorInfo}>
                <span className={styles.questionDetail__authorName}>{authorName}</span>
                <span className={styles.questionDetail__postedDate}>{postedDate ? `Posted ${postedDate}` : ''}</span>
              </div>
              {/* Edit / Delete buttons — owner only */}
              {isOwnQuestion && !isEditingQuestion && (
                <div className={styles.questionDetail__ownerActions}>
                  <button
                    type='button'
                    className={styles.questionDetail__editBtn}
                    onClick={startEditQuestion}
                    title='Edit question'
                    aria-label='Edit question'
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    type='button'
                    className={styles.questionDetail__deleteBtn}
                    onClick={() => { setShowDeleteQuestion(true); setIsEditingQuestion(false); }}
                    title='Delete question'
                    aria-label='Delete question'
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delete confirmation */}
            {showDeleteQuestion && (
              <DeleteConfirmDialog
                label='question'
                onConfirm={handleDeleteQuestion}
                onCancel={() => setShowDeleteQuestion(false)}
                isDeleting={isDeletingQuestion}
              />
            )}

            {/* Edit form or read view */}
            {isEditingQuestion ? (
              <form className={styles.questionDetail__editForm} onSubmit={handleSaveQuestion}>
                <label className={styles.questionDetail__editLabel} htmlFor='editQTitle'>Title</label>
                <input
                  id='editQTitle'
                  type='text'
                  className={styles.questionDetail__editInput}
                  value={editQTitle}
                  onChange={e => setEditQTitle(e.target.value)}
                  disabled={isSavingQuestion}
                  maxLength={255}
                />
                <label className={styles.questionDetail__editLabel} htmlFor='editQContent'>Content</label>
                <div className={styles.questionDetail__editorContainer}>
                  <MarkdownToolbar onInsert={insertEditQFormatting} charCount={editQContent.length} />
                  <textarea
                    id='editQContent'
                    ref={editQContentRef}
                    className={styles.questionDetail__answerTextarea}
                    value={editQContent}
                    onChange={e => setEditQContent(e.target.value)}
                    rows={8}
                    disabled={isSavingQuestion}
                  />
                </div>
                {editQError && <p className={styles.questionDetail__error} role='alert'>{editQError}</p>}
                <div className={styles.questionDetail__editActions}>
                  <button type='button' className={styles.questionDetail__cancelEditBtn} onClick={cancelEditQuestion} disabled={isSavingQuestion}>
                    <X size={14} /> Cancel
                  </button>
                  <button type='submit' className={styles.questionDetail__saveBtn} disabled={isSavingQuestion}>
                    {isSavingQuestion ? <><Loader2 size={14} className={styles.spin} /> Saving...</> : <><Check size={14} /> Save changes</>}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className={styles.questionDetail__title}>{question.title}</h1>
                <div className={styles.questionDetail__body}>
                  <FormattedMarkdown content={question.content || ''} />
                </div>
              </>
            )}

            {/* Bottom bar — only shown when not editing */}
            {!isEditingQuestion && (
              <div className={styles.questionDetail__bottomBar}>
                <button type='button' className={styles.questionDetail__badgeBtn} onClick={handleShare} title='Copy link to question'>
                  {copied
                    ? <><Check size={14} className={styles.questionDetail__checkIcon} /><span>Copied!</span></>
                    : <><Share2 size={14} /><span>Share</span></>}
                </button>
                <div className={styles.questionDetail__badgePill}>
                  <MessageSquare size={14} />
                  <span>{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</span>
                </div>
              </div>
            )}
          </article>

          {/* ── Answers Section ───────────────────────────────────────────── */}
          <section className={styles.questionDetail__answersSection}>
            <h2 className={styles.questionDetail__answersHeading}>Community Answers ({answers.length})</h2>

            {answers.length === 0 ? (
              <div className={styles.questionDetail__emptyAnswersCard}>
                <MessageSquare size={32} className={styles.questionDetail__emptyIcon} />
                <h3 className={styles.questionDetail__emptyTitle}>No answers yet.</h3>
                <p className={styles.questionDetail__emptySubtext}>
                  Hang tight! The community has been notified and someone will be along to help you out shortly.
                </p>
              </div>
            ) : (
              <ul className={styles.questionDetail__answerList}>
                {answers.map(answer => {
                  const answerAuthor = answer.author || {};
                  const answerAuthorName = `${answerAuthor.firstName || ''} ${answerAuthor.lastName || ''}`.trim() || 'Anonymous';
                  const answerDate = formatDate(answer.createdAt);
                  const isOwnAnswer = isAuthoredByUser(answer, user);
                  const isThisEditing = editingAnswerId === answer.id;
                  const isThisDeleting = deletingAnswerId === answer.id;

                  return (
                    <li key={answer.id} className={styles.questionDetail__answerCard}>
                      <div className={styles.questionDetail__answerHeader}>
                        <UserAvatar name={answerAuthorName} size='md' />
                        <div className={styles.questionDetail__answerAuthorMeta}>
                          <span className={styles.questionDetail__answerAuthorName}>{answerAuthorName}</span>
                          <span className={styles.questionDetail__answerDate}>{answerDate}</span>
                        </div>
                        {/* Answer owner actions */}
                        {isOwnAnswer && !isThisEditing && !isThisDeleting && (
                          <div className={styles.questionDetail__ownerActions}>
                            <button
                              type='button'
                              className={styles.questionDetail__editBtn}
                              onClick={() => startEditAnswer(answer)}
                              title='Edit answer'
                              aria-label='Edit answer'
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type='button'
                              className={styles.questionDetail__deleteBtn}
                              onClick={() => { setDeletingAnswerId(answer.id); setEditingAnswerId(null); }}
                              title='Delete answer'
                              aria-label='Delete answer'
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Delete confirmation for this answer */}
                      {isThisDeleting && (
                        <DeleteConfirmDialog
                          label='answer'
                          onConfirm={() => handleDeleteAnswer(answer.id)}
                          onCancel={() => setDeletingAnswerId(null)}
                          isDeleting={isDeletingAnswer}
                        />
                      )}

                      {/* Edit form or read view */}
                      {isThisEditing ? (
                        <form
                          className={styles.questionDetail__editForm}
                          onSubmit={e => handleSaveAnswer(e, answer.id)}
                        >
                          <div className={styles.questionDetail__editorContainer}>
                            <MarkdownToolbar onInsert={insertEditAFormatting} charCount={editAContent.length} />
                            <textarea
                              ref={editAContentRef}
                              className={styles.questionDetail__answerTextarea}
                              value={editAContent}
                              onChange={e => setEditAContent(e.target.value)}
                              rows={6}
                              disabled={isSavingAnswer}
                            />
                          </div>
                          {editAError && <p className={styles.questionDetail__error} role='alert'>{editAError}</p>}
                          <div className={styles.questionDetail__editActions}>
                            <button type='button' className={styles.questionDetail__cancelEditBtn} onClick={cancelEditAnswer} disabled={isSavingAnswer}>
                              <X size={14} /> Cancel
                            </button>
                            <button type='submit' className={styles.questionDetail__saveBtn} disabled={isSavingAnswer}>
                              {isSavingAnswer ? <><Loader2 size={14} className={styles.spin} /> Saving...</> : <><Check size={14} /> Save changes</>}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.questionDetail__answerBody}>
                          <FormattedMarkdown content={answer.content || ''} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Post new answer form or own-question notice */}
            {isOwnQuestion ? (
              <div className={styles.questionDetail__ownNotice}>
                <p>You cannot answer your own question.</p>
              </div>
            ) : (
              <form className={styles.questionDetail__answerForm} onSubmit={handlePostAnswer}>
                <h2 className={styles.questionDetail__answerFormHeading}>Contribute an answer</h2>
                <div className={styles.questionDetail__editorContainer}>
                  <MarkdownToolbar onInsert={insertAnswerFormatting} charCount={answerText.length} />
                  <textarea
                    ref={answerTextareaRef}
                    id='answer'
                    value={answerText}
                    onChange={e => {
                      setAnswerText(e.target.value);
                      if (postError) setPostError(null);
                      if (fitError) setFitError(null);
                    }}
                    placeholder='Share what worked for you, with enough detail to reproduce it...'
                    className={styles.questionDetail__answerTextarea}
                    rows={8}
                    disabled={isPosting}
                  />
                </div>

                {postError && <p className={styles.questionDetail__error} role='alert'>{postError}</p>}
                {fitError  && <p className={styles.questionDetail__error} role='alert'>{fitError}</p>}

                <div className={styles.questionDetail__aiFitRow}>
                  <button type='button' className={styles.questionDetail__fitButton} onClick={handleCheckFit} disabled={isCheckingFit || isPosting}>
                    {isCheckingFit ? <Loader2 size={14} className={styles.spin} /> : <Sparkles size={14} className={styles.questionDetail__sparkleIcon} />}
                    <span>{isCheckingFit ? 'Checking fit...' : 'Check draft fit'}</span>
                  </button>
                  <span className={styles.questionDetail__fitSubtitle}>Relevance only. Not grading correctness. You need at least 20 characters.</span>
                </div>

                {fitResult && (
                  <div
                    className={`${styles.questionDetail__fitPanel} ${styles[`questionDetail__fitPanel--${fitResult.level?.toLowerCase()}`] || ''}`}
                    role='region'
                    aria-label='Answer fit assessment'
                  >
                    <div className={styles.questionDetail__fitBadgeWrapper}>
                      <span className={`${styles.questionDetail__fitBadge} ${styles[`questionDetail__fitBadge--${fitResult.level?.toLowerCase()}`] || ''}`}>
                        {FIT_LABELS[fitResult.level?.toLowerCase()] || fitResult.level?.toUpperCase() || 'FIT'}
                      </span>
                    </div>
                    {fitResult.note && <p className={styles.questionDetail__fitNote}>{fitResult.note}</p>}
                  </div>
                )}

                <div className={styles.questionDetail__submitRow}>
                  <button type='submit' className={styles.questionDetail__submitButton} disabled={isPosting || isCheckingFit}>
                    {isPosting
                      ? <><Loader2 size={15} className={styles.spin} /><span>Posting...</span></>
                      : <span>Post Your Answer</span>}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* ── Right Column (sidebar) ────────────────────────────────────── */}
        <aside className={styles.questionDetail__sidebar} aria-label='Related questions'>
          <h2 className={styles.questionDetail__sidebarHeading}>Related Questions</h2>
          {similarQuestions.length === 0 ? (
            <div className={styles.questionDetail__noSimilar}><p>No related questions found.</p></div>
          ) : (
            <div className={styles.questionDetail__similarList}>
              {similarQuestions.map(item => {
                const itemAuthor = item.author || {};
                const itemAuthorName = `${itemAuthor.firstName || ''} ${itemAuthor.lastName || ''}`.trim() || item.authorName || 'Student';
                const itemDate = formatDate(item.createdAt);
                return (
                  <article
                    key={item.id || item.questionHash}
                    className={styles.questionDetail__similarCard}
                    onClick={() => navigate(`/questions/${item.questionHash}`)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/questions/${item.questionHash}`); }}
                  >
                    <h3 className={styles.questionDetail__similarTitle}>{item.title}</h3>
                    <div className={styles.questionDetail__similarMeta}>
                      <span className={styles.questionDetail__similarAuthor}>{itemAuthorName}</span>
                      <span className={styles.questionDetail__similarDate}>{itemDate}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
