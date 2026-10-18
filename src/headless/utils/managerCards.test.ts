import { describe, expect, it } from 'vitest'
import type {
  ProcessManagerBriefCard,
  ProcessManagerEscalationCard,
  ProcessManagerInterventionCard,
  ProcessManagerPreReadCard,
} from 'thefactory-tools/types'
import { managerBriefView, managerEscalationView, managerOutcomeView } from './managerCards'

const brief = (over: Partial<ProcessManagerBriefCard> = {}): ProcessManagerBriefCard => ({
  kind: 'brief',
  mode: 'triage',
  runId: 'r1',
  parkedAt: Date.parse('2026-10-12T10:39:00Z'),
  stepName: 'Verify',
  reason: 'step-unchecked',
  message: 'The proof plan asks for screens.',
  failed: ['proof: screens'],
  answers: [
    { choice: 'retry', label: 'Retry with a note', detail: 'Runs it again.' },
    { choice: 'resolved', label: 'Hand it to the person', detail: 'Stops here.' },
  ],
  tried: ['Retried with a note — Did not help'],
  triesUsed: 2,
  triesMax: 8,
  ...over,
})

describe('managerBriefView', () => {
  it('reads a triage as the step that stopped, with its answers and tries', () => {
    const view = managerBriefView(brief())
    expect(view).toMatchObject({
      line: 'Verify stopped — settle it if you can.',
      mode: 'Triage',
      stopped: 'Verify — The proof plan asks for screens.',
      failed: ['proof: screens'],
      answers: [
        { key: 'retry', label: 'Retry with a note' },
        { key: 'resolved', label: 'Hand it to the person' },
      ],
      tried: 'Retried with a note — Did not help',
      tries: '2 of 8',
      triesShare: 0.25,
      limits: 'at most 2 on one problem, 4 on one step',
    })
    expect(view.stopLine.startsWith('Verify stopped · ')).toBe(true)
  })

  it('carries the flag of a step going in circles, and nothing without one', () => {
    const circling = {
      summary: 'Going in circles: ran out of turns (50 of 50); changed nothing.',
      signals: ['no-change' as const],
      ranOut: true,
      streak: 1,
      at: 1,
    }
    expect(managerBriefView(brief({ circling })).circling?.headline).toBe(
      'Ran out of turns; changed nothing.',
    )
    expect(managerBriefView(brief())).not.toHaveProperty('circling')
  })

  it('reads a pre-read as the sign-off waiting for the person', () => {
    const view = managerBriefView(brief({ mode: 'pre-read', stepName: 'Sign-off', message: '' }))
    expect(view.mode).toBe('Pre-read')
    expect(view.line).toBe(
      'Read the change, checks and review; file a short pre-read. Never decide.',
    )
    expect(view.stopLine.startsWith('Sign-off waits for you · ')).toBe(true)
    expect(view.stopped).toBe('Sign-off')
  })

  it('says nothing was tried yet, and keeps the share within the meter', () => {
    const view = managerBriefView(brief({ mode: 'diagnose', tried: [], triesUsed: 9, triesMax: 8 }))
    expect(view.line).toBe('Verify stopped — find the cause and hand it on.')
    expect(view.tried).toBe('Nothing yet on this step.')
    expect(view.triesShare).toBe(1)
  })

  it('reads a run with no tries to give as an empty meter', () => {
    expect(managerBriefView(brief({ triesUsed: 0, triesMax: 0 })).triesShare).toBe(0)
  })
})

const intervention = (stepName?: string): ProcessManagerInterventionCard => ({
  kind: 'intervention',
  intervention: {
    id: 'i1',
    at: 1,
    runId: 'r1',
    parkedAt: 1,
    signature: 's',
    tool: 'answerRunPark',
    move: 'answer-park',
    what: 'Accepted Verify inside Fix',
    why: 'No screen renders this change.',
    outcome: 'pending',
    actionKey: 'k',
    targetKey: 't',
  },
  ...(stepName ? { stepName } : {}),
})

const preRead = (items: number): ProcessManagerPreReadCard => ({
  kind: 'pre-read',
  preRead: {
    runId: 'r1',
    parkedAt: 1,
    at: 2,
    summary: 'Nothing blocks the change itself.',
    items: Array.from({ length: items }, (_, i) => ({
      itemId: `ny-${i}`,
      finding: `Finding ${i}.`,
      recommendation: `Do ${i}.`,
    })),
  },
})

describe('managerOutcomeView', () => {
  it('reads what the manager did as handled, with why and the call it made on the step', () => {
    expect(managerOutcomeView(intervention('Verify'))).toEqual({
      headline: 'Accepted Verify inside Fix',
      tone: 'handled',
      pill: 'Handled',
      why: 'No screen renders this change.',
      open: [],
      did: 'answerRunPark on Verify',
    })
  })

  it('names only the call when the step is not known', () => {
    expect(managerOutcomeView(intervention()).did).toBe('answerRunPark')
  })

  it('reads a pre-read that leaves items as needing the person, each with its recommendation', () => {
    expect(managerOutcomeView(preRead(2))).toEqual({
      headline: 'Filed the sign-off pre-read',
      tone: 'needs-you',
      pill: '2 need you',
      why: 'Nothing blocks the change itself.',
      open: [
        { id: 'ny-0', text: 'Finding 0. Recommended: Do 0.' },
        { id: 'ny-1', text: 'Finding 1. Recommended: Do 1.' },
      ],
      did: 'fileSignOffPreRead',
    })
  })

  it('says one item needs the person in the singular', () => {
    expect(managerOutcomeView(preRead(1)).pill).toBe('1 needs you')
  })

  it('reads a pre-read that leaves nothing as handled', () => {
    expect(managerOutcomeView(preRead(0))).toMatchObject({ tone: 'handled', pill: 'Handled' })
  })
})

