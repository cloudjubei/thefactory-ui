import {
  DEFAULT_FEATURE_PROCESS_ID,
  SELF_VERIFIED_FEATURE_PROCESS_ID,
} from 'thefactory-tools/constants'

/** What the launch approval asks, above the ways a story's features can be worked. */
export const FEATURE_PROCESS_QUESTION = 'How features are worked'

/** Each way a story's features can be worked, by the feature process it nests. */
export const FEATURE_PROCESS_COPY: Readonly<Record<string, { label: string; detail: string }>> = {
  [DEFAULT_FEATURE_PROCESS_ID]: {
    label: 'Developer, then Verifier',
    detail: 'One agent writes the change, a separate verifier proves it on the device.',
  },
  [SELF_VERIFIED_FEATURE_PROCESS_ID]: {
    label: 'Developer + verifier in one',
    detail:
      'One agent writes, checks and proves its own change, and hands over only when it is done and proven.',
  },
}

/** Said under the choice: a story's fix is worked the same way whichever is picked. */
export const FEATURE_PROCESS_FIX_NOTE =
  'Either way, a fix the story’s code review or your sign-off asks for is made by a fixer and proven by a separate verifier.'

/** Said in place of the choice when the new features join an open run. */
export const FEATURE_PROCESS_EXTEND_NOTE =
  'The added features are worked the way that run works its own.'

/** The launch card's row of how the run goes: who works the features, on what, isolated. */
export const LAUNCH_HOW_IT_RUNS_HEADING = 'How it runs'

/** The mark on the way of working a story's features gets when nobody picks. */
export const FEATURE_PROCESS_DEFAULT_TAG = 'Default'
