/** The tool that launches one run of a piece of work across a group's projects. */
export const START_GROUP_WORK_TOOL_NAME = 'startGroupWork'

/** What the group launch card says happens after "yes" for a run built on branches. */
export const PROCESS_GROUP_ON_BRANCH_BLURB =
  'Projects that need nothing start at once; one that builds on another starts once that one is finished, on its branch. Nothing merges during the run: one sign-off opens a pull request in each repo with real changes.'

/** A run built on branches, in a line on the group story's Run dialog. */
export const PROCESS_GROUP_ON_BRANCH_LINE =
  'Built on branches: nothing merges until one sign-off opens the pull requests.'

/** What the group launch card says happens after "yes" when each project merges on its own. */
export const PROCESS_GROUP_LAUNCH_BLURB =
  'Projects that need nothing start at once; one that builds on another starts once that one is merged. You sign each project off and merge it on its own — a project merges only after the ones it builds on.'
