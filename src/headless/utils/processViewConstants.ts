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
} as const

/** The action on a run that ended on a request for changes, and what it does. */
export const PROCESS_SEND_BACK_COPY = {
  label: 'Send back for changes',
  detail:
    'Reopens this run: your note goes to a fix pass, which is checked, reviewed and written up, then the work comes back to you to decide again.',
} as const