describe('managerEscalationView', () => {
  const card: ProcessManagerEscalationCard = {
    kind: 'escalation',
    escalation: {
      runId: 'r1',
      parkedAt: 1,
      at: 2,
      signature: 's',
      why: 'repeated-failure',
      what: 'Checks failed twice.\nunit: stash › dirty tree',
      found: 'The fixture leaves a staged file.',
      tried: ['Brought base in — Did not help'],
      recommendation: 'Retry with a fresh agent.',
    },
  }

  it('heads a step that keeps going in circles as such', () => {
    const circling = { ...card, escalation: { ...card.escalation, why: 'circling' as const } }
    expect(managerEscalationView(circling).headline).toBe('It keeps going in circles')
  })

  it('heads the card by why it is the person’s, with what happened, was found and tried', () => {
    expect(managerEscalationView(card)).toEqual({
      title: 'The manager needs you',
      headline: 'What the manager tried did not help',
      what: 'Checks failed twice.\nunit: stash › dirty tree',
      found: 'The fixture leaves a staged file.',
      tried: ['Brought base in — Did not help'],
      recommendation: 'Retry with a fresh agent.',
    })
  })

  it('heads a turn that never started with why it could not start', () => {
    expect(
      managerEscalationView({
        ...card,
        escalation: { ...card.escalation, why: 'not-started', startError: 'the session failed' },
      }).headline,
    ).toBe('The manager couldn’t start: the session failed')
  })
})

describe('managerOutcomeView with where things stand now', () => {
  it('reads how the intervention came out since, with its result', () => {
    const live = {
      ...intervention('Verify').intervention,
      outcome: 'settled' as const,
      result: 'Fix passed',
    }
    expect(managerOutcomeView(intervention('Verify'), { intervention: live })).toMatchObject({
      pill: 'Settled',
      result: 'Fix passed',
      tone: 'handled',
    })
  })

  it('says the person undid it once they did', () => {
    const live = { ...intervention().intervention, outcome: 'reversed' as const }
    const view = managerOutcomeView(intervention(), { intervention: live })
    expect(view.pill).toBe('You undid it')
    expect(view.result).toBeUndefined()
  })

  it('reads an intervention the run no longer keeps as posted', () => {
    expect(managerOutcomeView(intervention(), {}).pill).toBe('Handled')
  })

  it('counts only the items still open, and says how the others were settled', () => {
    const view = managerOutcomeView(preRead(2), { settled: { 'ny-0': 'Fine as it is — noted' } })
    expect(view).toMatchObject({ tone: 'needs-you', pill: '1 needs you' })
    expect(view.open).toEqual([
      { id: 'ny-0', text: 'Finding 0. Recommended: Do 0.', settled: 'Fine as it is — noted' },
      { id: 'ny-1', text: 'Finding 1. Recommended: Do 1.' },
    ])
  })

  it('reads a pre-read whose items were all settled as handled', () => {
    expect(managerOutcomeView(preRead(1), { settled: { 'ny-0': 'Left for later' } })).toMatchObject(
      { tone: 'handled', pill: 'Handled' },
    )
  })

  it('reads a pre-read whose sign-off was decided as handled, with how it was', () => {
    const closure = { tone: 'handled' as const, line: 'Decided — you approved it · 19:20' }
    expect(managerOutcomeView(preRead(2), { settled: {}, closure })).toMatchObject({
      tone: 'handled',
      pill: 'Handled',
      closure,
    })
  })
})

describe('managerEscalationView with where the park stands now', () => {
  const card: ProcessManagerEscalationCard = {
    kind: 'escalation',
    escalation: {
      runId: 'r1',
      parkedAt: 1,
      at: 2,
      signature: 's',
      why: 'permission',
      what: 'The fixer needs network access to starcraft-tmg.com',
      found: 'Not on the standard list.',
      tried: [],
      recommendation: 'Allow it.',
    },
  }

  it('carries how the park was closed once it was', () => {
    const closure = { tone: 'handled' as const, line: 'Handled — you allowed it on web · 19:20' }
    expect(managerEscalationView(card, { state: 'closed', closure }).closure).toEqual(closure)
  })

  it('carries no closure while the park is open', () => {
    expect(managerEscalationView(card, { state: 'open' }).closure).toBeUndefined()
  })

  it('carries no closure while the run is not read', () => {
    expect(managerEscalationView(card, { state: 'unknown' }).closure).toBeUndefined()
  })
})
