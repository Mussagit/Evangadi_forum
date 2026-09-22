/**
 * Post Question: form to ask a new question, with an integrated AI Draft
 * Coach that gives real-time feedback before submission, and a dedicated
 * Success State upon posting.
 * Data: `questionService.generateQuestionDraftCoach`, `questionService.createQuestion`.
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Send, Code, Link2, Check } from 'lucide-react';
import { questionService } from '../../services/question/question.service.js';
import styles from './PostQuestion.module.css';

const TITLE_MIN = 5;
const TITLE_MAX = 255;
const CONTENT_MIN = 10;

export default function PostQuestion() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdQuestionHash, setCreatedQuestionHash] = useState(null);

  function handleChange(field) {
    return e => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      if (error) setError(null);
    };
  }

  function insertFormatting(type) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const selection = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    const beforeChar = start > 0 ? text[start - 1] : '';
    const afterChar = end < text.length ? text[end] : '';

    switch (type) {
      case 'bold': {
        const leadingSpace = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
        const trailingSpace = afterChar && !/\s/.test(afterChar) ? ' ' : '';
        const inner = selection || 'bold text';
        replacement = `${leadingSpace}**${inner}**${trailingSpace}`;
        cursorOffset = leadingSpace.length + 2 + (selection ? selection.length : 0);
        break;
      }
      case 'italic': {
        const leadingSpace = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
        const trailingSpace = afterChar && !/\s/.test(afterChar) ? ' ' : '';
        const inner = selection || 'italic text';
        replacement = `${leadingSpace}*${inner}*${trailingSpace}`;
        cursorOffset = leadingSpace.length + 1 + (selection ? selection.length : 0);
        break;
      }
      case 'code': {
        if (selection.includes('\n') || !selection) {
          const prefixNewline = start > 0 && beforeChar !== '\n' ? '\n\n' : (start > 0 && text[start - 2] !== '\n' && beforeChar === '\n' ? '\n' : '');
          const suffixNewline = afterChar && afterChar !== '\n' ? '\n\n' : '\n';
          const inner = selection || '// code here';
          replacement = `${prefixNewline}\`\`\`javascript\n${inner}\n\`\`\`${suffixNewline}`;
          cursorOffset = prefixNewline.length + 14 + (selection ? selection.length : 0);
        } else {
          replacement = `\`${selection}\``;
          cursorOffset = replacement.length;
        }
        break;
      }
      case 'link': {
        const leadingSpace = beforeChar && !/\s/.test(beforeChar) ? ' ' : '';
        const inner = selection || 'link text';
        replacement = `${leadingSpace}[${inner}](https://example.com)`;
        cursorOffset = leadingSpace.length + 1 + inner.length + 2;
        break;
      }
      default:
        return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setFormData(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  }

  function validate() {
    const titleTrimmed = formData.title.trim();
    const contentTrimmed = formData.content.trim();

    if (titleTrimmed.length < TITLE_MIN) {
      return `Title must be at least ${TITLE_MIN} characters.`;
    }
    if (titleTrimmed.length > TITLE_MAX) {
      return `Title must be at most ${TITLE_MAX} characters.`;
    }
    if (contentTrimmed.length < CONTENT_MIN) {
      return `Body length must contain a minimum of ${CONTENT_MIN} characters detailing your problem.`;
    }
    return null;
  }

  async function handleGetFeedback() {
    if (formData.content.trim().length === 0 && formData.title.trim().length === 0) {
      setError('Please provide a title or question details before requesting AI feedback.');
      return;
    }

    setError(null);
    setIsCoaching(true);
    try {
      const feedback = await questionService.generateQuestionDraftCoach(formData);
      setCoachFeedback(feedback);
    } catch (err) {
      setError(err.message || 'Failed to get AI feedback.');
    } finally {
      setIsCoaching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const question = await questionService.createQuestion(formData);
      const hash = question?.questionHash || question?.hash;
      setCreatedQuestionHash(hash);
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to post question.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAskAnother() {
    setFormData({ title: '', content: '' });
    setCoachFeedback(null);
    setError(null);
    setCreatedQuestionHash(null);
    setIsSuccess(false);
  }

  function renderTip(tip) {
    const colonIndex = tip.indexOf(':');
    if (colonIndex > 0 && colonIndex < 45) {
      const prefix = tip.substring(0, colonIndex);
      const rest = tip.substring(colonIndex + 1);
      return (
        <>
          <strong>{prefix}</strong>:{rest}
        </>
      );
    }
    return tip;
  }

  const tips = coachFeedback?.tips || [];

  return (
    <div className={styles.postQuestion}>
      {/* Page Header */}
      <header className={styles.postQuestion__header}>
        <p className={styles.postQuestion__eyebrow}>ASK THE COHORT</p>
        <h1 className={styles.postQuestion__title}>Publish to the forum</h1>
        <p className={styles.postQuestion__description}>
          Public threads help the whole cohort. Write as if a classmate will debug your issue tomorrow. They only know what you put on the page.
        </p>
      </header>

      {/* Success State View */}
      {isSuccess ? (
        <section className={styles.postQuestion__successCard} aria-label='Question posted success'>
          <div className={styles.postQuestion__successIconWrapper}>
            <Check size={28} strokeWidth={2.5} className={styles.postQuestion__successIcon} />
          </div>
          <h2 className={styles.postQuestion__successTitle}>Thread published</h2>
          <p className={styles.postQuestion__successDescription}>
            Your post is indexed for keyword search and embedding-based similarity. Share the link in study groups, or stay on the thread to answer follow-up questions from peers.
          </p>
          <div className={styles.postQuestion__successActions}>
            <button
              type='button'
              className={styles.postQuestion__backDashboardBtn}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              type='button'
              className={styles.postQuestion__viewQuestionBtn}
              onClick={() => {
                if (createdQuestionHash) {
                  navigate(`/questions/${createdQuestionHash}`);
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              View Question
            </button>
            <button
              type='button'
              className={styles.postQuestion__askAnotherBtn}
              onClick={handleAskAnother}
            >
              Ask Another
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Checklist / Instructions Card */}
          <section className={styles.postQuestion__checklistCard} aria-label='Posting guidelines'>
            <h2 className={styles.postQuestion__checklistTitle}>
              Write questions people can answer in one pass
            </h2>
            <p className={styles.postQuestion__checklistIntro}>
              Mentors volunteer their time. Give them runnable context, expected vs actual behavior, and a tight scope so they can reproduce the issue without guessing your setup.
            </p>

            <div className={styles.postQuestion__checklistSection}>
              <h3 className={styles.postQuestion__sectionHeading}>Checklist before you post</h3>
              <ul className={styles.postQuestion__list}>
                <li className={styles.postQuestion__listItem}>
                  <strong>Title as a headline</strong> that states the symptom and tech stack (e.g., “React 19: state resets after navigation”).
                </li>
                <li className={styles.postQuestion__listItem}>
                  <strong>Repro steps</strong> numbered, with environment (OS, browser, Node version) when it matters.
                </li>
                <li className={styles.postQuestion__listItem}>
                  <strong>Minimal code</strong> in fenced markdown blocks; trim unrelated lines so readers scan faster.
                </li>
                <li className={styles.postQuestion__listItem}>
                  <strong>Exact errors</strong> copied verbatim, including stack trace snippets when debugging backend routes.
                </li>
              </ul>
            </div>

            <div className={styles.postQuestion__checklistSection}>
              <h3 className={styles.postQuestion__sectionHeading}>Validation rules (enforced by the form)</h3>
              <ul className={styles.postQuestion__list}>
                <li className={styles.postQuestion__listItem}>
                  <strong>Title length</strong>: Must be between 5 and 255 characters.
                </li>
                <li className={styles.postQuestion__listItem}>
                  <strong>Body length</strong>: Must contain a minimum of 10 characters detailing your problem.
                </li>
                <li className={styles.postQuestion__listItem}>
                  <strong>Single topic</strong>: Split unrelated bugs into separate threads so search and embeddings stay precise.
                </li>
              </ul>
            </div>
          </section>

          {/* Main Question Form Card */}
          <section className={styles.postQuestion__formCard}>
            <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
              <div className={styles.postQuestion__field}>
                <label htmlFor='title' className={styles.postQuestion__label}>
                  Title
                </label>
                <p className={styles.postQuestion__helper}>
                  Be specific and imagine you&apos;re asking a question to another person.
                </p>
                <input
                  id='title'
                  type='text'
                  value={formData.title}
                  onChange={handleChange('title')}
                  placeholder='e.g. How do I handle state management using Context API in React?'
                  className={styles.postQuestion__input}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.postQuestion__field}>
                <label htmlFor='content' className={styles.postQuestion__label}>
                  What are the details of your problem?
                </label>
                <p className={styles.postQuestion__helper}>
                  Introduce the problem and expand on what you put in the title. Minimum 10 characters.
                </p>

                <div className={styles.postQuestion__editorContainer}>
                  <div className={styles.postQuestion__toolbar}>
                    <div className={styles.postQuestion__toolButtons}>
                      <button
                        type='button'
                        className={styles.postQuestion__toolBtn}
                        onClick={() => insertFormatting('bold')}
                        title='Bold'
                        aria-label='Bold'
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type='button'
                        className={styles.postQuestion__toolBtn}
                        onClick={() => insertFormatting('italic')}
                        title='Italic'
                        aria-label='Italic'
                      >
                        <em>I</em>
                      </button>
                      <button
                        type='button'
                        className={styles.postQuestion__toolBtn}
                        onClick={() => insertFormatting('code')}
                        title='Code block'
                        aria-label='Code block'
                      >
                        <Code size={15} />
                      </button>
                      <button
                        type='button'
                        className={styles.postQuestion__toolBtn}
                        onClick={() => insertFormatting('link')}
                        title='Link'
                        aria-label='Link'
                      >
                        <Link2 size={15} />
                      </button>
                    </div>
                    <span className={styles.postQuestion__charCount}>
                      {formData.content.length} characters
                    </span>
                  </div>

                  <textarea
                    ref={textareaRef}
                    id='content'
                    value={formData.content}
                    onChange={handleChange('content')}
                    placeholder='Include all the information someone would need to answer your question... You can use Markdown to format your code!'
                    className={styles.postQuestion__textarea}
                    rows={10}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <p className={styles.postQuestion__error} role='alert'>
                  {error}
                </p>
              )}

              {/* AI Suggestions Trigger & Helper Text */}
              <div className={styles.postQuestion__aiRow}>
                <button
                  type='button'
                  className={styles.postQuestion__aiPillBtn}
                  onClick={handleGetFeedback}
                  disabled={isCoaching || isSubmitting}
                >
                  {isCoaching ? (
                    <Loader2 size={14} className={styles.spin} />
                  ) : (
                    <Sparkles size={14} className={styles.postQuestion__aiSparkleIcon} />
                  )}
                  <span>{isCoaching ? 'Getting suggestions...' : 'AI suggestions'}</span>
                </button>
                <span className={styles.postQuestion__aiHelperText}>
                  Suggestions only. You still choose what to post.
                </span>
              </div>

              {/* AI Coach Feedback Display Panel */}
              {coachFeedback && (
                <div className={styles.postQuestion__coachPanel} role='region' aria-label='AI Draft Coach Feedback'>
                  <h3 className={styles.postQuestion__coachHeading}>Ideas to strengthen your draft</h3>
                  {coachFeedback.feedback && (
                    <p className={styles.postQuestion__coachSummary}>
                      {coachFeedback.feedback}
                    </p>
                  )}

                  {tips.length > 0 && (
                    <ul className={styles.postQuestion__coachTips}>
                      {tips.map((tip, idx) => (
                        <li key={idx}>{renderTip(tip)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className={styles.postQuestion__actions}>
                <div />
                <div className={styles.postQuestion__actionsRight}>
                  <button
                    type='button'
                    className={styles.postQuestion__cancelBtn}
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting || isCoaching}
                  >
                    Cancel
                  </button>

                  <button
                    type='submit'
                    className={styles.postQuestion__submitBtn}
                    disabled={isSubmitting || isCoaching}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className={styles.spin} />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <span>Post Question</span>
                        <Send size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
