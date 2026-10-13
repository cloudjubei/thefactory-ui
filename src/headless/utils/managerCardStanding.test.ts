import { describe, expect, it } from 'vitest'
import type {
  ProcessLedgerEntry,
  ProcessManagerEscalation,
  ProcessManagerIntervention,
  ProcessManagerPreRead,
} from 'thefactory-tools/types'
import {
  managerEscalationStanding,
  managerInterventionStanding,
  managerPreReadStanding,
} from './managerCardStanding'
import type { ParkStandingRun } from './processParkStandingTypes'
import { formatFriendlyTimestamp } from './time'

const PARKED = Date.parse('2026-10-13T18:00:00Z')
const ANSWERED = Date.parse('2026-10-13T18:20:00Z')
const at = (ms: number) => formatFriendlyTimestamp(new Date(ms).toISOString())

const escalation = (over: Partial<ProcessManagerEscalation> = {}): ProcessManagerEscalation => ({
  runId: 'leaf',
  parkedAt: PARKED,
  at: PARKED + 1000,
  signature: 's',
  why: 'permission',
  what: 'The fixer needs network access to starcraft-tmg.com',
  found: 'Not on the standard list.',
  tried: [],
  recommendation: 'Allow it.',
  ...over,
})

const entry = (over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: 'e1',
  stepId: 'fix',
  iteration: 1,
  status: 'running',
  startedAt: PARKED - 5000,
  ...over,
})

const run = (over: Partial<ParkStandingRun> = {}): ParkStandingRun => ({
  id: 'leaf',
  projectId: 'p1',
  status: 'running',
  ledger: [],
  ...over,
})

const parkedAt = (parkedAtMs: number): Partial<ParkStandingRun> => ({
  status: 'parked',
  park: { reason: 'step-waiting', stepId: 'fix', message: 'waiting', parkedAt: parkedAtMs },
})

describe('managerEscalationStanding', () => {
  it('knows nothing while the run holding the park is not read', () => {
    expect(managerEscalationStanding(escalation(), undefined, undefined)).toEqual({
      state: 'unknown',
    })
  })

  it('stays open while the run still waits at the park it was raised on', () => {
    const holder = run(parkedAt(PARKED))
    expect(managerEscalationStanding(escalation(), holder, holder)).toEqual({ state: 'open' })
  })

  it('stays open when the root keeps no card of its own for the park', () => {
    const root = run({ id: 'root', manager: {} })
    expect(managerEscalationStanding(escalation(), root, run(parkedAt(PARKED)))).toEqual({
      state: 'open',
    })
  })

  it('reads a newer card on the same park as superseding it', () => {
    const root = run({
      id: 'root',
      manager: { escalation: escalation({ at: PARKED + 9000 }) },
    })
    expect(managerEscalationStanding(escalation(), root, run(parkedAt(PARKED)))).toEqual({
      state: 'closed',
      closure: { tone: 'superseded', line: 'Superseded — the manager raised a newer card' },
    })
  })

  it('keeps the card open when the root’s card is its own', () => {
    const root = run({ id: 'root', manager: { escalation: escalation() } })
    expect(managerEscalationStanding(escalation(), root, run(parkedAt(PARKED)))).toEqual({
      state: 'open',
    })
  })

  it('reads a newer card on another park as no concern of this one', () => {
    const root = run({
      id: 'root',
      manager: { escalation: escalation({ runId: 'other', at: PARKED + 9000 }) },
    })
    expect(managerEscalationStanding(escalation(), root, run(parkedAt(PARKED)))).toEqual({
      state: 'open',
    })
  })

  it('reads a newer card on an earlier park of the same run as no concern of this one', () => {
    const root = run({
      id: 'root',
      manager: { escalation: escalation({ parkedAt: PARKED - 1, at: PARKED + 9000 }) },
    })
    expect(managerEscalationStanding(escalation(), root, run(parkedAt(PARKED)))).toEqual({
      state: 'open',
    })
  })

  it('closes with the answer once the run left the park, newer card or not', () => {
    const holder = run({
      ledger: [entry({ override: { choice: 'allow', at: ANSWERED, decidedBy: 'person' } })],
    })
    const root = run({ id: 'root', manager: { escalation: escalation({ at: PARKED + 9000 }) } })
    expect(managerEscalationStanding(escalation(), root, holder)).toEqual({
      state: 'closed',
      closure: { tone: 'handled', line: `Handled — you allowed it · ${at(ANSWERED)}` },
    })
  })
})

