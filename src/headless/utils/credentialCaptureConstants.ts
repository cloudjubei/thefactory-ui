import type {
  CredentialCaptureFieldSpec,
  CredentialCaptureFormValues,
  CredentialCaptureStatus,
  CredentialCaptureStatusDisplay,
} from './credentialCaptureTypes'

/** WS topic carrying a capture record on open and on every resolution. */
export const CREDENTIAL_CAPTURE_EVENT = 'credentialCapture:updated'

/**
 * The agent tool that opens a capture. The transcript row for this tool is where
 * the form is mounted, so the name is matched against `toolCall.name`.
 */
export const CREDENTIAL_CAPTURE_TOOL_NAME = 'requestGitCredentials'

/** The tool argument a capture's `purpose` is recorded from — the join between the two. */
export const CREDENTIAL_CAPTURE_PURPOSE_ARG = 'purpose'

/** The git-credential form, in render order. */
export const CREDENTIAL_CAPTURE_FIELDS: readonly CredentialCaptureFieldSpec[] = [
  {
    name: 'name',
    label: 'Name',
    placeholder: 'GitHub — personal',
    type: 'text',
  },
  {
    name: 'username',
    label: 'Username',
    placeholder: 'your-github-username',
    type: 'text',
  },
  {
    name: 'email',
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
  },
  {
    name: 'host',
    label: 'Host (optional)',
    placeholder: 'dev.azure.com',
    type: 'text',
    optional: true,
  },
  {
    name: 'token',
    label: 'Personal access token',
    placeholder: 'ghp_…',
    type: 'secret',
  },
]

export const EMPTY_CREDENTIAL_CAPTURE_FORM: CredentialCaptureFormValues = {
  name: '',
  username: '',
  email: '',
  host: '',
  token: '',
}

export const CAPTURE_FIELD_REQUIRED = 'Required.'

export const CAPTURE_CARD_TITLE = 'The agent needs your git credentials'

/**
 * The promise the whole feature rests on, stated where the user is typing:
 * what they enter goes to the encrypted store and never to the conversation.
 */
export const CAPTURE_CARD_PRIVACY_NOTE =
  'These go straight to your encrypted credential store. Nothing you type here enters the chat — the agent is only told which credential was created.'

export const CAPTURE_PURPOSE_LABEL = 'What for'

export const CAPTURE_SUBMIT_LABEL = 'Save credentials'

export const CAPTURE_CANCEL_LABEL = 'Not now'

/** Fallback when a submit or cancel fails; the thrown error carries no secret. */
export const CAPTURE_SUBMIT_ERROR = 'Could not save the credentials.'

export const CAPTURE_CANCEL_ERROR = 'Could not dismiss the request.'

/**
 * Resolved-state copy. A resolved capture keeps its place in the conversation
 * rather than vanishing, so scrollback still explains what happened.
 */
export const CREDENTIAL_CAPTURE_STATUS_DISPLAY: Record<
  CredentialCaptureStatus,
  CredentialCaptureStatusDisplay
> = {
  requested: {
    label: 'Waiting for you',
    description: 'The agent is paused until you save credentials or dismiss the request.',
    tone: 'pending',
  },
  submitted: {
    label: 'Credentials saved',
    description: 'Stored encrypted. The agent was given the credential to use, not its contents.',
    tone: 'success',
  },
  cancelled: {
    label: 'Dismissed',
    description: 'You declined this request. The agent was told to carry on without credentials.',
    tone: 'neutral',
  },
  expired: {
    label: 'Expired',
    description: 'This request timed out. The agent will ask again if it still needs credentials.',
    tone: 'warning',
  },
}

/** Suffix naming the credential a submitted capture produced. */
export const CAPTURE_CREDENTIAL_NAME_PREFIX = 'Saved as'
