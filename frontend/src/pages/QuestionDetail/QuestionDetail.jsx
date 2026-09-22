/**
 * Question Detail: full question thread with answers, a post-answer form,
 * an "AI Answer Fit" check before submitting a reply, and a Related Questions sidebar.
 * Data: `questionService.getSingleQuestion`, `questionService.getSimilarQuestions`,
 *       `questionService.assessAnswerFit`, `answerService.postAnswer`.
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { questionService } from '../../services/question/question.service.js';
import { answerService } from '../../services/answer/answer.service.js';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthoredByUser } from '../../lib/utils';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import styles from './QuestionDetail.module.css';

const ANSWER_MIN = 20;

const FIT_LABELS = {
  strong: 'Strong fit',
  partial: 'Partial fit',
  weak: 'Weak fit',
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function CodeBlock({ children }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const raw = preRef.current?.textContent ?? '';
    if (!raw) return;
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeChild = Array.isArray(children) ? children[0] : children;
  const cls = codeChild?.props?.className;
  const langMatch = typeof cls === 'string' ? cls.match(/language-([\w+#.-]+)/) : null;
  const langLabel = langMatch ? langMatch[1] : '';

  return (
    <div className={styles.codeWrap}>
      <div className={styles.codeToolbar}>
        <span className={styles.codeLang}>{langLabel || 'code'}</span>
        <button
          type='button'
          className={styles.codeCopyBtn}
          onClick={handleCopy}
          aria-label='Copy code'
        >
          {copied ? (
            <>
              <Check size={13} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre ref={preRef} className={styles.pre}>
        {children}
      </pre>
    </div>
  );
}

function FormattedMarkdown({ content }) {
  if (!content) return null;

  return (
    <div className={styles.markdownRoot}>
      <ReactMarkdown
        components={{
          p: ({ node: _n, ...props }) => <p className={styles.markdownP} {...props} />,
          ul: ({ node: _n, ...props }) => <ul className={styles.markdownUl} {...props} />,
          ol: ({ node: _n, ...props }) => <ol className={styles.markdownOl} {...props} />,
          li: ({ node: _n, ...props }) => <li className={styles.markdownLi} {...props} />,
          h1: ({ node: _n, ...props }) => <h3 className={styles.markdownH1} {...props} />,
          h2: ({ node: _n, ...props }) => <h3 className={styles.markdownH2} {...props} />,
          h3: ({ node: _n, ...props }) => <h4 className={styles.markdownH3} {...props} />,
          blockquote: ({ node: _n, ...props }) => (
            <blockquote className={styles.markdownBlockquote} {...props} />
          ),
          a: ({ node: _n, ...props }) => (
            <a
              className={styles.markdownA}
              target='_blank'
              rel='noreferrer noopener'
              {...props}
            />
          ),
          hr: ({ node: _n, ...props }) => <hr className={styles.markdownHr} {...props} />,
          pre: ({ node: _n, children: preChildren }) => (
            <CodeBlock>{preChildren}</CodeBlock>
          ),
          code: ({ node: _n, className: codeCls, children, ...props }) => {
            const isBlock = Boolean(codeCls?.trim());
            if (isBlock) {
              return (
                <code className={codeCls} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={styles.markdownInlineCode} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState(null);
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [copied, setCopied] = useState(false);

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
        } catch {
          if (isMounted) setSimilarQuestions([]);
        }
      } catch (err) {
        if (isMounted) setLoadError(err.message || 'Failed to load question details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchQuestion();
    return () => {
      isMounted = false;
    };
  }, [questionHash]);

  const isOwnQuestion = isAuthoredByUser(question, user);

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCheckFit() {
    if (answerText.trim().length < ANSWER_MIN) {
      setFitError(`Answer must be at least ${ANSWER_MIN} characters.`);
      return;
    }
    setFitError(null);
    setIsCheckingFit(true);
    try {
      const result = await questionService.assessAnswerFit(
        questionHash,
        answerText,
      );
      setFitResult(result);
    } catch (err) {
      setFitError(err.message || 'Failed to check answer fit.');
    } finally {
      setIsCheckingFit(false);
    }
  }

  async function handlePostAnswer(e) {
    e.preventDefault();
    if (answerText.trim().length < ANSWER_MIN) {
      setPostError(`Answer must be at least ${ANSWER_MIN} characters.`);
      return;
    }
    setPostError(null);
    setIsPosting(true);
    try {
      const newAnswer = await answerService.postAnswer(
        question.id,
        answerText.trim(),
      );
      setAnswers(prev => [...prev, newAnswer]);
      setAnswerText('');
      setFitResult(null);
    } catch (err) {
      setPostError(err.message || 'Failed to post answer.');
    } finally {
      setIsPosting(false);
    }
  }

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
        <h2 className={styles.questionDetail__errorHeading}>
          {loadError || 'Failed to load question details.'}
        </h2>
        <button
          type='button'
          className={styles.questionDetail__returnBtn}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Anonymous';
  const authorInitials = getInitials(authorName);
  const postedDate = formatDate(question.createdAt);

  return (
    <div className={styles.questionDetail}>
      {/* Top Back Navigation */}
      <button
        type='button'
        className={styles.questionDetail__backNav}
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft size={16} />
        <span>Back to feed</span>
      </button>

      {/* Main 2-Column Content Layout */}
      <div className={styles.questionDetail__layout}>
        {/* Left Column: Question Details & Answers */}
        <div className={styles.questionDetail__mainColumn}>
          {/* Main Question Card */}
          <article className={styles.questionDetail__questionCard}>
            {/* Author Header */}
            <div className={styles.questionDetail__authorHeader}>
              <UserAvatar name={authorName} size='lg' />
              <div className={styles.questionDetail__authorInfo}>
                <span className={styles.questionDetail__authorName}>{authorName}</span>
                <span className={styles.questionDetail__postedDate}>
                  {postedDate ? `Posted ${postedDate}` : ''}
                </span>
              </div>
            </div>

            {/* Question Title */}
            <h1 className={styles.questionDetail__title}>{question.title}</h1>

            {/* Question Content (Markdown) */}
            <div className={styles.questionDetail__body}>
              <FormattedMarkdown content={question.content || ''} />
            </div>

            {/* Bottom Actions Row */}
            <div className={styles.questionDetail__bottomBar}>
              <button
                type='button'
                className={styles.questionDetail__badgeBtn}
                onClick={handleShare}
                title='Copy link to question'
              >
                {copied ? (
                  <>
                    <Check size={14} className={styles.questionDetail__checkIcon} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    <span>Share</span>
                  </>
                )}
              </button>

              <div className={styles.questionDetail__badgePill}>
                <MessageSquare size={14} />
                <span>
                  {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                </span>
              </div>
            </div>
          </article>

          {/* Community Answers Section */}
          <section className={styles.questionDetail__answersSection}>
            <h2 className={styles.questionDetail__answersHeading}>
              Community Answers ({answers.length})
            </h2>

            {/* Answers List or Empty State */}
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
                  const answerAuthorName = `${answerAuthor.firstName || ''} ${
                    answerAuthor.lastName || ''
                  }`.trim() || 'Anonymous';
                  const answerInitials = getInitials(answerAuthorName);
                  const answerDate = formatDate(answer.createdAt);

                  return (
                    <li key={answer.id} className={styles.questionDetail__answerCard}>
                      <div className={styles.questionDetail__answerHeader}>
                        <UserAvatar name={answerAuthorName} size='md' />
                        <div className={styles.questionDetail__answerAuthorMeta}>
                          <span className={styles.questionDetail__answerAuthorName}>
                            {answerAuthorName}
                          </span>
                          <span className={styles.questionDetail__answerDate}>
                            {answerDate}
                          </span>
                        </div>
                      </div>
                      <div className={styles.questionDetail__answerBody}>
                        <FormattedMarkdown content={answer.content || ''} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Post Answer Form or Own Question Notice */}
            {isOwnQuestion ? (
              <div className={styles.questionDetail__ownNotice}>
                <p>You cannot answer your own question.</p>
              </div>
            ) : (
              <form
                className={styles.questionDetail__answerForm}
                onSubmit={handlePostAnswer}
              >
                <label
                  htmlFor='answer'
                  className={styles.questionDetail__answerLabel}
                >
                  Your answer
                </label>
                <textarea
                  id='answer'
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder='Share what worked for you, with enough detail to reproduce it...'
                  className={styles.questionDetail__answerTextarea}
                  rows={6}
                  disabled={isPosting}
                />

                {postError && (
                  <p className={styles.questionDetail__error} role='alert'>
                    {postError}
                  </p>
                )}
                {fitError && (
                  <p className={styles.questionDetail__error} role='alert'>
                    {fitError}
                  </p>
                )}

                <div className={styles.questionDetail__answerActions}>
                  <button
                    type='button'
                    className={styles.questionDetail__fitButton}
                    onClick={handleCheckFit}
                    disabled={isCheckingFit || isPosting}
                  >
                    {isCheckingFit ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    <span>{isCheckingFit ? 'Checking...' : 'Check answer fit'}</span>
                  </button>

                  <button
                    type='submit'
                    className={styles.questionDetail__submitButton}
                    disabled={isPosting || isCheckingFit}
                  >
                    {isPosting ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>{isPosting ? 'Posting...' : 'Post answer'}</span>
                  </button>
                </div>

                {fitResult && (
                  <div
                    className={`${styles.questionDetail__fitPanel} ${
                      styles[`questionDetail__fitPanel--${fitResult.level}`] || ''
                    }`}
                  >
                    <p className={styles.questionDetail__fitLevel}>
                      {FIT_LABELS[fitResult.level] || fitResult.level}
                    </p>
                    {fitResult.note && (
                      <p className={styles.questionDetail__fitNote}>
                        {fitResult.note}
                      </p>
                    )}
                  </div>
                )}
              </form>
            )}
          </section>
        </div>

        {/* Right Column: Related Questions Sidebar */}
        <aside className={styles.questionDetail__sidebar} aria-label='Related questions'>
          <h2 className={styles.questionDetail__sidebarHeading}>Related Questions</h2>
          {similarQuestions.length === 0 ? (
            <div className={styles.questionDetail__noSimilar}>
              <p>No related questions found.</p>
            </div>
          ) : (
            <div className={styles.questionDetail__similarList}>
              {similarQuestions.map(item => {
                const itemAuthor = item.author || {};
                const itemAuthorName =
                  `${itemAuthor.firstName || ''} ${itemAuthor.lastName || ''}`.trim() ||
                  item.authorName ||
                  'Student';
                const itemDate = formatDate(item.createdAt);

                return (
                  <article
                    key={item.id || item.questionHash}
                    className={styles.questionDetail__similarCard}
                    onClick={() => navigate(`/questions/${item.questionHash}`)}
                    role='button'
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/questions/${item.questionHash}`);
                      }
                    }}
                  >
                    <h3 className={styles.questionDetail__similarTitle}>
                      {item.title}
                    </h3>
                    <div className={styles.questionDetail__similarMeta}>
                      <span className={styles.questionDetail__similarAuthor}>
                        {itemAuthorName}
                      </span>
                      <span className={styles.questionDetail__similarDate}>
                        {itemDate}
                      </span>
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