const intervention = (
  over: Partial<ProcessManagerIntervention> = {},
): ProcessManagerIntervention => ({
  id: 'i1',
  at: 1,
  runId: 'leaf',
  parkedAt: 1,
  signature: 's',
  tool: 'answerRunPark',
  move: 'answer-park',
  what: 'Retried Fix with a brief',
  why: 'Out of turns.',
  outcome: 'pending',
  actionKey: 'k',
  targetKey: 't',
  ...over,
})

describe('managerInterventionStanding', () => {
  it('reads the intervention as the run keeps it now', () => {
    const live = intervention({ outcome: 'settled', result: 'Fix passed' })
    expect(
      managerInterventionStanding(intervention(), run({ manager: { interventions: [live] } })),
    ).toEqual({ intervention: live })
  })

  it('knows nothing while the run is not read', () => {
    expect(managerInterventionStanding(intervention(), undefined)).toEqual({})
  })

  it('knows nothing when the run no longer keeps it', () => {
    expect(
      managerInterventionStanding(
        intervention(),
        run({ manager: { interventions: [intervention({ id: 'other' })] } }),
      ),
    ).toEqual({})
  })
})

const preRead = (over: Partial<ProcessManagerPreRead> = {}): ProcessManagerPreRead => ({
  runId: 'leaf',
  parkedAt: PARKED,
  at: PARKED + 10,
  summary: 'Fine.',
  items: [{ itemId: 'ny-1', finding: 'F.', recommendation: 'R.' }],
  ...over,
})

const gate = (parkedAtMs: number): Partial<ParkStandingRun> => ({
  status: 'parked',
  park: { reason: 'gate', stepId: 'signoff', message: 'Sign off', parkedAt: parkedAtMs },
})

describe('managerPreReadStanding', () => {
  it('knows nothing while the run at the sign-off is not read', () => {
    expect(managerPreReadStanding(preRead(), undefined)).toEqual({ settled: {} })
  })

  it('leaves every item open while the sign-off waits and nothing is settled', () => {
    expect(managerPreReadStanding(preRead(), run(gate(PARKED)))).toEqual({ settled: {} })
  })

  it('says how each settled item was settled', () => {
    const holder = run({
      ...gate(PARKED),
      needsYouResolutions: {
        'ny-1': { itemId: 'ny-1', text: 'x', kind: 'deferred', summary: 'next sprint', at: 5 },
      },
    })
    expect(managerPreReadStanding(preRead(), holder)).toEqual({
      settled: { 'ny-1': 'Left for later: next sprint' },
    })
  })

  it('says the sign-off was decided, by whom and when, once it was', () => {
    const holder = run({
      status: 'succeeded',
      ledger: [
        entry({
          stepId: 'signoff',
          override: { choice: 'approve', at: ANSWERED, decidedBy: 'person', decidedVia: 'mobile' },
        }),
      ],
    })
    expect(managerPreReadStanding(preRead(), holder)).toEqual({
      settled: {},
      closure: { tone: 'handled', line: `Decided — you approved it on mobile · ${at(ANSWERED)}` },
    })
  })

  it('reads a sign-off that went away undecided as superseded', () => {
    expect(managerPreReadStanding(preRead(), run({ status: 'cancelled' }))).toEqual({
      settled: {},
      closure: { tone: 'superseded', line: 'Superseded — the run was stopped' },
    })
  })
})
