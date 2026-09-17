/**
 * Question Detail: full question thread with answers, a post-answer form,
 * and an "AI Answer Fit" check before submitting a reply.
 * Data: `questionService.getSingleQuestion`, `questionService.assessAnswerFit`,
 *       `answerService.postAnswer`.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Sparkles, Loader2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { questionService } from '../../services/question/question.service.js';
import { answerService } from '../../services/answer/answer.service.js';
import { useAuth } from '../../contexts/AuthContext';
import { timeAgo, isAuthoredByUser } from '../../lib/utils';
import ui from '../../styles/pageStates.module.css';
import styles from './QuestionDetail.module.css';

const ANSWER_MIN = 20;

const FIT_LABELS = {
  strong: 'Strong fit',
  partial: 'Partial fit',
  weak: 'Weak fit',
};

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
        if (isMounted) setLoadError(err.message || 'Failed to load question.');
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
      <p className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}>
        Loading question...
      </p>
    );
  }

  if (loadError) {
    return (
      <p className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}>
        {loadError}
      </p>
    );
  }

  if (!question) {
    return (
      <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
        This question could not be found.
      </p>
    );
  }

  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim();

  return (
    <div className={styles.questionDetail}>
      <article className={styles.questionDetail__question}>
        <h2 className={styles.questionDetail__title}>{question.title}</h2>
        <div className={styles.questionDetail__meta}>
          <span>{authorName || 'Unknown'}</span>
          <span aria-hidden>&bull;</span>
          <span>{timeAgo(question.createdAt)}</span>
        </div>
        <div className={styles.questionDetail__body}>
          <ReactMarkdown>{question.content || ''}</ReactMarkdown>
        </div>
      </article>

      {similarQuestions.length > 0 && (
        <aside className={styles.questionDetail__similar} aria-label='Related topics'>
          <h3 className={styles.questionDetail__similarHeading}>Related topics</h3>
          <ul className={styles.questionDetail__similarList}>
            {similarQuestions.map(item => (
              <li key={item.id || item.questionHash}>
                <button
                  type='button'
                  className={styles.questionDetail__similarLink}
                  onClick={() => navigate(`/questions/${item.questionHash}`)}
                >
                  <span>{item.title}</span>
                  {typeof item.score === 'number' && (
                    <span className={styles.questionDetail__similarScore}>
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <section className={styles.questionDetail__answers}>
        <h3 className={styles.questionDetail__answersHeading}>
          <MessageSquare size={18} />
          {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
        </h3>

        {answers.length === 0 && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
            No answers yet. Be the first to help.
          </p>
        )}

        {answers.length > 0 && (
          <ul className={styles.questionDetail__answerList}>
            {answers.map(answer => {
              const answerAuthor = answer.author || {};
              const answerAuthorName = `${answerAuthor.firstName || ''} ${
                answerAuthor.lastName || ''
              }`.trim();
              return (
                <li key={answer.id} className={styles.questionDetail__answerCard}>
                  <div className={styles.questionDetail__answerMeta}>
                    <span>{answerAuthorName || 'Unknown'}</span>
                    <span aria-hidden>&bull;</span>
                    <span>{timeAgo(answer.createdAt)}</span>
                  </div>
                  <div className={styles.questionDetail__answerBody}>
                    <ReactMarkdown>{answer.content || ''}</ReactMarkdown>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {isOwnQuestion ? (
          <p className={styles.questionDetail__ownNotice}>
            You cannot answer your own question.
          </p>
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
              <p className={styles.questionDetail__error}>{postError}</p>
            )}
            {fitError && (
              <p className={styles.questionDetail__error}>{fitError}</p>
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
                {isCheckingFit ? 'Checking...' : 'Check answer fit'}
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
                {isPosting ? 'Posting...' : 'Post answer'}
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

      <button
        type='button'
        className={styles.questionDetail__back}
        onClick={() => navigate(-1)}
      >
        Back
      </button>
    </div>
  );
}
