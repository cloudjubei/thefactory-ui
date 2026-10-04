import { AGENT_ROLE_LABELS } from './agentRoleConstants'

/** An agent role as people read it: `developer-verifier` is "developer + verifier". */
export function agentRoleLabel(role: string): string {
  return AGENT_ROLE_LABELS[role] ?? role
}
