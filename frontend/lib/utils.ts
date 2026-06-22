import clsx from 'clsx';

/**
 * Merge CSS class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return clsx(...classes);
}

/**
 * Format an ISO date string to a readable format like "Jan 15, 2025".
 */
export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a numeric score to one decimal place with a % suffix.
 */
export function formatScore(score: number): string {
  return `${score.toFixed(1)}%`;
}

/**
 * Return a Tailwind text color class based on recommendation level.
 */
export function getRecommendationColor(rec: string): string {
  const lower = rec.toLowerCase();
  if (lower.includes('highly recommended') || lower.includes('strong')) {
    return 'text-emerald-400';
  }
  if (lower.includes('recommended')) {
    return 'text-blue-400';
  }
  if (lower.includes('consider') || lower.includes('maybe')) {
    return 'text-yellow-400';
  }
  if (lower.includes('not recommended') || lower.includes('reject')) {
    return 'text-red-400';
  }
  return 'text-slate-400';
}

/**
 * Return a Tailwind text color class for a given status string.
 */
export function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'active' || lower === 'open' || lower === 'completed') {
    return 'text-emerald-400';
  }
  if (lower === 'pending' || lower === 'in_progress' || lower === 'in progress') {
    return 'text-yellow-400';
  }
  if (lower === 'closed' || lower === 'rejected' || lower === 'failed') {
    return 'text-red-400';
  }
  return 'text-slate-400';
}

/**
 * Truncate text to a maximum length, appending ellipsis if needed.
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '…';
}

/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
