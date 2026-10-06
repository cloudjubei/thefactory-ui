import type { CredentialHelp } from './credentialCaptureTypes'

const GITHUB_FINE_GRAINED_TOKENS = 'https://github.com/settings/personal-access-tokens/new'

export const JIRA_TOKEN_HELP: CredentialHelp = {
  title: 'How do I get a Jira API token?',
  link: {
    label: 'Open Atlassian API tokens',
    url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  steps: [
    'Open Atlassian API tokens and sign in with the account the agent should work as — it can see and do exactly what that account can in Jira.',
    'Choose "Create API token" (not "Create API token with scopes"), name it, e.g. "Overseer", pick an expiry, and create it.',
    'Copy the token straight away — Atlassian shows it only once — and paste it into API token.',
    'Account email is the email you sign in to Atlassian with. Site URL is the address you open Jira at, e.g. https://your-company.atlassian.net.',
  ],
}

export const GITHUB_ISSUES_TOKEN_HELP: CredentialHelp = {
  title: 'How do I get a GitHub token for issues?',
  link: { label: 'Open GitHub fine-grained tokens', url: GITHUB_FINE_GRAINED_TOKENS },
  steps: [
    'Name the token and pick an expiry. Set Resource owner to you, or to the organisation that owns the repositories.',
    'Under Repository access choose the repositories whose issues you want; under Permissions give Issues "Read-only".',
    'Generate it, copy the token — GitHub shows it only once — and paste it into API token.',
    'Want every repository you can see in one token? A classic token with the repo scope (Settings → Developer settings → Tokens (classic)) covers them all.',
  ],
}

export const GITHUB_GIT_TOKEN_HELP: CredentialHelp = {
  title: 'How do I get a GitHub personal access token?',
  link: { label: 'Open GitHub fine-grained tokens', url: GITHUB_FINE_GRAINED_TOKENS },
  steps: [
    'Name the token and pick an expiry. Set Resource owner to you, or to the organisation that owns the repositories.',
    'Under Repository access pick the repositories the agent will work in; under Permissions give Contents "Read and write".',
    'Generate it, copy the token — GitHub shows it only once — and paste it into Personal access token.',
    'Username is your GitHub username; Email is the address your commits should carry.',
  ],
}

export const GITLAB_GIT_TOKEN_HELP: CredentialHelp = {
  title: 'How do I get a GitLab personal access token?',
  link: {
    label: 'Open GitLab access tokens',
    url: 'https://gitlab.com/-/user_settings/personal_access_tokens',
  },
  steps: [
    'Choose "Add new token", name it and pick an expiry.',
    'Select the scopes read_repository and write_repository, then create it.',
    'Copy the token — GitLab shows it only once — and paste it into Personal access token. Username is your GitLab username.',
  ],
}

export const AZURE_DEVOPS_GIT_TOKEN_HELP: CredentialHelp = {
  title: 'How do I get an Azure DevOps personal access token?',
  steps: [
    'In Azure DevOps, open User settings (the person icon, top right) → Personal access tokens → New Token.',
    'Pick the organisation, name the token, set an expiry, and under Scopes give Code "Read & write".',
    'Create it, copy the token — it is shown only once — and paste it into Personal access token.',
  ],
}

/** For a git host without steps of its own; `{host}` is the host the user typed. */
export const OTHER_GIT_TOKEN_STEPS = [
  'On {host}, create a personal access token that can read and write repositories.',
  'Copy it and paste it into Personal access token, with the username you sign in to {host} with.',
] as const

export const OTHER_GIT_TOKEN_TITLE = 'How do I get a personal access token?'

export const WEB_SEARCH_KEY_HELP: Readonly<Record<string, CredentialHelp>> = {
  tavily: {
    title: 'How do I get a Tavily API key?',
    link: { label: 'Open the Tavily dashboard', url: 'https://app.tavily.com' },
    steps: [
      'Sign in or create an account — there is a free plan.',
      'Your API key is on the dashboard’s home page: copy it and paste it into API key.',
    ],
  },
  exa: {
    title: 'How do I get an Exa API key?',
    link: { label: 'Open Exa API keys', url: 'https://dashboard.exa.ai/api-keys' },
    steps: [
      'Sign in or create an account.',
      'Create a key on the API keys page, copy it, and paste it into API key.',
    ],
  },
  serpapi: {
    title: 'How do I get a SerpAPI key?',
    link: { label: 'Open SerpAPI keys', url: 'https://serpapi.com/manage-api-key' },
    steps: [
      'Sign in or create an account — there is a free plan.',
      'Your private API key is shown on that page: copy it and paste it into API key.',
    ],
  },
}

export const LLM_KEY_HELP: Readonly<Record<string, CredentialHelp>> = {
  openai: {
    title: 'How do I get an OpenAI API key?',
    link: { label: 'Open OpenAI API keys', url: 'https://platform.openai.com/api-keys' },
    steps: [
      'Choose "Create new secret key" and name it.',
      'Copy the key — it is shown only once — and paste it into API key. The account needs billing set up for the key to work.',
    ],
  },
  anthropic: {
    title: 'How do I get an Anthropic API key?',
    link: {
      label: 'Open the Anthropic Console',
      url: 'https://console.anthropic.com/settings/keys',
    },
    steps: [
      'Choose "Create Key" and name it.',
      'Copy the key — it is shown only once — and paste it into API key. The organisation needs credits for the key to work.',
    ],
  },
  gemini: {
    title: 'How do I get a Gemini API key?',
    link: { label: 'Open Google AI Studio', url: 'https://aistudio.google.com/app/apikey' },
    steps: ['Choose "Create API key".', 'Copy the key and paste it into API key.'],
  },
  deepseek: {
    title: 'How do I get a DeepSeek API key?',
    link: { label: 'Open DeepSeek API keys', url: 'https://platform.deepseek.com/api_keys' },
    steps: [
      'Choose "Create new API key" and name it.',
      'Copy the key — it is shown only once — and paste it into API key.',
    ],
  },
  xai: {
    title: 'How do I get an xAI API key?',
    link: { label: 'Open the xAI Console', url: 'https://console.x.ai' },
    steps: ['Open API Keys and create a key.', 'Copy the key and paste it into API key.'],
  },
}

export const OTHER_LLM_KEY_HELP: CredentialHelp = {
  title: 'How do I get an API key?',
  steps: [
    'Create an API key in your provider’s console, copy it, and paste it into API key.',
    'Model is the provider’s model id. For a self-hosted or OpenAI-compatible server, put its base URL in API URL override.',
  ],
}
