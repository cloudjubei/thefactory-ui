import type {
  CredentialCaptureFieldSpec,
  CredentialCaptureKind,
  CredentialCaptureStatus,
  CredentialCaptureStatusDisplay,
} from './credentialCaptureTypes'

/** WS topic carrying a capture record on open and on every resolution. */
export const CREDENTIAL_CAPTURE_EVENT = 'credentialCapture:updated'

/**
 * The agent tool that opens each kind of capture. The transcript row for the
 * tool is where the form is mounted, so these names are matched against
 * `toolCall.name`.
 */
export const CREDENTIAL_CAPTURE_TOOL_NAMES: Record<CredentialCaptureKind, string> = {
  git: 'requestGitCredentials',
  'ticket-connection': 'requestTicketConnection',
  'web-search-key': 'requestWebSearchKey',
  'llm-key': 'requestLlmApiKey',
  'cli-login': 'requestCliSignIn',
  'project-note': 'requestSecretNote',
}

/** The tool argument a capture's `purpose` is recorded from — the join between the two. */
export const CREDENTIAL_CAPTURE_PURPOSE_ARG = 'purpose'

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'llama', label: 'Llama' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
] as const

/** Each kind's form, in render order. */
export const CREDENTIAL_CAPTURE_FIELDS: Record<
  CredentialCaptureKind,
  readonly CredentialCaptureFieldSpec[]
