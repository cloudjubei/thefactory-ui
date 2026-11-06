import type { ProcessStatusTone } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import type { GroupHomeLayout, GroupMemberAttention } from './groupStatusViewTypes'

export const GROUP_HOME_LAYOUTS: readonly GroupHomeLayout[] = ['needs-you-first', 'cards', 'table']

export const GROUP_HOME_DEFAULT_LAYOUT: GroupHomeLayout = 'needs-you-first'

export const GROUP_HOME_LAYOUT_LABELS: Record<GroupHomeLayout, string> = {
  'needs-you-first': 'Needs you first',
  cards: 'Group order',
  table: 'Table',
}

/** The member sections, in the order the home shows them. */
export const GROUP_MEMBER_SECTIONS: readonly { id: GroupMemberAttention; label: string }[] = [
  { id: 'needs-you', label: PROCESS_RUN_WORDS.needsYou },
  { id: 'working', label: 'Working' },
  { id: 'quiet', label: 'Quiet' },
]

/** The tone a member's dot is drawn in. */
export const GROUP_MEMBER_ATTENTION_TONE: Record<GroupMemberAttention, ProcessStatusTone> = {
  'needs-you': 'on_hold',
  working: 'running',
  quiet: 'queued',
}

/** The group runs a row can say, in the order the home lists them. */
export const GROUP_RUN_STATUS_ORDER = ['parked', 'running', 'pending'] as const

/** How many runs a member's card lists before it says how many more. */
export const GROUP_MEMBER_RUNS_SHOWN = 3

/** How many group statuses are kept for a return to the page. */
export const GROUP_STATUS_CACHE_CAPACITY = 8

/** How long a group's status stays live after its page is left. */
export const GROUP_STATUS_LINGER_MS = 60_000

/** How often the home's times and run lines are read again. */
export const GROUP_HOME_CLOCK_MS = 30_000

/** What the group's home says, on web and native. */
export const GROUP_STATUS_COPY = {
  allQuiet: 'Nothing is going on.',
  reading: 'Reading the group’s status…',
  unread: 'The group’s status could not be read.',
  noCheckout: 'No checkout',
  noWork: 'No stories yet',
  groupRuns: 'Group runs',
  moreRuns: (count: number) => `${count} more`,
  requests: (count: number) => `${count} ${count === 1 ? 'request' : 'requests'}`,
  toAccept: (count: number) => `${count} to accept`,
  checksFailing: (count: number) => `${count} ${count === 1 ? 'check' : 'checks'} failing`,
  stories: (done: number, total: number) => `${done}/${total} ${total === 1 ? 'story' : 'stories'}`,
  features: (done: number, total: number) =>
    `${done}/${total} ${total === 1 ? 'feature' : 'features'}`,
  columns: {
    project: 'Project',
    runs: 'Runs',
    work: 'Work',
    checks: 'Checks',
    git: 'Git',
    activity: 'Last active',
  },
} as const
