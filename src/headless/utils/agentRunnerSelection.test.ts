import { describe, expect, it } from 'vitest'

import { agentRunnerSelectionUpdate } from './agentRunnerSelection'

const NOTHING_PICKED = { runnerKind: false, llmConfig: false }

describe('agentRunnerSelectionUpdate', () => {
  it('takes the runner and the config the server names', () => {
    expect(
      agentRunnerSelectionUpdate(
        { activeRunnerKind: 'cli', activeLlmConfigId: 'cfg-2' },
        NOTHING_PICKED,
      ),
    ).toEqual({ runnerKind: 'cli', llmConfigId: 'cfg-2' })
  })

  it('clears the config when the server names none — no config is stored', () => {
    expect(agentRunnerSelectionUpdate({}, NOTHING_PICKED)).toEqual({ llmConfigId: null })
  })

  it('keeps a config the person picked while the read was out', () => {
    expect(
      agentRunnerSelectionUpdate(
        { activeRunnerKind: 'api', activeLlmConfigId: 'cfg-old' },
        { runnerKind: false, llmConfig: true },
      ),
    ).toEqual({ runnerKind: 'api' })
  })

  it('keeps a runner the person picked while the read was out', () => {
    expect(
      agentRunnerSelectionUpdate(
        { activeRunnerKind: 'api', activeLlmConfigId: 'cfg-1' },
        { runnerKind: true, llmConfig: false },
      ),
    ).toEqual({ llmConfigId: 'cfg-1' })
  })

  it('changes nothing when the read failed', () => {
    expect(agentRunnerSelectionUpdate(undefined, NOTHING_PICKED)).toEqual({})
  })
})
