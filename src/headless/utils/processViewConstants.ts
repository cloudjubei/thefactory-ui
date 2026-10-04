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
