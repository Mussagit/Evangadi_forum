/**
 * Question Detail — full question thread with:
 *  • Threaded replies on each answer
 *  • Edit / Delete buttons at the BOTTOM of question and answer cards
 *  • AI suggestions sidebar: related questions + related answers
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Share2, MessageSquare, Sparkles, Loader2,
  Check, Copy, Code, Link2, Pencil, Trash2, X, ChevronDown, ChevronUp,
  CornerDownRight, Wand2,
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
const FIT_LABELS = { strong: 'STRONG FIT', partial: 'PARTIAL FIT', weak: 'WEAK FIT' };

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
}
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString();
}

// ── Markdown normalization ────────────────────────────────────────────────────
function normalizeMarkdownContent(text) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const result = [];
  let inFence = false;
  let codeBuffer = [];
  function isCodeLine(line) {
    const t = line.trim();
    if (!t) return false;
    if (/^(import |export |const |let |var |function |class |interface |type |return |from ["']|CREATE TABLE|SELECT |INSERT INTO|UPDATE |DELETE FROM)/i.test(t)) return true;
    if (/^<[\w.]+[\s\S]*\/?>$/i.test(t) || /^<\/[\w.]+>$/i.test(t)) return true;
    if (/[;{}]$/.test(t) || /\/>$/.test(t)) return true;
    if (/(\(\s*\)\s*=>|=>|\buseState\(|\buseEffect\(|\buseParams\(|\bconsole\.log\()/.test(t)) return true;
    if (line.startsWith('  ') && /[a-zA-Z0-9_$]/.test(t)) return true;
    return false;
  }
  function flushCodeBuffer() {
    if (!codeBuffer.length) return;
    const strong = codeBuffer.filter(l => /^(import |export |function |const |let |var |class |CREATE TABLE|SELECT )/.test(l.trim()) || /<[A-Z][\w.]*[\s\S]*\/?>/.test(l.trim()));
    if (codeBuffer.length >= 2 || strong.length >= 1) { result.push('```jsx'); result.push(...codeBuffer); result.push('```'); }
    else result.push(...codeBuffer);
    codeBuffer = [];
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; const t = line.trim();
    if (t.startsWith('```')) { flushCodeBuffer(); inFence = !inFence; result.push(line); continue; }
    if (inFence) { result.push(line); continue; }
    if (isCodeLine(line)) { codeBuffer.push(line); }
    else if (!t && codeBuffer.length > 0) { if (lines[i + 1] && isCodeLine(lines[i + 1])) codeBuffer.push(line); else { flushCodeBuffer(); result.push(line); } }
    else { flushCodeBuffer(); result.push(line); }
  }
  flushCodeBuffer();
  return result.join('\n');
}

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ children, className }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const raw = typeof children === 'string' ? children : Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : c?.props?.children || '').join('') : (children?.props?.children || '');
  const langMatch = typeof className === 'string' ? className.match(/language-([\w+#.-]+)/) : null;
  const lang = (langMatch ? langMatch[1] : 'javascript').toLowerCase();
  const handleCopy = () => { navigator.clipboard.writeText(raw); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  let highlightedHtml = '';
  try { const g = Prism.languages[lang] || Prism.languages.javascript; highlightedHtml = Prism.highlight(raw, g, lang); } catch { highlightedHtml = ''; }
  return (
    <div className={styles.codeWrap}>
      <button type='button' className={styles.codeCopyBtn} onClick={handleCopy} aria-label='Copy code'>
        {copied ? <><Check size={13} /><span>Copied</span></> : <><Copy size={13} /><span>Copy</span></>}
      </button>
      <pre ref={preRef} className={styles.pre}>
        {highlightedHtml ? <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlightedHtml }} /> : <code>{raw}</code>}
      </pre>
    </div>
  );
}

function FormattedMarkdown({ content }) {
  if (!content) return null;
  const normalized = normalizeMarkdownContent(content);
  return (
    <div className={styles.markdownRoot}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ node: _n, ...p }) => <p className={styles.markdownP} {...p} />,
        strong: ({ node: _n, ...p }) => <strong className={styles.markdownStrong} {...p} />,
        b: ({ node: _n, ...p }) => <strong className={styles.markdownStrong} {...p} />,
        em: ({ node: _n, ...p }) => <em className={styles.markdownEm} {...p} />,
        ul: ({ node: _n, ...p }) => <ul className={styles.markdownUl} {...p} />,
        ol: ({ node: _n, ...p }) => <ol className={styles.markdownOl} {...p} />,
        li: ({ node: _n, ...p }) => <li className={styles.markdownLi} {...p} />,
        h1: ({ node: _n, ...p }) => <h2 className={styles.markdownH1} {...p} />,
        h2: ({ node: _n, ...p }) => <h3 className={styles.markdownH2} {...p} />,
        h3: ({ node: _n, ...p }) => <h4 className={styles.markdownH3} {...p} />,
        h4: ({ node: _n, ...p }) => <h5 className={styles.markdownH4} {...p} />,
        blockquote: ({ node: _n, ...p }) => <blockquote className={styles.markdownBlockquote} {...p} />,
        a: ({ node: _n, ...p }) => <a className={styles.markdownA} target='_blank' rel='noreferrer noopener' {...p} />,
        hr: ({ node: _n, ...p }) => <hr className={styles.markdownHr} {...p} />,
        pre: ({ node: _n, children: ch }) => {
          const cp = (Array.isArray(ch) ? ch[0] : ch)?.props || {};
          return <CodeBlock className={cp.className || ''}>{cp.children || ''}</CodeBlock>;
        },
        code: ({ node: _n, className: cc, children: ch, ...p }) =>
          cc?.trim() ? <code className={cc} {...p}>{ch}</code> : <code className={styles.markdownInlineCode} {...p}>{ch}</code>,
      }}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

// ── Shared markdown toolbar ───────────────────────────────────────────────────
function MarkdownToolbar({ onInsert, charCount }) {
  return (
    <div className={styles.qd__toolbar}>
      <div className={styles.qd__toolButtons}>
        <button type='button' className={styles.qd__toolBtn} onClick={() => onInsert('bold')} title='Bold'><strong>B</strong></button>
        <button type='button' className={styles.qd__toolBtn} onClick={() => onInsert('italic')} title='Italic'><em>I</em></button>
        <button type='button' className={styles.qd__toolBtn} onClick={() => onInsert('code')} title='Code'><Code size={14} /></button>
        <button type='button' className={styles.qd__toolBtn} onClick={() => onInsert('link')} title='Link'><Link2 size={14} /></button>
      </div>
      <span className={styles.qd__charCount}>{charCount} chars</span>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel, isDeleting }) {
  return (
    <div className={styles.qd__deleteConfirm} role='dialog' aria-modal='true'>
      <p className={styles.qd__deleteMsg}>Delete this {label}? This cannot be undone.</p>
      <div className={styles.qd__deleteActions}>
        <button type='button' className={styles.qd__cancelBtn} onClick={onCancel} disabled={isDeleting}>Cancel</button>
        <button type='button' className={styles.qd__confirmBtn} onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? <Loader2 size={13} className={styles.spin} /> : <Trash2 size={13} />}
          {isDeleting ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  );
}

// ── Formatting inserter factory ───────────────────────────────────────────────
function makeInserter(getText, setText, ref) {
  return function insert(type) {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const text = getText(); const sel = text.substring(s, e);
    const bc = s > 0 ? text[s - 1] : ''; const ac = e < text.length ? text[e] : '';
    let rep = '', cur = 0;
    switch (type) {
      case 'bold': { const ls = bc && !/\s/.test(bc) ? ' ' : ''; const ts = ac && !/\s/.test(ac) ? ' ' : ''; const inner = sel || 'bold text'; rep = `${ls}**${inner}**${ts}`; cur = ls.length + 2 + (sel ? sel.length : 0); break; }
      case 'italic': { const ls = bc && !/\s/.test(bc) ? ' ' : ''; const ts = ac && !/\s/.test(ac) ? ' ' : ''; const inner = sel || 'italic text'; rep = `${ls}*${inner}*${ts}`; cur = ls.length + 1 + (sel ? sel.length : 0); break; }
      case 'code': {
        if (sel.includes('\n') || !sel) {
          const pre = s > 0 && bc !== '\n' ? '\n\n' : s > 0 && text[s - 2] !== '\n' && bc === '\n' ? '\n' : '';
          const suf = ac && ac !== '\n' ? '\n\n' : '\n';
          const inner = sel || '// code here'; rep = `${pre}\`\`\`javascript\n${inner}\n\`\`\`${suf}`; cur = pre.length + 14 + (sel ? sel.length : 0);
        } else { rep = `\`${sel}\``; cur = rep.length; } break;
      }
      case 'link': { const ls = bc && !/\s/.test(bc) ? ' ' : ''; const inner = sel || 'link text'; rep = `${ls}[${inner}](https://example.com)`; cur = ls.length + 1 + inner.length + 2; break; }
      default: return;
    }
    const newText = text.substring(0, s) + rep + text.substring(e);
    setText(newText);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + cur, s + cur); }, 0);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reply thread component (per-answer)
// ─────────────────────────────────────────────────────────────────────────────
function ReplyThread({ answerId, user }) {
  const [replies, setReplies] = useState([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deletingReplyId, setDeletingReplyId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const replyRef = useRef(null);
  const editRef = useRef(null);
  const insertReply = makeInserter(() => replyText, setReplyText, replyRef);
  const insertEdit = makeInserter(() => editContent, setEditContent, editRef);

  async function load() {
    setIsLoadingReplies(true);
    try { const data = await answerService.getReplies(answerId); setReplies(data || []); } catch { setReplies([]); }
    finally { setIsLoadingReplies(false); }
  }

  function toggleReplies() {
    if (!showReplies && replies.length === 0) load();
    setShowReplies(v => !v);
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!replyText.trim()) { setPostError('Reply cannot be empty.'); return; }
    setPostError(null); setIsPosting(true);
    try {
      const r = await answerService.postReply(answerId, replyText.trim());
      setReplies(prev => [...prev, r]);
      setReplyText(''); setShowReplyForm(false); setShowReplies(true);
    } catch (err) { setPostError(err.message || 'Failed to post reply.'); }
    finally { setIsPosting(false); }
  }

  async function handleSaveEdit(e, replyId) {
    e.preventDefault();
    if (!editContent.trim()) { setEditError('Reply cannot be empty.'); return; }
    setEditError(null); setIsSaving(true);
    try {
      const updated = await answerService.updateReply(replyId, editContent.trim());
      setReplies(prev => prev.map(r => r.id === replyId ? { ...r, ...updated } : r));
      setEditingReplyId(null);
    } catch (err) { setEditError(err.message || 'Failed to update reply.'); }
    finally { setIsSaving(false); }
  }

  async function handleDelete(replyId) {
    setIsDeleting(true);
    try {
      await answerService.deleteReply(replyId);
      setReplies(prev => prev.filter(r => r.id !== replyId));
      setDeletingReplyId(null);
    } catch (err) { alert(err.message || 'Failed to delete reply.'); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className={styles.qd__replyThread}>
      {/* Thread toggle */}
      <div className={styles.qd__replyControls}>
        <button type='button' className={styles.qd__replyToggle} onClick={toggleReplies}>
          {isLoadingReplies ? <Loader2 size={13} className={styles.spin} /> : showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span>{showReplies ? 'Hide' : 'Show'} {replies.length > 0 ? `${replies.length} ` : ''}replies</span>
        </button>
        <button type='button' className={styles.qd__replyWriteBtn} onClick={() => { setShowReplyForm(v => !v); setShowReplies(true); if (replies.length === 0) load(); }}>
          <CornerDownRight size={13} />
          <span>Reply</span>
        </button>
      </div>

      {/* Replies list */}
      {showReplies && (
        <div className={styles.qd__repliesList}>
          {replies.map(reply => {
            const ra = reply.author || {};
            const rName = `${ra.firstName || ''} ${ra.lastName || ''}`.trim() || 'Anonymous';
            const isOwn = isAuthoredByUser(reply, user);
            const isEditThis = editingReplyId === reply.id;
            const isDelThis = deletingReplyId === reply.id;
            return (
              <div key={reply.id} className={styles.qd__replyCard}>
                <div className={styles.qd__replyHeader}>
                  <UserAvatar name={rName} size='sm' />
                  <span className={styles.qd__replyAuthor}>{rName}</span>
                  <span className={styles.qd__replyDate}>{formatDate(reply.createdAt)}</span>
                </div>

                {isDelThis ? (
                  <DeleteConfirm label='reply' onConfirm={() => handleDelete(reply.id)} onCancel={() => setDeletingReplyId(null)} isDeleting={isDeleting} />
                ) : isEditThis ? (
                  <form onSubmit={e => handleSaveEdit(e, reply.id)} className={styles.qd__replyEditForm}>
                    <div className={styles.qd__editorContainer}>
                      <MarkdownToolbar onInsert={insertEdit} charCount={editContent.length} />
                      <textarea ref={editRef} className={styles.qd__replyTextarea} value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} disabled={isSaving} />
                    </div>
                    {editError && <p className={styles.qd__error}>{editError}</p>}
                    <div className={styles.qd__replyEditActions}>
                      <button type='button' className={styles.qd__cancelEditBtn} onClick={() => setEditingReplyId(null)} disabled={isSaving}><X size={13} /> Cancel</button>
                      <button type='submit' className={styles.qd__saveBtn} disabled={isSaving}>{isSaving ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />} Save</button>
                    </div>
                  </form>
                ) : (
                  <p className={styles.qd__replyContent}>{reply.content}</p>
                )}

                {/* Edit/Delete at bottom of reply */}
                {isOwn && !isEditThis && !isDelThis && (
                  <div className={styles.qd__replyActions}>
                    <button type='button' className={styles.qd__editBtn} onClick={() => { setEditingReplyId(reply.id); setEditContent(reply.content); setEditError(null); setDeletingReplyId(null); }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button type='button' className={styles.qd__deleteBtn} onClick={() => { setDeletingReplyId(reply.id); setEditingReplyId(null); }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Post reply form */}
          {showReplyForm && (
            <form onSubmit={handlePost} className={styles.qd__replyForm}>
              <div className={styles.qd__editorContainer}>
                <MarkdownToolbar onInsert={insertReply} charCount={replyText.length} />
                <textarea ref={replyRef} className={styles.qd__replyTextarea} value={replyText} onChange={e => { setReplyText(e.target.value); if (postError) setPostError(null); }} placeholder='Write a reply…' rows={3} disabled={isPosting} />
              </div>
              {postError && <p className={styles.qd__error}>{postError}</p>}
              <div className={styles.qd__replyFormActions}>
                <button type='button' className={styles.qd__cancelEditBtn} onClick={() => { setShowReplyForm(false); setReplyText(''); setPostError(null); }} disabled={isPosting}><X size={13} /> Cancel</button>
                <button type='submit' className={styles.qd__saveBtn} disabled={isPosting}>
                  {isPosting ? <><Loader2 size={13} className={styles.spin} /> Posting…</> : <>Post reply</>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const answerTextareaRef = useRef(null);

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // New answer
  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  // AI fit check
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState(null);

  // AI generate answer
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Sidebar
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [similarAnswers, setSimilarAnswers] = useState([]);
  const [copied, setCopied] = useState(false);

  // Question edit
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editQError, setEditQError] = useState(null);
  const editQRef = useRef(null);

  // Question delete
  const [showDeleteQuestion, setShowDeleteQuestion] = useState(false);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

  // Answer edit / delete
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAContent, setEditAContent] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [editAError, setEditAError] = useState(null);
  const editARef = useRef(null);
  const [deletingAnswerId, setDeletingAnswerId] = useState(null);
  const [isDeletingAnswer, setIsDeletingAnswer] = useState(false);

  const insertAnswer  = makeInserter(() => answerText,  setAnswerText,  answerTextareaRef);
  const insertEditQ   = makeInserter(() => editQContent, setEditQContent, editQRef);
  const insertEditA   = makeInserter(() => editAContent, setEditAContent, editARef);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    async function load() {
      setIsLoading(true); setLoadError(null);
      try {
        const data = await questionService.getSingleQuestion(questionHash);
        if (!alive) return;
        setQuestion(data?.question || data);
        setAnswers(data?.answers || []);
        // Fire sidebar requests in parallel, non-blocking
        Promise.all([
          questionService.getSimilarQuestions(questionHash).catch(() => []),
          questionService.getSimilarAnswers(questionHash).catch(() => []),
        ]).then(([qs, as]) => {
          if (!alive) return;
          setSimilarQuestions(qs || []);
          setSimilarAnswers(as || []);
        });
      } catch (err) {
        if (alive) setLoadError(err.message || 'Failed to load question.');
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [questionHash]);

  const isOwnQuestion = isAuthoredByUser(question, user);

  // ── Share ───────────────────────────────────────────────────────────────────
  function handleShare() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ── Question edit ───────────────────────────────────────────────────────────
  function startEditQuestion() { setEditQTitle(question.title || ''); setEditQContent(question.content || ''); setEditQError(null); setIsEditingQuestion(true); setShowDeleteQuestion(false); }
  function cancelEditQuestion() { setIsEditingQuestion(false); setEditQError(null); }
  async function handleSaveQuestion(e) {
    e.preventDefault();
    if (editQTitle.trim().length < 5) { setEditQError('Title must be at least 5 characters.'); return; }
    if (editQContent.trim().length < 10) { setEditQError('Content must be at least 10 characters.'); return; }
    setEditQError(null); setIsSavingQuestion(true);
    try {
      const updated = await questionService.updateQuestion(questionHash, { title: editQTitle.trim(), content: editQContent.trim() });
      setQuestion(prev => ({ ...prev, ...updated })); setIsEditingQuestion(false);
    } catch (err) { setEditQError(err.message || 'Failed to update question.'); }
    finally { setIsSavingQuestion(false); }
  }

  // ── Question delete ─────────────────────────────────────────────────────────
  async function handleDeleteQuestion() {
    setIsDeletingQuestion(true);
    try { await questionService.deleteQuestion(questionHash); navigate('/dashboard', { replace: true }); }
    catch (err) { setIsDeletingQuestion(false); setShowDeleteQuestion(false); alert(err.message || 'Failed to delete.'); }
  }

  // ── Answer edit / delete ────────────────────────────────────────────────────
  function startEditAnswer(a) { setEditingAnswerId(a.id); setEditAContent(a.content || ''); setEditAError(null); setDeletingAnswerId(null); }
  function cancelEditAnswer() { setEditingAnswerId(null); setEditAError(null); }
  async function handleSaveAnswer(e, answerId) {
    e.preventDefault();
    if (editAContent.trim().length < ANSWER_MIN) { setEditAError(`At least ${ANSWER_MIN} characters required.`); return; }
    setEditAError(null); setIsSavingAnswer(true);
    try {
      const updated = await answerService.updateAnswer(answerId, editAContent.trim());
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, ...updated } : a));
      setEditingAnswerId(null);
    } catch (err) { setEditAError(err.message || 'Failed to update answer.'); }
    finally { setIsSavingAnswer(false); }
  }
  async function handleDeleteAnswer(answerId) {
    setIsDeletingAnswer(true);
    try { await answerService.deleteAnswer(answerId); setAnswers(prev => prev.filter(a => a.id !== answerId)); setDeletingAnswerId(null); }
    catch (err) { alert(err.message || 'Failed to delete answer.'); }
    finally { setIsDeletingAnswer(false); }
  }

  // ── AI fit ──────────────────────────────────────────────────────────────────
  async function handleCheckFit() {
    if (answerText.trim().length < ANSWER_MIN) { setFitError(`At least ${ANSWER_MIN} characters needed.`); return; }
    setFitError(null); setIsCheckingFit(true);
    try { const r = await questionService.assessAnswerFit(questionHash, answerText); setFitResult(r); }
    catch (err) { setFitError(err.message || 'Failed to check fit.'); }
    finally { setIsCheckingFit(false); }
  }

  // ── AI generate answer ──────────────────────────────────────────────────────
  async function handleGenerateAnswer() {
    setGenerateError(null);
    setIsGeneratingAnswer(true);
    try {
      const result = await questionService.generatePerfectAnswer(questionHash);
      if (result?.answer) {
        setAnswerText(result.answer);
        setFitResult(null);
        // Scroll the textarea into view after a tick
        setTimeout(() => answerTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate answer.');
    } finally {
      setIsGeneratingAnswer(false);
    }
  }

  // ── Post answer ─────────────────────────────────────────────────────────────
  async function handlePostAnswer(e) {
    e.preventDefault();
    if (answerText.trim().length < ANSWER_MIN) { setPostError(`At least ${ANSWER_MIN} characters required.`); return; }
    setPostError(null); setIsPosting(true);
    try {
      const newAnswer = await answerService.postAnswer(question.id, answerText.trim());
      setAnswers(prev => [...prev, newAnswer]); setAnswerText(''); setFitResult(null);
    } catch (err) { setPostError(err.message || 'Failed to post answer.'); }
    finally { setIsPosting(false); }
  }

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) return (
    <div className={styles.qd__centerState}><Loader2 size={32} className={styles.spin} /><p className={styles.qd__loadingText}>Loading…</p></div>
  );
  if (loadError || !question) return (
    <div className={styles.qd__centerState}>
      <h2 className={styles.qd__errorHeading}>{loadError || 'Failed to load question.'}</h2>
      <button type='button' className={styles.qd__returnBtn} onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
    </div>
  );

  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Anonymous';

  return (
    <div className={styles.qd}>
      <button type='button' className={styles.qd__backNav} onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} /><span>Back to feed</span>
      </button>

      <div className={styles.qd__layout}>
        {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
        <div className={styles.qd__main}>

          {/* Question card */}
          <article className={styles.qd__questionCard}>
            <div className={styles.qd__authorHeader}>
              <UserAvatar name={authorName} size='lg' />
              <div className={styles.qd__authorInfo}>
                <span className={styles.qd__authorName}>{authorName}</span>
                <span className={styles.qd__postedDate}>{formatDate(question.createdAt) ? `Posted ${formatDate(question.createdAt)}` : ''}</span>
              </div>
            </div>

            {/* Delete confirm */}
            {showDeleteQuestion && (
              <DeleteConfirm label='question' onConfirm={handleDeleteQuestion} onCancel={() => setShowDeleteQuestion(false)} isDeleting={isDeletingQuestion} />
            )}

            {/* Edit form OR read view */}
            {isEditingQuestion ? (
              <form className={styles.qd__editForm} onSubmit={handleSaveQuestion}>
                <label className={styles.qd__editLabel} htmlFor='editQTitle'>Title</label>
                <input id='editQTitle' type='text' className={styles.qd__editInput} value={editQTitle} onChange={e => setEditQTitle(e.target.value)} disabled={isSavingQuestion} maxLength={255} />
                <label className={styles.qd__editLabel} htmlFor='editQContent'>Content</label>
                <div className={styles.qd__editorContainer}>
                  <MarkdownToolbar onInsert={insertEditQ} charCount={editQContent.length} />
                  <textarea id='editQContent' ref={editQRef} className={styles.qd__answerTextarea} value={editQContent} onChange={e => setEditQContent(e.target.value)} rows={8} disabled={isSavingQuestion} />
                </div>
                {editQError && <p className={styles.qd__error}>{editQError}</p>}
                <div className={styles.qd__editActions}>
                  <button type='button' className={styles.qd__cancelEditBtn} onClick={cancelEditQuestion} disabled={isSavingQuestion}><X size={14} /> Cancel</button>
                  <button type='submit' className={styles.qd__saveBtn} disabled={isSavingQuestion}>
                    {isSavingQuestion ? <><Loader2 size={14} className={styles.spin} /> Saving…</> : <><Check size={14} /> Save changes</>}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className={styles.qd__title}>{question.title}</h1>
                <div className={styles.qd__body}><FormattedMarkdown content={question.content || ''} /></div>
              </>
            )}

            {/* Bottom bar — share + answer count + OWNER ACTIONS */}
            {!isEditingQuestion && (
              <div className={styles.qd__bottomBar}>
                <button type='button' className={styles.qd__badgeBtn} onClick={handleShare} title='Copy link'>
                  {copied ? <><Check size={14} /><span>Copied!</span></> : <><Share2 size={14} /><span>Share</span></>}
                </button>
                <div className={styles.qd__badgePill}>
                  <MessageSquare size={14} /><span>{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</span>
                </div>
                {/* ── Edit / Delete at bottom ── */}
                {isOwnQuestion && (
                  <div className={styles.qd__ownerActions}>
                    <button type='button' className={styles.qd__editBtn} onClick={startEditQuestion}><Pencil size={13} /> Edit</button>
                    <button type='button' className={styles.qd__deleteBtn} onClick={() => { setShowDeleteQuestion(true); setIsEditingQuestion(false); }}><Trash2 size={13} /> Delete</button>
                  </div>
                )}
              </div>
            )}
          </article>

          {/* Answers section */}
          <section className={styles.qd__answersSection}>
            <h2 className={styles.qd__answersHeading}>Community Answers ({answers.length})</h2>

            {answers.length === 0 ? (
              <div className={styles.qd__emptyAnswers}>
                <MessageSquare size={30} className={styles.qd__emptyIcon} />
                <h3 className={styles.qd__emptyTitle}>No answers yet.</h3>
                <p className={styles.qd__emptySubtext}>The community will help you shortly.</p>
              </div>
            ) : (
              <ul className={styles.qd__answerList}>
                {answers.map(answer => {
                  const aa = answer.author || {};
                  const aName = `${aa.firstName || ''} ${aa.lastName || ''}`.trim() || 'Anonymous';
                  const isOwn = isAuthoredByUser(answer, user);
                  const isEditThis = editingAnswerId === answer.id;
                  const isDelThis = deletingAnswerId === answer.id;
                  return (
                    <li key={answer.id} className={styles.qd__answerCard}>
                      {/* Author header */}
                      <div className={styles.qd__answerHeader}>
                        <UserAvatar name={aName} size='md' />
                        <div className={styles.qd__answerMeta}>
                          <span className={styles.qd__answerAuthor}>{aName}</span>
                          <span className={styles.qd__answerDate}>{formatDate(answer.createdAt)}</span>
                        </div>
                      </div>

                      {/* Delete confirm */}
                      {isDelThis && (
                        <DeleteConfirm label='answer' onConfirm={() => handleDeleteAnswer(answer.id)} onCancel={() => setDeletingAnswerId(null)} isDeleting={isDeletingAnswer} />
                      )}

                      {/* Edit form OR body */}
                      {isEditThis ? (
                        <form className={styles.qd__editForm} onSubmit={e => handleSaveAnswer(e, answer.id)}>
                          <div className={styles.qd__editorContainer}>
                            <MarkdownToolbar onInsert={insertEditA} charCount={editAContent.length} />
                            <textarea ref={editARef} className={styles.qd__answerTextarea} value={editAContent} onChange={e => setEditAContent(e.target.value)} rows={6} disabled={isSavingAnswer} />
                          </div>
                          {editAError && <p className={styles.qd__error}>{editAError}</p>}
                          <div className={styles.qd__editActions}>
                            <button type='button' className={styles.qd__cancelEditBtn} onClick={cancelEditAnswer} disabled={isSavingAnswer}><X size={14} /> Cancel</button>
                            <button type='submit' className={styles.qd__saveBtn} disabled={isSavingAnswer}>
                              {isSavingAnswer ? <><Loader2 size={14} className={styles.spin} /> Saving…</> : <><Check size={14} /> Save</>}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.qd__answerBody}><FormattedMarkdown content={answer.content || ''} /></div>
                      )}

                      {/* ── Reply thread ── */}
                      {!isEditThis && (
                        <ReplyThread answerId={answer.id} user={user} />
                      )}

                      {/* ── Edit/Delete at BOTTOM of answer card ── */}
                      {isOwn && !isEditThis && !isDelThis && (
                        <div className={styles.qd__answerBottomActions}>
                          <button type='button' className={styles.qd__editBtn} onClick={() => startEditAnswer(answer)}><Pencil size={13} /> Edit</button>
                          <button type='button' className={styles.qd__deleteBtn} onClick={() => { setDeletingAnswerId(answer.id); setEditingAnswerId(null); }}><Trash2 size={13} /> Delete</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Post answer / own-question notice */}
            {isOwnQuestion ? (
              <div className={styles.qd__ownNotice}><p>You cannot answer your own question.</p></div>
            ) : (
              <form className={styles.qd__answerForm} onSubmit={handlePostAnswer}>
                <h2 className={styles.qd__answerFormHeading}>Contribute an answer</h2>

                {/* AI Generate Answer button */}
                <div className={styles.qd__aiGenerateRow}>
                  <button
                    type='button'
                    className={styles.qd__generateBtn}
                    onClick={handleGenerateAnswer}
                    disabled={isGeneratingAnswer || isPosting || isCheckingFit}
                    title='Ask AI to write a complete answer you can review and edit'
                  >
                    {isGeneratingAnswer
                      ? <><Loader2 size={15} className={styles.spin} /><span>Generating…</span></>
                      : <><Wand2 size={15} /><span>Generate AI Answer</span></>}
                  </button>
                  <span className={styles.qd__aiGenerateHint}>
                    AI drafts a full answer — you review, edit, then post.
                  </span>
                </div>

                {generateError && (
                  <p className={styles.qd__error} role='alert'>{generateError}</p>
                )}

                {/* Show a notice when AI-generated content is loaded */}
                {answerText && isGeneratingAnswer === false && answerText.length > 100 && (
                  <div className={styles.qd__aiGeneratedNotice} role='status'>
                    <Sparkles size={13} className={styles.qd__sparkleIcon} />
                    <span>AI-generated draft loaded — review and edit before posting.</span>
                  </div>
                )}
                <div className={styles.qd__editorContainer}>
                  <MarkdownToolbar onInsert={insertAnswer} charCount={answerText.length} />
                  <textarea ref={answerTextareaRef} id='answer' value={answerText} onChange={e => { setAnswerText(e.target.value); if (postError) setPostError(null); if (fitError) setFitError(null); }} placeholder='Share what worked for you…' className={styles.qd__answerTextarea} rows={8} disabled={isPosting} />
                </div>
                {postError && <p className={styles.qd__error}>{postError}</p>}
                {fitError  && <p className={styles.qd__error}>{fitError}</p>}
                <div className={styles.qd__aiFitRow}>
                  <button type='button' className={styles.qd__fitButton} onClick={handleCheckFit} disabled={isCheckingFit || isPosting}>
                    {isCheckingFit ? <Loader2 size={14} className={styles.spin} /> : <Sparkles size={14} className={styles.qd__sparkleIcon} />}
                    <span>{isCheckingFit ? 'Checking…' : 'Check draft fit'}</span>
                  </button>
                  <span className={styles.qd__fitSubtitle}>Relevance only — needs 20+ characters.</span>
                </div>
                {fitResult && (
                  <div className={`${styles.qd__fitPanel} ${styles[`qd__fitPanel--${fitResult.level?.toLowerCase()}`] || ''}`}>
                    <span className={`${styles.qd__fitBadge} ${styles[`qd__fitBadge--${fitResult.level?.toLowerCase()}`] || ''}`}>
                      {FIT_LABELS[fitResult.level?.toLowerCase()] || fitResult.level?.toUpperCase() || 'FIT'}
                    </span>
                    {fitResult.note && <p className={styles.qd__fitNote}>{fitResult.note}</p>}
                  </div>
                )}
                <div className={styles.qd__submitRow}>
                  <button type='submit' className={styles.qd__submitButton} disabled={isPosting || isCheckingFit}>
                    {isPosting ? <><Loader2 size={15} className={styles.spin} /><span>Posting…</span></> : <span>Post Your Answer</span>}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN — AI sidebar ─────────────────────────────────── */}
        <aside className={styles.qd__sidebar} aria-label='AI suggestions'>

          {/* Related Questions */}
          <section className={styles.qd__sidebarSection}>
            <h2 className={styles.qd__sidebarHeading}>
              <Sparkles size={15} className={styles.qd__sparkleIcon} /> Related Questions
            </h2>
            {similarQuestions.length === 0 ? (
              <p className={styles.qd__noSuggestions}>No related questions found yet.</p>
            ) : (
              <div className={styles.qd__similarList}>
                {similarQuestions.map(item => {
                  const ia = item.author || {};
                  const iName = `${ia.firstName || ''} ${ia.lastName || ''}`.trim() || 'Student';
                  return (
                    <article key={item.id || item.questionHash} className={styles.qd__similarCard}
                      onClick={() => navigate(`/questions/${item.questionHash}`)} role='button' tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/questions/${item.questionHash}`); }}>
                      <h3 className={styles.qd__similarTitle}>{item.title}</h3>
                      <div className={styles.qd__similarMeta}>
                        <span>{iName}</span><span>{formatDate(item.createdAt)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Related Answers */}
          <section className={styles.qd__sidebarSection}>
            <h2 className={styles.qd__sidebarHeading}>
              <MessageSquare size={15} /> Related Answers
            </h2>
            {similarAnswers.length === 0 ? (
              <p className={styles.qd__noSuggestions}>No related answers found yet.</p>
            ) : (
              <div className={styles.qd__similarList}>
                {similarAnswers.map(item => {
                  const ia = item.author || {};
                  const iName = `${ia.firstName || ''} ${ia.lastName || ''}`.trim() || 'Student';
                  return (
                    <article key={item.id} className={styles.qd__relatedAnswerCard}
                      onClick={() => navigate(`/questions/${item.questionHash}`)} role='button' tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/questions/${item.questionHash}`); }}>
                      <p className={styles.qd__relatedAnswerQuestion}>{item.questionTitle}</p>
                      <p className={styles.qd__relatedAnswerPreview}>{item.preview}</p>
                      <div className={styles.qd__similarMeta}>
                        <span>{iName}</span><span>{formatDate(item.createdAt)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
