/** The project setting's label. */
export const PROJECT_CHECK_COMMANDS_LABEL = 'Check commands'

/** What the setting is for. */
export const PROJECT_CHECK_COMMANDS_HINT =
  'Commands the checks run in place of what they detect. Leave a field empty to use what the checks find.'

/** The related tests command: its label, what it does and what an empty field shows. */
export const PROJECT_CHECK_COMMANDS_RELATED_LABEL = 'Related tests'
export const PROJECT_CHECK_COMMANDS_RELATED_HINT =
  'Runs the unit tests related to some files, {files} where the files go. Inside a feature’s build and fix loop the checks run it on the files the change touched; the story’s checks still run the whole suite.'
export const PROJECT_CHECK_COMMANDS_RELATED_PLACEHOLDER = 'npx jest --findRelatedTests {files}'

/** The format fix command: its label, what it does and what an empty field shows. */
export const PROJECT_CHECK_COMMANDS_FORMAT_LABEL = 'Format fix'
export const PROJECT_CHECK_COMMANDS_FORMAT_HINT =
  'Fixes what the format check finds, {files} where the files go, or the whole project without it. When the format check fails, the checks run it on the files the change touched and commit them with the work.'
export const PROJECT_CHECK_COMMANDS_FORMAT_PLACEHOLDER = 'npx prettier --write {files}'

/** How each field is named at the start of its reason it cannot be saved. */
export const PROJECT_CHECK_COMMANDS_FIELD_NAMES = {
  relatedTests: 'Related tests',
  formatFix: 'Format fix',
} as const
