import type { ProcessStatusTone } from './processView'
import type { RunThroughIssueChoice, RunThroughIssueStanding } from './runThroughIssueReviewTypes'

const fixes = (n: number) => (n === 1 ? '1 fix' : `${n} fixes`)
const notIssues = (n: number) => (n === 1 ? '1 not an issue' : `${n} not issues`)

export const RUN_THROUGH_REVIEW_COPY = {
  start: (n: number) => `Go over the issues (${n})`,
  reviewed: (fixCount: number, notIssueCount: number) =>
    `Gone over · ${fixes(fixCount)} · ${notIssues(notIssueCount)}`,
  heading: (n: number, total: number) => `Issue ${n} of ${total}`,
  allAnswered: (total: number) => `All ${total} answered`,
  answersHeading: 'Answers',
  progress: (answered: number, total: number) => `${answered} of ${total} answered`,
  position: (n: number, total: number) => `${n} / ${total}`,
  dot: (n: number, badge: string) => `Issue ${n} · ${badge}`,
  number: (n: number) => `#${n}`,
  happened: 'What happened',
  expected: 'Expected',
  moment: 'Screenshot at this moment of the recording',
  shotOnly: 'Screenshot of this issue',
  noShot: 'No screenshot was taken for this issue.',
  openShot: (title: string) => `Open the screenshot of ${title}`,
  discuss: 'Discuss in the run’s chat',
  back: 'Back',
  next: 'Next',
  answer: 'answer',
  move: 'move',
  close: 'Close',
  replyPlaceholder: 'What should the fix do?',
  replyLabel: 'Your words for the fix',
  save: 'Save',
  cancel: 'Cancel',
  legend: { fix: 'Fix', 'not-an-issue': 'Not an issue', open: 'Open' },
  tally: (fixCount: number, notIssueCount: number) =>
    `Fix ${fixCount} · Not an issue ${notIssueCount}`,
  group: (label: string, n: number) => `${label} · ${n}`,
  groupLabel: { open: 'Open', fix: 'Fix', 'not-an-issue': 'Not an issue' },
  create: (fixCount: number, projectName: string) =>
    fixCount === 0
      ? 'Close the run'
      : `Create ${fixCount === 1 ? '1 fix' : `${fixCount} fixes`} in ${projectName} and close the run`,
  createDoes: (fixCount: number, projectName: string) =>
    fixCount === 0
      ? 'Nothing is made; the run closes.'
      : `A new story in ${projectName}, one feature per fix; the run closes.`,
  openFirst: (n: number) =>
    n === 1 ? 'Answer the open issue first.' : `Answer the ${n} open issues first.`,
  answerFailed: 'That answer was not saved.',
  finishFailed: 'The run could not be closed.',
  newStory: (projectName: string) => `New story in ${projectName}:`,
} as const

/** What each standing reads as on its badge. */
export const RUN_THROUGH_ISSUE_STANDING_BADGE: Record<RunThroughIssueStanding, string> = {
  fix: 'Fix it',
  reply: 'Fix · your words',
  'not-an-issue': 'Not an issue',
  open: 'Open',
}

/** Each standing as a status badge: a fix in the accent blue its dot has, the rest quiet. */
export const RUN_THROUGH_ISSUE_STANDING_TONE: Record<RunThroughIssueStanding, ProcessStatusTone> = {
  fix: 'running',
  reply: 'running',
  'not-an-issue': 'empty',
  open: 'empty',
}

/** The three answers, in the order their keys give them. */
export const RUN_THROUGH_ISSUE_CHOICES: readonly RunThroughIssueChoice[] = [
  { id: 'fix', key: '1', label: 'Fix it', detail: 'A feature to fix it' },
  { id: 'not-an-issue', key: '2', label: 'Not an issue', detail: 'Nothing is made for it' },
  { id: 'reply', key: '3', label: 'Reply…', detail: 'Your words become the fix’s instruction' },
]
