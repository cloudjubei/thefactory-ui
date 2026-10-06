// Which "how do I get this?" help a capture form shows. Pure: it reads the
// capture's kind and what is typed into the form so far, so the help follows a
// tracker, provider or git host the user changes.

import {
  AZURE_DEVOPS_GIT_TOKEN_HELP,
  GITHUB_GIT_TOKEN_HELP,
  GITHUB_ISSUES_TOKEN_HELP,
  GITLAB_GIT_TOKEN_HELP,
  JIRA_TOKEN_HELP,
  LLM_KEY_HELP,
  OTHER_GIT_TOKEN_STEPS,
  OTHER_GIT_TOKEN_TITLE,
  OTHER_LLM_KEY_HELP,
  WEB_SEARCH_KEY_HELP,
} from './credentialCaptureHelpConstants'
import type {
  CredentialCapture,
  CredentialCaptureFormValues,
  CredentialHelp,
} from './credentialCaptureTypes'

function gitHostHelp(rawHost: string | undefined): CredentialHelp {
  const host = (rawHost ?? '').trim().toLowerCase()
  if (host === '' || host.endsWith('github.com')) return GITHUB_GIT_TOKEN_HELP
  if (host.endsWith('gitlab.com')) return GITLAB_GIT_TOKEN_HELP
  if (host.endsWith('dev.azure.com') || host.endsWith('visualstudio.com')) {
    return AZURE_DEVOPS_GIT_TOKEN_HELP
  }
  return {
    title: OTHER_GIT_TOKEN_TITLE,
    steps: OTHER_GIT_TOKEN_STEPS.map((step) => step.replaceAll('{host}', host)),
  }
}

/**
 * How to get the secret this form asks for, or nothing when the user already
 * holds it (a secret note) or the card runs the sign-in itself (a CLI login).
 */
export function captureHelp(
  capture: CredentialCapture,
  values: CredentialCaptureFormValues,
): CredentialHelp | undefined {
  switch (capture.provider) {
    case 'ticket-connection':
      return values.provider === 'github' ? GITHUB_ISSUES_TOKEN_HELP : JIRA_TOKEN_HELP
    case 'git':
      return gitHostHelp(values.host)
    case 'web-search-key':
      return WEB_SEARCH_KEY_HELP[values.provider ?? '']
    case 'llm-key':
      return LLM_KEY_HELP[values.provider ?? ''] ?? OTHER_LLM_KEY_HELP
    default:
      return undefined
  }
}
