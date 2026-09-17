/**
 * My Questions: personalized view of the questions the signed-in user has posted.
 * Data: `questionService.getQuestions({ mine: true })`.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { questionService } from '../../services/question/question.service.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './MyQuestions.module.css';

export default function MyQuestions() {
  const navigate = useNavigate();
  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMyQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const questions = await questionService.getQuestions({ mine: true });
        if (isMounted) setMyQuestions(questions);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to fetch questions.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchMyQuestions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.myQuestions}>
      <div className={styles.myQuestions__header}>
        <div>
          <p className={styles.myQuestions__eyebrow}>Your workspace</p>
          <h2 className={styles.myQuestions__title}>Your topics</h2>
          <p className={styles.myQuestions__description}>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on
            Home.
          </p>
        </div>

        <button
          type='button'
          className={styles.myQuestions__newButton}
          onClick={() => navigate('/questions/ask')}
        >
          <Plus size={16} />
          New question
        </button>
      </div>

      <div className={styles.myQuestions__panel}>
        {isLoading && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`}>
            Loading your questions...
          </p>
        )}

        {!isLoading && error && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`}>
            {error}
          </p>
        )}

        {!isLoading && !error && myQuestions.length === 0 && (
          <p className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
            You have not asked any questions yet. Use Ask a Question in the
            sidebar to start.
          </p>
        )}

        {!isLoading && !error && myQuestions.length > 0 && (
          <div className={styles.myQuestions__list}>
            {myQuestions.map(question => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
