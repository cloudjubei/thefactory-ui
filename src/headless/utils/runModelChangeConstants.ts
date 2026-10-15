/** What the run's model chip says while a step agent is at work: the change waits for its step. */
export const RUN_MODEL_NOTE_NEXT_STEP = 'Takes effect when the current step finishes.'

/** What the run's model chip says while the run waits on the person: the change applies now. */
export const RUN_MODEL_NOTE_WAITING =
  'The run is waiting, so a change applies now — the step that resumes runs on it.'

/** What the run's model chip says while no step agent is at work. */
export const RUN_MODEL_NOTE_NOW = 'No step is running, so a change applies now.'

/** After a waiting change's model, in the run's header. */
export const RUN_MODEL_PENDING_SUFFIX = 'from the next step'

/** How the API is named beside a CLI model. */
export const RUN_MODEL_API_LABEL = 'API'
