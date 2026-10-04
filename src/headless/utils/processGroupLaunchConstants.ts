import type { ProcessIntegrationMode } from 'thefactory-tools/types'

/** The tool that launches one run of a piece of work across a group's projects. */
export const START_GROUP_WORK_TOOL_NAME = 'startGroupWork'

/** How a prerequisite may be merged early: never a pull request, its dependents build on it. */
export const PROCESS_GROUP_PREREQUISITE_MODES: readonly ProcessIntegrationMode[] = [
  'merge',
  'squash',
]

/** What the group launch card says happens after "yes". */
export const PROCESS_GROUP_LAUNCH_BLURB =
  'Projects that need nothing start at once. One that builds on another waits until that one is merged — you approve each of those merges — and everything comes back to you for one sign-off.'

/** What a prerequisite's merge picker on the launch card is asking. */
export const PROCESS_GROUP_EARLY_MERGE_LABEL = 'When it is done, merge it early as'
