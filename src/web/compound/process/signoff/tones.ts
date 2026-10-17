import type { CodeReviewTone, ProcessStatusTone, SignoffTimePart } from '../../../../headless'

/** A review tone as the package's soft badge — neutral is the empty grey, never an invented colour. */
export const REVIEW_TONE_BADGE: Record<CodeReviewTone, string> = {
  done: 'badge--done',
  review: 'badge--review',
  stuck: 'badge--stuck',
  working: 'badge--working',
  neutral: 'badge--empty',
}

export const REVIEW_TONE_TEXT: Record<CodeReviewTone, string> = {
  done: 'text-(--status-done-soft-fg)',
  review: 'text-(--status-review-soft-fg)',
  stuck: 'text-(--status-stuck-soft-fg)',
  working: 'text-(--status-working-soft-fg)',
  neutral: 'text-(--text-secondary)',
}

export const REVIEW_TONE_SURFACE: Record<CodeReviewTone, string> = {
  done: 'border-(--status-done-soft-border) bg-(--status-done-soft-bg)',
  review: 'border-(--status-review-soft-border) bg-(--status-review-soft-bg)',
  stuck: 'border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg)',
  working: 'border-(--status-working-soft-border) bg-(--status-working-soft-bg)',
  neutral: 'border-(--border-subtle) bg-(--surface-base)',
}

/** A process status tone as a soft badge class. */
export const PROCESS_TONE_BADGE: Record<ProcessStatusTone, string> = {
  empty: 'badge--empty',
  done: 'badge--done',
  running: 'badge--running',
  working: 'badge--working',
  stuck: 'badge--stuck',
  blocked: 'badge--blocked',
  queued: 'badge--queued',
  on_hold: 'badge--onhold',
  review: 'badge--review',
}

/** Where time went, as a bar segment's fill — the package palette, one hue per part. */
export const TIME_PART_FILL: Record<SignoffTimePart, string> = {
  thinking: 'bg-(--color-purple-500)',
  tools: 'bg-(--color-blue-500)',
  system: 'bg-(--color-gray-400)',
  checks: 'bg-(--color-green-500)',
  other: 'bg-(--color-gray-200)',
}
