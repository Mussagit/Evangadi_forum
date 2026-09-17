import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { timeAgo, isAuthoredByUser } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
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
  }`.trim();
  const authorLabel = mine ? 'You' : authorName || 'Unknown';

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
      <div className={styles.questionCard__avatar}>
        <img
          src={`https://ui-avatars.com/api/?name=${
            author.firstName || 'U'
          }+${author.lastName || ''}&background=random`}
          alt={authorName || 'Author'}
          referrerPolicy='no-referrer'
        />
      </div>

      <div className={styles.questionCard__body}>
        <div className={styles.questionCard__headerRow}>
          <h4 className={styles.questionCard__title}>{question.title}</h4>
          {mine && <span className={styles.questionCard__badge}>Yours</span>}
        </div>

        <p className={styles.questionCard__preview}>{question.content}</p>

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