> = {
  git: [
    { name: 'name', label: 'Name', placeholder: 'GitHub — personal', type: 'text' },
    { name: 'username', label: 'Username', placeholder: 'your-github-username', type: 'text' },
    { name: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email' },
    {
      name: 'host',
      label: 'Host (optional)',
      placeholder: 'dev.azure.com',
      type: 'text',
      optional: true,
    },
    { name: 'token', label: 'Personal access token', placeholder: 'ghp_…', type: 'secret' },
  ],
  'ticket-connection': [
    { name: 'name', label: 'Name', placeholder: 'Acme Jira', type: 'text' },
    {
      name: 'provider',
      label: 'Tracker',
      placeholder: 'Choose a tracker',
      type: 'select',
      fromPreset: true,
      options: [
        { value: 'jira', label: 'Jira Cloud' },
        { value: 'github', label: 'GitHub Issues' },
      ],
    },
    {
      name: 'username',
      label: 'Account email',
      placeholder: 'you@company.com',
      type: 'email',
      shownWhen: { field: 'provider', in: ['jira'] },
    },
    {
      name: 'baseUrl',
      label: 'Site URL',
      placeholder: 'https://your-domain.atlassian.net',
      type: 'text',
      shownWhen: { field: 'provider', in: ['jira'] },
    },
    { name: 'token', label: 'API token', placeholder: 'API token', type: 'secret' },
    {
      name: 'access',
      label: 'Give this project',
      placeholder: 'Choose access',
      type: 'select',
      optional: true,
      projectOnly: true,
      shownWhen: { field: 'provider', in: ['jira'] },
      options: [
        { value: '', label: 'No access yet' },
        { value: 'read', label: 'Read only' },
        { value: 'read-write', label: 'Read & write' },
      ],
    },
    {
      name: 'projectKeys',
      label: 'Limit to Jira projects (optional)',
      placeholder: 'ENG, OPS',
      type: 'text',
      optional: true,
      projectOnly: true,
      shownWhen: { field: 'access', in: ['read', 'read-write'] },
    },
  ],
  'web-search-key': [
    {
      name: 'provider',
      label: 'Provider',
      placeholder: 'Choose a provider',
      type: 'select',
      fromPreset: true,
      options: [
        { value: 'tavily', label: 'Tavily' },
        { value: 'exa', label: 'Exa' },
        { value: 'serpapi', label: 'SerpAPI' },
      ],
    },
    { name: 'apiKey', label: 'API key', placeholder: 'API key', type: 'secret' },
  ],
  'llm-key': [
    { name: 'name', label: 'Name', placeholder: 'OpenAI — work', type: 'text' },
    {
      name: 'provider',
      label: 'Provider',
      placeholder: 'Choose a provider',
      type: 'select',
      fromPreset: true,
      options: LLM_PROVIDERS,
    },
    { name: 'model', label: 'Model', placeholder: 'gpt-4o', type: 'text' },
    { name: 'apiKey', label: 'API key', placeholder: 'sk-…', type: 'secret' },
    {
      name: 'apiUrlOverride',
      label: 'API URL override (optional)',
      placeholder: 'https://…',
      type: 'text',
      optional: true,
    },
  ],
  'cli-login': [
    {
      name: 'cli',
      label: 'CLI agent',
      placeholder: 'Choose a CLI',
      type: 'select',
      fromPreset: true,
      newOnly: true,
      options: [
        { value: 'claude-code', label: 'Claude Code' },
        { value: 'cursor-agent', label: 'Cursor Agent' },
        { value: 'codex', label: 'Codex' },
      ],
    },
    {
      name: 'label',
      label: 'Name (optional)',
      placeholder: 'Claude Code — work',
      type: 'text',
      optional: true,
      newOnly: true,
    },
  ],
  'project-note': [
    { name: 'label', label: 'Name', placeholder: 'QA login', type: 'text', fromPreset: true },
    {
      name: 'description',
      label: 'What it is for (optional)',
      placeholder: 'The staging test account',
      type: 'text',
      optional: true,
    },
    { name: 'value', label: 'Secret', placeholder: 'The value', type: 'secret' },
  ],
}

/** Each kind's card heading. */
export const CAPTURE_CARD_TITLES: Record<CredentialCaptureKind, string> = {
  git: 'The agent needs your git credentials',
  'ticket-connection': 'The agent needs a ticket connection',
  'web-search-key': 'The agent needs a web-search key',
  'llm-key': 'The agent needs an LLM API key',
  'cli-login': 'The agent needs a CLI agent signed in',
  'project-note': 'The agent needs a secret for this project',
}

/** The heading of a card that gives a stored credential a new secret instead of adding one. */
export const CAPTURE_REPLACING_CARD_TITLE = 'The agent needs a new secret for a stored credential'

/** A kind's own heading for a card that replaces a stored credential, where the generic one misleads. */
export const CAPTURE_REPLACING_CARD_TITLES: Partial<Record<CredentialCaptureKind, string>> = {
  'cli-login': 'The agent needs a CLI login signed in again',
}

export const CAPTURE_FIELD_REQUIRED = 'Required.'

/**
 * The promise the whole feature rests on, stated where the user is typing:
 * what they enter goes to the encrypted store and never to the conversation.
 */
export const CAPTURE_CARD_PRIVACY_NOTE =
  'These go straight to your encrypted credential store. Nothing you type here enters the chat — the agent is only told which credential was created.'

/** The same promise on a sign-in card, where what is entered is the provider's sign-in code. */
export const CLI_SIGN_IN_PRIVACY_NOTE =
  'You sign in on the provider’s own page. The code you paste here goes straight to the sign-in and never enters the chat — the agent is only told which login is ready.'

export const CLI_SIGN_IN_START_LABEL = 'Sign in'

export const CLI_SIGN_IN_OPEN_LINK = 'Open the sign-in page ↗'

export const CLI_SIGN_IN_COPY_LINK = 'Copy link'

export const CLI_SIGN_IN_STARTING = 'Starting the sign-in…'

export const CLI_SIGN_IN_AUTHORIZE_HINT =
  'Authorize in your browser, then come back — this card updates by itself.'

export const CLI_SIGN_IN_CODE_LABEL = 'Paste the code shown after you authorize'

export const CLI_SIGN_IN_CODE_PLACEHOLDER = 'Paste code'

export const CLI_SIGN_IN_CODE_SUBMIT = 'Submit'

export const CLI_SIGN_IN_START_ERROR = 'Could not start the sign-in.'

export const CAPTURE_PURPOSE_LABEL = 'What for'

export const CAPTURE_SUBMIT_LABEL = 'Save'

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
}

/** A kind's own copy for a state, where the generic credential wording misleads. */
export const CAPTURE_STATUS_DISPLAY_BY_KIND: Partial<
  Record<
    CredentialCaptureKind,
    Partial<Record<CredentialCaptureStatus, CredentialCaptureStatusDisplay>>
  >
> = {
  'cli-login': {
    requested: {
      label: 'Waiting for you',
      description: 'The agent is paused until you sign in or dismiss the request.',
      tone: 'pending',
    },
    submitted: {
      label: 'Signed in',
      description: 'The login is ready. The agent was told which login to use, never its sign-in.',
      tone: 'success',
    },
  },
}

/** Suffix naming the credential a submitted capture produced. */
export const CAPTURE_CREDENTIAL_NAME_PREFIX = 'Saved as'
