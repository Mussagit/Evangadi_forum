/**
 * My Questions: personalized view of the questions the signed-in user has posted.
 * Includes Edit (navigates to detail page) and Delete actions on each card.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, X, Check } from 'lucide-react';
import { questionService } from '../../services/question/question.service.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './MyQuestions.module.css';

export default function MyQuestions() {
  const navigate = useNavigate();
  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState(null); // question object
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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
    return () => { isMounted = false; };
  }, []);

  function handleDeleteRequest(question) {
    setPendingDelete(question);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await questionService.deleteQuestion(pendingDelete.questionHash);
      setMyQuestions(prev => prev.filter(q => q.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete question.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={styles.myQuestions}>
      <div className={styles.myQuestions__header}>
        <div>
          <p className={styles.myQuestions__eyebrow}>Your workspace</p>
          <h2 className={styles.myQuestions__title}>Your topics</h2>
          <p className={styles.myQuestions__description}>
            Only questions you created. Open one to read answers or add
            follow-ups. Use Edit to update or Delete to remove permanently.
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

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className={styles.myQuestions__deleteModal} role='dialog' aria-modal='true' aria-label='Confirm delete question'>
          <div className={styles.myQuestions__deleteCard}>
            <p className={styles.myQuestions__deleteMessage}>
              Delete <strong>"{pendingDelete.title}"</strong>? This will also remove all its answers and cannot be undone.
            </p>
            {deleteError && <p className={styles.myQuestions__deleteError}>{deleteError}</p>}
            <div className={styles.myQuestions__deleteActions}>
              <button
                type='button'
                className={styles.myQuestions__cancelBtn}
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                <X size={14} /> Cancel
              </button>
              <button
                type='button'
                className={styles.myQuestions__confirmBtn}
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <><Loader2 size={14} className={styles.spin} /> Deleting...</>
                  : <><Trash2 size={14} /> Yes, delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <QuestionCard
                key={question.id}
                question={question}
                showActions
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
