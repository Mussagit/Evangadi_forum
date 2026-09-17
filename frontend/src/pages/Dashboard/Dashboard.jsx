/**
 * Dashboard: forum home after login. Shortcuts, feed stats, and discussion list.
 * Search lives in the shell navbar (`?q=` keyword, `?semantic=` similarity).
 * Data: `questionService` — same GET /api/questions and GET /api/questions/search
 *   as `tasks/backend/question/list-questions.md` and `search-questions.md`.
 */

import { useEffect, useState } from 'react';
import { BookOpen, List, PenSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthoredByUser } from '../../lib/utils';
import { questionService } from '../../services/question/question.service.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './Dashboard.module.css';

const SHORTCUTS = [
  {
    to: '/questions/ask',
    icon: PenSquare,
    title: 'New question',
    body: 'Share context, errors, and what you already tried',
  },
  {
    to: '/my-questions',
    icon: List,
    title: 'Your topics',
    body: 'Filtered list of threads you authored',
  },
  {
    to: '/rag-documents',
    icon: BookOpen,
    title: 'Knowledge base',
    body: 'Course library, uploads, and retrieval-backed context for threads',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const firstName = user?.firstName?.trim();
  const welcomeLine = firstName
    ? `Good to see you, ${firstName}.`
    : 'Welcome to the forum.';

  const searchParams = new URLSearchParams(location.search);
  const keywordQuery = (searchParams.get('q') || '').trim();
  const semanticQuery = (searchParams.get('semantic') || '').trim();
  const isNewestFeed = !keywordQuery && !semanticQuery;

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const results = semanticQuery
          ? await questionService.searchQuestionsSemantic(semanticQuery)
          : await questionService.getQuestions({
              search: keywordQuery || undefined,
            });
        if (isMounted) setQuestions(results || []);
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load questions.');
          setQuestions([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [keywordQuery, semanticQuery]);

  const stats = {
    questions: questions.length,
    replies: questions.reduce(
      (sum, question) => sum + (Number(question.answerCount) || 0),
      0,
    ),
    unanswered: questions.filter(
      question => (Number(question.answerCount) || 0) === 0,
    ).length,
    yours: questions.filter(question => isAuthoredByUser(question, user))
      .length,
  };

  function showNewestThreads() {
    if (!isNewestFeed) {
      navigate('/dashboard');
      return;
    }
    document.getElementById('discussion-feed')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className={styles.dashboard}>
      <section className={styles.dashboard__hero} aria-labelledby='forum-home-heading'>
        <p className={styles.dashboard__eyebrow}>Forum home</p>
        <h2 className={styles.dashboard__title} id='forum-home-heading'>
          {welcomeLine}
        </h2>
        <p className={styles.dashboard__description}>
          Start a topic, revisit your own threads, or skim the live feed. Search
          above works from any page once you are back on Home.
        </p>

        <div className={styles.dashboard__shortcuts}>
          {SHORTCUTS.map(item => (
            <button
              key={item.to}
              type='button'
              className={styles.dashboard__shortcut}
              onClick={() => navigate(item.to)}
            >
              <span className={styles.dashboard__shortcutIcon} aria-hidden>
                <item.icon size={20} strokeWidth={1.75} />
              </span>
              <span className={styles.dashboard__shortcutCopy}>
                <span className={styles.dashboard__shortcutTitle}>
                  {item.title}
                </span>
                <span className={styles.dashboard__shortcutBody}>{item.body}</span>
              </span>
            </button>
          ))}
        </div>

        <p className={styles.dashboard__statsNote}>
          Figures below describe the newest threads in this feed (up to 100 from
          the API).
        </p>
        <dl className={styles.dashboard__stats}>
          <div className={styles.dashboard__stat}>
            <dt>Questions</dt>
            <dd>{isLoading ? '—' : stats.questions}</dd>
          </div>
          <div className={styles.dashboard__stat}>
            <dt>Replies</dt>
            <dd>{isLoading ? '—' : stats.replies}</dd>
          </div>
          <div className={styles.dashboard__stat}>
            <dt>Unanswered</dt>
            <dd>{isLoading ? '—' : stats.unanswered}</dd>
          </div>
          <div className={styles.dashboard__stat}>
            <dt>Yours</dt>
            <dd>{isLoading ? '—' : stats.yours}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.dashboard__panel}
        id='discussion-feed'
        aria-labelledby='discussion-heading'
      >
        <div className={styles.dashboard__panelHeader}>
          <div>
            <h3 className={styles.dashboard__panelTitle} id='discussion-heading'>
              Discussion feed
            </h3>
            <p className={styles.dashboard__panelLead}>
              Your threads use a slim left accent in this list.
            </p>
          </div>
          <button
            type='button'
            className={styles.dashboard__newest}
            onClick={showNewestThreads}
            aria-pressed={isNewestFeed}
          >
            Newest threads
          </button>
        </div>

        {isLoading && (
          <p
            className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}
          >
            Loading questions...
          </p>
        )}

        {!isLoading && error && (
          <p
            className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}
          >
            {error}
          </p>
        )}

        {!isLoading && !error && questions.length === 0 && (
          <div className={styles.dashboard__empty}>
            <p>No questions found. Be the first to ask!</p>
          </div>
        )}

        {!isLoading && !error && questions.length > 0 && (
          <div className={styles.dashboard__list}>
            {questions.map(question => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
