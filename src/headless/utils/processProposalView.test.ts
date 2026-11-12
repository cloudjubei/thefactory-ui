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

describe('processProposalView — the capture device', () => {
  const steps = [
    {
      id: 'f',
      name: 'Feature',
      kind: 'process',
      agent: false,
      subject: { kind: 'feature', id: 'f1' },
      children: [
        { id: 'dev', name: 'Implement', kind: 'agent', agent: true, agentRole: 'developer' },
        { id: 'cap', name: 'Capture', kind: 'capture', agent: false },
        { id: 'ver', name: 'Verify', kind: 'agent', agent: true, agentRole: 'verifier' },
        { id: 'both', name: 'Build', kind: 'agent', agent: true, agentRole: 'developer-verifier' },
      ],
    },
    { id: 'sign', name: 'Sign-off', kind: 'gate', agent: false },
  ] as ProcessProposal['steps']

  it('names it on the steps that drive it, and no others', () => {
    const view = processProposalView({ ...proposal(), steps, captureTarget: 'android' })
    expect(view.features[0]?.chain.map((c) => c.device)).toEqual([
      undefined,
      'Android emulator',
      'Android emulator',
      'Android emulator',
    ])
    expect(view.tail[0]?.device).toBeUndefined()
    expect(view.deviceLine).toBe('Captures on Android emulator')
  })

  it.each([
    ['ios', 'Captures on iOS simulator'],
    ['web', 'Captures on Web browser'],
  ] as const)('reads %s', (captureTarget, line) => {
    expect(processProposalView({ ...proposal(), steps, captureTarget }).deviceLine).toBe(line)
  })

  it('names none when the host could not tell', () => {
    const view = processProposalView({ ...proposal(), steps })
    expect(view.deviceLine).toBeUndefined()
    expect(view.features[0]?.chain.some((c) => c.device !== undefined)).toBe(false)
  })
})

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

describe('processProposalView — a live check step', () => {
  it('carries each step’s kind, and marks the live check', () => {
    const base = proposal()
    const first = base.steps[0]!
    const view = processProposalView({
      ...base,
      steps: [
        {
          ...first,
          children: [
            ...(first.children ?? []).slice(0, 2),
            {
              id: 'live-check',
              name: 'Live check',
              kind: 'agent',
              agent: true,
              liveCheck: { mode: 'required' },
            },
            ...(first.children ?? []).slice(2),
          ],
        },
      ],
    })
    const chain = view.features[0]?.chain ?? []
    expect(chain.map((c) => c.stepKind)).toEqual(['agent', 'agent', 'agent', 'report'])
    expect(chain.filter((c) => c.liveCheck).map((c) => c.id)).toEqual(['live-check'])
  })
})
