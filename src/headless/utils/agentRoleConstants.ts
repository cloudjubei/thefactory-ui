/**
 * What each agent role is called wherever a role is named — a sign-off's
 * "Run by" chips, a process step's role. A role not listed reads as itself.
 */
export const AGENT_ROLE_LABELS: Readonly<Record<string, string>> = {
  developer: 'developer',
  'developer-verifier': 'developer + verifier',
  fixer: 'fixer',
  verifier: 'verifier',
  capture: 'capture agent',
  judge: 'code reviewer',
  report: 'report writer',
  remedy: 'remedy agent',
}
