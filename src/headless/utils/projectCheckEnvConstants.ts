/** The project setting's label. */
export const PROJECT_CHECK_ENV_LABEL = 'Live check env'

/** What the setting is for. */
export const PROJECT_CHECK_ENV_HINT =
  'Values and secrets a live check runs with. You are asked before every run that uses them; agents never see the secrets.'

/** The two lists it holds. */
export const PROJECT_CHECK_ENV_VALUES_LABEL = 'Values'
export const PROJECT_CHECK_ENV_SECRETS_LABEL = 'Secrets'

/** What an empty row's fields show. */
export const PROJECT_CHECK_ENV_NAME_PLACEHOLDER = 'NAME'
export const PROJECT_CHECK_ENV_VALUE_PLACEHOLDER = 'value'
export const PROJECT_CHECK_ENV_NOTE_PLACEHOLDER = 'Pick a secret note'

/** The row actions. */
export const PROJECT_CHECK_ENV_ADD_VALUE = 'Add value'
export const PROJECT_CHECK_ENV_ADD_SECRET = 'Add secret'
export const PROJECT_CHECK_ENV_REMOVE = 'Remove'

/** Shown when the project has no secret note to pick. */
export const PROJECT_CHECK_ENV_NO_SECRET_NOTES = 'No secret notes yet. Add one in Notes.'

/** Why a row cannot be saved. */
export const PROJECT_CHECK_ENV_ERRORS = {
  noName: 'Needs a name.',
  badName: (name: string): string => `“${name}” is not a variable name.`,
  hostName: (name: string): string => `${name} is set by the host.`,
  secretValue: (name: string): string => `${name} looks like a secret. Add it under Secrets.`,
  twice: (name: string): string => `${name} is set twice.`,
  noNote: 'Pick a secret note.',
} as const
