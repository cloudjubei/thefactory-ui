import type { ProcessStatusTone } from './processView'
import type { ProcessVariantLaneStatus } from './processVariantViewTypes'

/** Every word of a run that works variants side by side. */
export const PROCESS_VARIANT_COPY = {
  heading: 'Variants',
  atOnce: (n: number): string => `${n} at once`,
  stripLabel: (heading: string, n: number): string => `${heading} · ${n} at once`,
  variantHead: 'Variant',
  week: (n: number): string => `Week ${n}`,
  dayOf: (day: number, days: number): string => `Day ${day} of ${days}`,
  day: (day: number): string => `Day ${day}`,
  starting: 'Starting',
  queued: 'Not started',
  reviewing: 'In review',
  needsYou: 'Stopped here. It needs you.',
  stopped: 'Stopped',
  finished: 'Finished',
  legendLived: 'Lived',
  legendToday: 'Today',
  legendNeedsYou: 'Needs you',
  legendToCome: 'To come',
  legendReviewed: 'Reviewed',
  report: 'Report',
  lanes: 'Day lanes',
  recordings: 'Recordings',
  countAsProof: (n: number, of: number): string => `${n} of ${of} count as proof`,
  recordingsAndReviews: 'Recordings and reviews',
  nothingFiled: 'Nothing filed yet.',
  stillRecording: 'Still recording. It shows here when the day ends.',
  review: 'Review',
  reviewLater: 'After the days end.',
  reviewSoon: 'The findings show here once the review is filed.',
  walkthrough: 'Walkthrough',
  patchChip: 'Patch',
  ofTotal: (n: number, of: number): string => `${n} of ${of}`,
  proof: 'Proof',
  proofReached: (day: number): string => `Proof · reached day ${day}`,
  notProof: 'Not proof',
  proofTitle: 'Counts as proof: the agent reached the end of what it was asked.',
  finalReport: 'Final report',
  post: 'Post',
  copy: 'Copy',
  finalWaiting: (left: number, of: number): string => `${left} of ${of} variants still to finish`,
  finalComes: 'The final report comes once every variant finishes.',
  finalSoFar: 'What is filed so far is below.',
  noFinalReport: 'No final report was filed.',
  asked: (n: number): string => `${n} ${n === 1 ? 'variant' : 'variants'}`,
  daysEach: (n: number): string => `${n} ${n === 1 ? 'day' : 'days'} each`,
  provenTile: (n: number, of: number): string => `${n} of ${of} recordings`,
  provenWhole: 'Each reached the end',
  provenSoFar: 'So far',
  provenShort: (n: number): string => (n === 1 ? '1 does not count' : `${n} do not count`),
  provenLine: (label: string, n: number, of: number): string =>
    n === of ? `${label}: every recording counts` : `${label}: ${n} of ${of} recordings count`,
  provenSummary: (n: number, of: number): string => `${n} of ${of} recordings count as proof`,
  reportReady: 'The report is ready',
  readReport: 'Read the report',
  afterVariants: 'After the variants',
  joinsAll: (n: number): string => `Waits for all ${n} variants`,
  joinsRest: 'Waits for the rest',
} as const

/** The badge a variant's lane wears. */
export const PROCESS_VARIANT_BADGE: Record<
  ProcessVariantLaneStatus,
  { label: string; tone: ProcessStatusTone }
> = {
  queued: { label: 'Queued', tone: 'queued' },
  running: { label: 'Running', tone: 'running' },
  parked: { label: 'Needs you', tone: 'on_hold' },
  done: { label: 'Done', tone: 'done' },
  stopped: { label: 'Stopped', tone: 'empty' },
}

/** The days of one row of a lane. */
export const PROCESS_VARIANT_WEEK_DAYS = 7

/** What a recording's label names its days by. */
export const PROCESS_VARIANT_DAYS_PATTERN = /\bdays?\s+(\d+)(?:\s*(?:-|–|—|to)\s*(\d+))?/i

/** What a filing names its week by. */
export const PROCESS_VARIANT_WEEK_PATTERN = /\bweek\s+(\d+)/i

/** What the final reviewer's second report is named by. */
export const PROCESS_VARIANT_POST_PATTERN = /\bpost\b/i

/** The name of the input a lane reads its days from. */
export const PROCESS_VARIANT_DAYS_INPUT = 'days'
