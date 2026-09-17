/**
 * Post Question: form to ask a new question, with an integrated AI Draft
 * Coach that gives real-time feedback before submission.
 * Data: `questionService.generateQuestionDraftCoach`, `questionService.createQuestion`.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { questionService } from '../../services/question/question.service.js';
import styles from './PostQuestion.module.css';

const TITLE_MIN = 5;
const CONTENT_MIN = 10;

export default function PostQuestion() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function handleChange(field) {
    return e => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };
  }

  function validate() {
    if (formData.title.trim().length < TITLE_MIN) {
      return `Title must be at least ${TITLE_MIN} characters.`;
    }
    if (formData.content.trim().length < CONTENT_MIN) {
      return `Content must be at least ${CONTENT_MIN} characters.`;
    }
    return null;
  }

  async function handleGetFeedback() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsCoaching(true);
    try {
      const feedback = await questionService.generateQuestionDraftCoach(
        formData,
      );
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
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const question = await questionService.createQuestion(formData);
      setSuccess('Question posted successfully.');
      const hash = question?.questionHash || question?.hash;
      if (hash) {
        navigate(`/questions/${hash}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to post question.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const tips = coachFeedback?.tips || [];

  return (
    <div className={styles.postQuestion}>
      <div className={styles.postQuestion__panel}>
        <p className={styles.postQuestion__eyebrow}>New question</p>
        <h2 className={styles.postQuestion__title}>Ask the community</h2>
        <p className={styles.postQuestion__description}>
          A clear title and reproducible steps get faster, more accurate
          answers. Use the AI Draft Coach for suggestions before you post.
        </p>

        <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
          <div className={styles.postQuestion__field}>
            <label htmlFor='title' className={styles.postQuestion__label}>
              Title
            </label>
            <input
              id='title'
              type='text'
              value={formData.title}
              onChange={handleChange('title')}
              placeholder='e.g. Why does my useEffect run twice in React 19?'
              className={styles.postQuestion__input}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.postQuestion__field}>
            <label htmlFor='content' className={styles.postQuestion__label}>
              Details
            </label>
            <textarea
              id='content'
              value={formData.content}
              onChange={handleChange('content')}
              placeholder='Describe what you tried, what you expected, and what happened instead.'
              className={styles.postQuestion__textarea}
              rows={10}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className={styles.postQuestion__error}>{error}</p>
          )}
          {success && (
            <p className={styles.postQuestion__success}>{success}</p>
          )}

          <div className={styles.postQuestion__actions}>
            <button
              type='button'
              className={styles.postQuestion__coachButton}
              onClick={handleGetFeedback}
              disabled={isCoaching || isSubmitting}
            >
              {isCoaching ? (
                <Loader2 size={16} className={styles.spin} />
              ) : (
                <Sparkles size={16} />
              )}
              {isCoaching ? 'Getting feedback...' : 'Get AI feedback'}
            </button>

            <button
              type='submit'
              className={styles.postQuestion__submitButton}
              disabled={isSubmitting || isCoaching}
            >
              {isSubmitting ? (
                <Loader2 size={16} className={styles.spin} />
              ) : (
                <Send size={16} />
              )}
              {isSubmitting ? 'Posting...' : 'Post question'}
            </button>
          </div>
        </form>
      </div>

      {coachFeedback && (
        <aside className={styles.postQuestion__coachPanel}>
          <div className={styles.postQuestion__coachHeader}>
            <Sparkles size={16} />
            <h3>AI Draft Coach</h3>
          </div>

          {coachFeedback.feedback && (
            <p className={styles.postQuestion__coachSummary}>
              {coachFeedback.feedback}
            </p>
          )}

          {tips.length > 0 && (
            <ul className={styles.postQuestion__coachTips}>
              {tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
