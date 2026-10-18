/**
 * The short words a run's status is said in, on every surface: the list, its
 * sections, the run header, the chat card, a group's legs and a story's chip.
 */
export const PROCESS_RUN_WORDS = {
  starting: 'Starting',
  needsYou: 'Needs you',
  waiting: 'Waiting',
  managerOnIt: 'Manager on it',
  signOff: 'Sign off',
  running: 'Running',
  merging: 'Merging',
  bringingIn: 'Bringing in',
  notMerged: 'Not merged',
  notBroughtIn: 'Not brought in',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
} as const

/** What a run's chat card says while it reads the run, and once the run is gone. */
export const PROCESS_RUN_CHIP_LOADING = 'Loading the pipeline…'
export const PROCESS_RUN_CHIP_GONE = 'This run no longer exists.'

/** What a group run's chat card says while it reads the group run, and once it is gone. */
export const PROCESS_GROUP_RUN_CHIP_LOADING = 'Loading the group run…'
export const PROCESS_GROUP_RUN_CHIP_GONE = 'This group run no longer exists.'

/** The heading of a run's spend details when no cap stands against it. */
export const PROCESS_SPEND_TITLE = 'Spent so far'

/** The heading of a capped run's spend details. */
export const PROCESS_SPEND_CAP_TITLE = 'Spent against the cap'

/** What a finished process step's own view says, by what the step did. */
export const PROCESS_STEP_FINISHED_COPY = {
  handoff: {
    title: 'Implemented — handed to Verify',
    detail:
      'This step wrote the change and handed it to the verifier. Its diff is below; whether it is proven is decided by Verify in the pipeline, not here.',
  },
  selfProven: {
    title: 'Implemented and proven by this agent',
    detail:
      'This step wrote the change and proved it itself — its diff, the before/after proof it filed and its checks are below. Whether the proof counts is decided in the pipeline, not here.',
  },
  finished: {
    title: 'This stage is finished here',
    detail:
      'This run is one step of a process. What it did and changed is shown below; its outcome and sign-off are decided in the pipeline, not here.',
  },
} as const

/** What a run a person ended is called, and its tone: their decision, never a crash. */
export const PROCESS_RUN_PERSON_ENDING_VIEW = {
  'request-changes': { label: 'Changes requested', tone: 'on_hold' },
  reject: { label: 'Rejected', tone: 'empty' },
  abandon: { label: 'Abandoned', tone: 'empty' },
  'close-unmerged': { label: 'Closed without merging', tone: 'empty' },
} as const

/** The action on a run that ended on a request for changes, and what it does. */
export const PROCESS_SEND_BACK_COPY = {
  label: 'Send back for changes',
  detail:
    'Reopens this run: your note goes to a fix pass, which is checked, reviewed and written up, then the work comes back to you to decide again.',
} as const

/** What taking a stopped run back up is called, and does. */
export const PROCESS_REVIVE_COPY = {
  label: 'Resume',
  detail:
    'Takes this run back up where it was stopped: the step it was on waits for you to try it again, or the sign-off waits for your decision. Nothing it did is lost.',
} as const

/** What stopping a run asks first: Stop ends everything it is doing. */
export const PROCESS_CLOSE_UNMERGED_CONFIRM_COPY = {
  title: 'Close without merging?',
  body: 'The run ends and its branch stays. Its features keep their statuses — settle them one by one after. You can resume it later.',
  confirm: 'Close without merging',
  cancel: 'Keep it open',
} as const

export const PROCESS_STOP_CONFIRM_COPY = {
  title: 'Stop this run?',
  body: 'Everything it is doing stops now — the step it is on and any nested run. You can resume it later from where it stopped.',
  confirm: 'Stop run',
  cancel: 'Keep it running',
} as const

/** What the loop editor says of a loop that leaves a gate: a person's send-backs are never capped. */
export const PROCESS_GATE_LOOP_NO_LIMIT = 'a person’s send-back — no limit'

/** The action on a step the run stopped at: ask an agent about it in the run's own chat. */
export const PROCESS_PARK_ASK_AGENT_COPY = {
  label: 'Ask an agent',
  detail:
    'Opens this run’s chat with an agent looking into why the step stopped and what to do. The run waits here for your decision.',
} as const

/** The line under a step whose Try again went to the checks first, the branch having moved past what they failed on. */
export const PROCESS_STEP_RECHECKED = (sha: string | undefined) =>
  `Try again ran the checks first — branch changed${sha ? ` (${sha.slice(0, 8)})` : ''}`
