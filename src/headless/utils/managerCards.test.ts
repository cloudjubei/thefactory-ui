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
})
