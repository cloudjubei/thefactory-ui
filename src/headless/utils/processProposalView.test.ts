import { describe, expect, it } from 'vitest'
import type { ProcessProposal } from 'thefactory-tools/types'
import { processProposalView } from './processProposalView'

function proposal(): ProcessProposal {
  return {
    processId: 'story-default',
    name: 'Story: feature by feature',
    steps: [
      {
        id: 'features:f1',
        name: 'Bundled fonts drive the Compose UI',
        kind: 'process',
        agent: false,
        subject: { kind: 'feature', id: 'f1', title: 'Bundled fonts drive the Compose UI' },
        maxIterations: 3,
        children: [
          { id: 'implement', name: 'Implement', kind: 'agent', agent: true },
          { id: 'verify', name: 'Verify', kind: 'agent', agent: true },
          { id: 'report', name: 'Report', kind: 'report', agent: false },
        ],
      },
      {
        id: 'features:f2',
        name: 'WebView HTML uses the bundled fonts',
        kind: 'process',
        agent: false,
        subject: { kind: 'feature', id: 'f2', title: 'WebView HTML uses the bundled fonts' },
        maxIterations: 3,
        children: [
          { id: 'implement', name: 'Implement', kind: 'agent', agent: true },
          { id: 'verify', name: 'Verify', kind: 'agent', agent: true },
          { id: 'report', name: 'Report', kind: 'report', agent: false },
        ],
      },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate', agent: false },
    ],
  }
}

describe('processProposalView', () => {
  it('splits feature rows from the story-level tail', () => {
    const view = processProposalView(proposal())
    expect(view.features.map((f) => f.id)).toEqual(['f1', 'f2'])
    expect(view.tail.map((t) => t.id)).toEqual(['sign-off'])
  })

  it('carries each feature its pipeline chain, marking only the agent steps', () => {
    const view = processProposalView(proposal())
    const chain = view.features[0]!.chain
    expect(chain.map((c) => c.name)).toEqual(['Implement', 'Verify', 'Report'])
    expect(chain.map((c) => c.agent)).toEqual([true, true, false])
  })

  it('counts every step across the plan where a model runs — the cost shape', () => {
    // Two features × two agent steps each = 4. The gate and reports spend nothing.
    expect(processProposalView(proposal()).agentStepCount).toBe(4)
  })

  it('surfaces the per-feature retry cap for the dock', () => {
    expect(processProposalView(proposal()).features[0]!.maxIterations).toBe(3)
  })

  it('renders a feature whose nested definition was unresolved as an empty chain, not a crash', () => {
    const p = proposal()
    delete p.steps[0]!.children
    delete p.steps[0]!.maxIterations
    const view = processProposalView(p)
    expect(view.features[0]!.chain).toEqual([])
    expect(view.features[0]!.maxIterations).toBeUndefined()
    // The row is still there, still named — only its interior is unknown.
    expect(view.features[0]!.title).toBe('Bundled fonts drive the Compose UI')
  })

  describe('a step that runs only when work is sent back to it', () => {
    const withFix = (): ProcessProposal => {
      const p = proposal()
      p.steps.splice(2, 0, {
        id: 'fix',
        name: 'Fix',
        kind: 'process',
        agent: false,
        onlyWhenSentBack: true,
        children: [
          { id: 'implement', name: 'Fix', kind: 'agent', agent: true },
          { id: 'code-review', name: 'Code review', kind: 'judge', agent: true },
          { id: 'verify', name: 'Verify', kind: 'agent', agent: true },
        ],
      })
      return p
    }

    it('says so on its chip', () => {
      expect(processProposalView(withFix()).tail.map((t) => [t.id, t.name, t.agent])).toEqual([
        ['fix', 'Fix — only if sent back', false],
        ['sign-off', 'Sign-off', false],
      ])
    })

    it('leaves its steps out of the agent steps the plan is sure to run', () => {
      expect(processProposalView(withFix()).agentStepCount).toBe(4)
    })
  })
})
