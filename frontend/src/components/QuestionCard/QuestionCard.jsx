import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { timeAgo, isAuthoredByUser, stripMarkdown } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../UserAvatar/UserAvatar';
import styles from './QuestionCard.module.css';

/**
 * Reusable question row: shown on the Dashboard feed and on My Questions.
 * Left accent + "Yours" badge highlight questions owned by the signed-in user.
 * Navigates to the question detail thread on click.
 */
export default function QuestionCard({ question }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mine = isAuthoredByUser(question, user);
  const author = question.author || {};
  const authorName = `${author.firstName || ''} ${
    author.lastName || ''
  }`.trim() || 'Anonymous';
  const authorLabel = mine ? 'You' : authorName;
  const cleanPreview = stripMarkdown(question.content);

  const goToQuestion = () => {
    navigate(`/questions/${question.questionHash}`);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToQuestion();
    }
  };

  return (
    <article
      className={`${styles.questionCard} ${
        mine ? styles['questionCard--mine'] : ''
      }`}
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
    </article>
  );
}


