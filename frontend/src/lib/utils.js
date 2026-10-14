/**
 * Formats a date into a relative time string (e.g., "5 mins ago", "2 hrs ago")
 * @param {Date|string|number} dateInput - The date to format
 * @returns {string} Relative time string
 */
export function timeAgo(dateInput) {
  if (!dateInput) return '';

  const date = new Date(dateInput);

  // Check for invalid dates
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Handle future dates or extremely recent dates
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds} sec${seconds !== 1 ? 's' : ''} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Whether a question was created by the signed-in user (IDs compared as strings).
 * @param {{ author?: { id?: string | number } } | null | undefined} question
 * @param {{ id?: string | number } | null | undefined} user
 * @returns {boolean}
 */
export function isAuthoredByUser(question, user) {
  if (!question || !user) return false;
  const authorId = question.author?.id;
  const userId = user.id;
  if (authorId == null || userId == null) return false;
  return String(authorId) === String(userId);
}

/**
 * Strips markdown symbols for clean text preview snippets in list cards.
 * @param {string} md
 * @returns {string}
 */
export function stripMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/#{1,6}\s+/g, '') // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // bold/italic/strike
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // list items
    .replace(/^\d+\.\s+/gm, '') // numbered lists
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

const AVATAR_PALETTES = [
  { bg: '#67e8f9', color: '#000000' }, // Cyan (e.g. Abebe Kebede)
  { bg: '#f43f5e', color: '#000000' }, // Rose/Magenta (e.g. Mussie)
  { bg: '#86efac', color: '#000000' }, // Mint Green
  { bg: '#a855f7', color: '#000000' }, // Purple
  { bg: '#38bdf8', color: '#000000' }, // Sky Blue
  { bg: '#fb923c', color: '#000000' }, // Warm Orange
  { bg: '#a3e635', color: '#000000' }, // Lime Green
  { bg: '#ec4899', color: '#000000' }, // Pink
  { bg: '#818cf8', color: '#000000' }, // Indigo
  { bg: '#2dd4bf', color: '#000000' }, // Teal
  { bg: '#fbbf24', color: '#000000' }, // Amber
  { bg: '#34d399', color: '#000000' }, // Emerald
];

/**
 * Generates a deterministic, consistent avatar background and text color based on a person's name.
 * The SAME name will ALWAYS produce the EXACT SAME color, while different names produce different colors.
 * @param {string} name
 * @returns {{ bg: string, color: string }}
 */
export function getDeterministicAvatarStyle(name) {
  if (!name || typeof name !== 'string') {
    return { bg: '#67e8f9', color: '#164e63' };
  }

  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/**
 * Extracts 1-2 uppercase initials from a person's full name.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}


