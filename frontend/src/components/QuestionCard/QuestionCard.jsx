import { useNavigate } from 'react-router-dom';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { timeAgo, isAuthoredByUser, stripMarkdown } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../UserAvatar/UserAvatar';
import styles from './QuestionCard.module.css';

/**
 * Reusable question row shown on the Dashboard feed and on My Questions.
 *
 * When `showActions` is true (My Questions page), Edit and Delete buttons
 * appear for questions owned by the signed-in user.
 *
 * Props:
 *   question    – question object
 *   showActions – (bool) show edit/delete buttons, default false
 *   onDelete    – (fn) called with question when user confirms delete
 */
export default function QuestionCard({ question, showActions = false, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mine = isAuthoredByUser(question, user);
  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Anonymous';
  const authorLabel = mine ? 'You' : authorName;
  const cleanPreview = stripMarkdown(question.content);

  const goToQuestion = () => navigate(`/questions/${question.questionHash}`);

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToQuestion(); }
  };

  const handleEdit = e => {
    e.stopPropagation();
    navigate(`/questions/${question.questionHash}`);
  };

  const handleDelete = e => {
    e.stopPropagation();
    if (onDelete) onDelete(question);
  };

  return (
    <article
      className={`${styles.questionCard} ${mine ? styles['questionCard--mine'] : ''}`}
      role='button'
      tabIndex={0}
      onClick={goToQuestion}
      onKeyDown={handleKeyDown}
    >
      <UserAvatar name={authorName} size='lg' />

      <div className={styles.questionCard__body}>
        <div className={styles.questionCard__headerRow}>
          <h4 className={styles.questionCard__title}>{question.title}</h4>
          {mine && <span className={styles.questionCard__badge}>Yours</span>}
        </div>

        <p className={styles.questionCard__preview}>{cleanPreview}</p>

        <div className={styles.questionCard__meta}>
          <span className={styles.questionCard__replies}>
            <MessageSquare size={14} />
            {question.answerCount} replies
          </span>
          <span className={styles.questionCard__timestamp}>
            {timeAgo(question.createdAt)} by {authorLabel}
          </span>
        </div>
      </div>

      {/* Edit / Delete — only shown when showActions=true and it's the user's own question */}
      {showActions && mine && (
        <div className={styles.questionCard__actions}>
          <button
            type='button'
            className={styles.questionCard__editBtn}
            onClick={handleEdit}
            title='Edit question'
            aria-label='Edit question'
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>
          <button
            type='button'
            className={styles.questionCard__deleteBtn}
            onClick={handleDelete}
            title='Delete question'
            aria-label='Delete question'
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </article>
  );
}
