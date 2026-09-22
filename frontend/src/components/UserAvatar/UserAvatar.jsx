import React from 'react';
import { getDeterministicAvatarStyle, getInitials } from '../../lib/utils';
import styles from './UserAvatar.module.css';

/**
 * Deterministic User Avatar Component.
 * Automatically computes consistent background and text colors based on the user's name.
 * The same name always yields the exact same avatar color across the entire application.
 *
 * @param {Object} props
 * @param {string} props.name - The full name or display name of the user.
 * @param {string} [props.size] - Optional size ('sm' | 'md' | 'lg' | 'xl'). Default is 'md'.
 * @param {string} [props.className] - Optional additional CSS class.
 * @param {Object} [props.style] - Optional inline style overrides.
 */
export default function UserAvatar({
  name = 'User',
  size = 'md',
  className = '',
  style = {},
}) {
  const initials = getInitials(name);
  const avatarColors = getDeterministicAvatarStyle(name);

  const sizeClass = styles[`userAvatar--${size}`] || styles['userAvatar--md'];

  return (
    <div
      className={`${styles.userAvatar} ${sizeClass} ${className}`}
      style={{
        backgroundColor: avatarColors.bg,
        color: avatarColors.color,
        ...style,
      }}
      aria-label={name}
      title={name}
    >
      <span className={styles.userAvatar__initials}>{initials}</span>
    </div>
  );
}
