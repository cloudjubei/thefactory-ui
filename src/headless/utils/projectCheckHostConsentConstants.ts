/** Broker action kind for the first host-fallback ask of a project. */
export const PROJECT_CHECK_HOST_CONSENT_KIND = 'project-check-host-consent'

/** Card title while a run waits for host-check consent. */
export const PROJECT_CHECK_HOST_CONSENT_TITLE = 'Allow host checks for this project'

/** Lead line on the park card before the command list. */
export const PROJECT_CHECK_HOST_CONSENT_LEAD =
  'These checks cannot run in the sandbox and would run on this machine:'

/** The approve button / park choice for this ask. */
export const PROJECT_CHECK_HOST_CONSENT_ALLOW = 'Allow for this project'

/** What the waiting heading says after the agent label. */
export const PROJECT_CHECK_HOST_CONSENT_HEADING = 'needs host checks allowed'

/** What a Needs-you / attention line says after "Approve:". */
export const PROJECT_CHECK_HOST_CONSENT_NEED = 'host checks on this machine'

/** Tool-ask card copy. */
export const PROJECT_CHECK_HOST_CONSENT_ASK = {
  ask: 'Checks need to run on this machine',
  tag: 'Host checks',
  consequence:
    'Later checks for this project may run on the host without asking again. Revoke it in project settings.',
  verb: PROJECT_CHECK_HOST_CONSENT_ALLOW,
} as const

/** Project settings copy. */
export const PROJECT_CHECK_HOST_CONSENT_SETTINGS = {
  title: 'Host checks',
  lead: 'Whether this project’s checks may fall back from the sandbox to the machine running Overseer.',
  allowed: 'Host checks are allowed for this project.',
  notAllowed:
    'Host checks are not allowed. The first time checks must run on this machine, the run parks and asks — with the exact commands listed.',
  note: 'Allow is granted from that park card, once per project. It never expires on its own.',
  revoke: 'Revoke',
  revoking: 'Revoking…',
  loadFailed: 'Could not read this setting.',
  revokeFailed: 'Could not revoke this setting. Try again.',
  retry: 'Try again',
} as const
