import { AGENT_RUN_TYPES } from 'thefactory-tools/constants'
import { describe, expect, it } from 'vitest'

import { agentRoleLabel } from './agentRole'

describe('agentRoleLabel', () => {
  it('names the self-verifying developer as both roles it plays', () => {
    expect(agentRoleLabel('developer-verifier')).toBe('developer + verifier')
  })

  it('names every role an agent run can be launched as', () => {
    for (const role of AGENT_RUN_TYPES) {
      expect(agentRoleLabel(role)).not.toContain('-')
    }
  })

  it('reads a role it does not know as itself', () => {
    expect(agentRoleLabel('code reviewer')).toBe('code reviewer')
    expect(agentRoleLabel('planner')).toBe('planner')
  })
})
