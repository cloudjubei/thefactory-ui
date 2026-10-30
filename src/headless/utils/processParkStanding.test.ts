import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'
import { processParkClosure, processParkStanding } from './processParkStanding'
import type { ParkStandingRun } from './processParkStandingTypes'
import { formatFriendlyTimestamp } from './time'

const PARKED = Date.parse('2026-10-13T18:00:00Z')
const ANSWERED = Date.parse('2026-10-13T18:20:00Z')
const at = (ms: number) => formatFriendlyTimestamp(new Date(ms).toISOString())

const token = { runId: 'leaf', parkedAt: PARKED }

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

describe('processParkStanding', () => {
  it('knows nothing while the run is not read', () => {
    expect(processParkStanding(token, undefined)).toEqual({ state: 'unknown' })
  })

  it('stays open while the run still waits at the park', () => {
    expect(processParkStanding(token, run(parkedAt(PARKED)))).toEqual({ state: 'open' })
  })

  it('is not open at the same moment on a run that is no longer parked', () => {
    const holder = run({ park: parkedAt(PARKED).park, status: 'running' })
    expect(processParkStanding(token, holder)).toMatchObject({ state: 'closed' })
  })

  it('says the person allowed it, where and when, once the park was answered', () => {
    const holder = run({
      ledger: [
        entry({
          override: {
            choice: 'allow',
            at: ANSWERED,
            decidedBy: 'person',
            decidedVia: 'web',
          },
        }),
      ],
    })
    expect(processParkStanding(token, holder)).toEqual({
      state: 'closed',
      closure: { tone: 'handled', line: `Handled — you allowed it on web · ${at(ANSWERED)}` },
    })
  })

  it('reads the answer given at or after the park, not an earlier one', () => {
    const holder = run({
      ledger: [
        entry({ id: 'old', override: { choice: 'retry', at: PARKED - 1, decidedBy: 'person' } }),
        entry({ id: 'new', override: { choice: 'more-info', at: ANSWERED, decidedBy: 'person' } }),
      ],
    })
    expect(processParkStanding(token, holder)).toMatchObject({
      closure: { line: `Handled — you answered it · ${at(ANSWERED)}` },
    })
  })

  it('takes the first answer after the park when several follow it', () => {
    const later = ANSWERED + 60_000
    const holder = run({
      ledger: [
        entry({ id: 'b', override: { choice: 'retry', at: later, decidedBy: 'manager' } }),
        entry({ id: 'a', override: { choice: 'allow', at: ANSWERED, decidedBy: 'manager' } }),
      ],
    })
    expect(processParkStanding(token, holder)).toMatchObject({
      closure: { line: `Handled — the manager allowed it · ${at(ANSWERED)}` },
    })
  })

  it('never credits an answer given to the park the run waits at now', () => {
    const holder = run({
      ...parkedAt(ANSWERED + 1),
      ledger: [entry({ override: { choice: 'allow', at: ANSWERED + 2, decidedBy: 'person' } })],
    })
    expect(processParkStanding(token, holder)).toEqual({
      state: 'closed',
      closure: { tone: 'superseded', line: 'Superseded — the run moved on' },
    })
  })

  it('names the run chat’s agent when it answered through its tool', () => {
    const holder = run({
      id: 'root',
      ledger: [
        entry({
          override: {
            choice: 'retry',
            at: ANSWERED,
            decidedBy: 'agent',
            decidedVia: 'tool',
            chatContextId: getChatContextKey(
              processRunChatContext({ id: 'root', projectId: 'p1' }),
            ),
          },
        }),
      ],
    })
    const standing = processParkStanding({ runId: 'root', parkedAt: PARKED }, holder, holder)
    expect(standing).toMatchObject({
      closure: { line: `Handled — the run’s chat agent had it tried again · ${at(ANSWERED)}` },
    })
  })

  it('names another chat’s agent when it answered from elsewhere', () => {
    const holder = run({
      ledger: [
        entry({
          override: { choice: 'continue', at: ANSWERED, decidedBy: 'agent', chatContextId: 'x' },
        }),
      ],
    })
    expect(processParkStanding(token, holder)).toMatchObject({
      closure: { line: `Handled — a chat agent let it carry on · ${at(ANSWERED)}` },
    })
  })

  it('says only what was done when the answer does not say who gave it', () => {
    const holder = run({
      ledger: [entry({ override: { choice: 'resolved', at: ANSWERED } })],
    })
    expect(processParkStanding(token, holder)).toMatchObject({
      closure: { line: `Handled — marked it resolved · ${at(ANSWERED)}` },
    })
  })

  it('keeps the person’s answer without a place when it says none', () => {
    const holder = run({
      ledger: [entry({ override: { choice: 'abandon', at: ANSWERED, decidedBy: 'person' } })],
    })
    expect(processParkStanding(token, holder)).toMatchObject({
      closure: { line: `Handled — you abandoned the run · ${at(ANSWERED)}` },
    })
  })

  it('reads a run that finished without an answer here as superseded', () => {
    expect(processParkStanding(token, run({ status: 'succeeded' }))).toEqual({
      state: 'closed',
      closure: { tone: 'superseded', line: 'Superseded — the run finished' },
    })
  })

  it('reads a run that failed without an answer here as stopped', () => {
    expect(processParkStanding(token, run({ status: 'failed' }))).toEqual({
      state: 'closed',
      closure: { tone: 'superseded', line: 'Superseded — the run stopped' },
    })
  })

  it('reads a cancelled run as stopped by someone', () => {
    expect(processParkStanding(token, run({ status: 'cancelled' }))).toMatchObject({
      closure: { line: 'Superseded — the run was stopped' },
    })
  })

  it('reads a run working again with no recorded answer as moved on', () => {
    expect(processParkStanding(token, run())).toMatchObject({
      closure: { line: 'Superseded — the run moved on' },
    })
  })

  it('reads a run parked on the same step later as moved on', () => {
    expect(processParkStanding(token, run(parkedAt(PARKED + 50)))).toMatchObject({
      closure: { tone: 'superseded' },
    })
  })
})

describe('processParkClosure', () => {
  it('names no place for a person’s answer recorded as a tool’s or the manager’s', () => {
    for (const decidedVia of ['tool', 'manager'] as const) {
      const holder = run({
        ledger: [
          entry({ override: { choice: 'allow', at: ANSWERED, decidedBy: 'person', decidedVia } }),
        ],
      })
      expect(processParkClosure(token, holder).line).toBe(
        `Handled — you allowed it · ${at(ANSWERED)}`,
      )
    }
  })

  it('words a decided answer the way the caller says it', () => {
    const holder = run({
      status: 'succeeded',
      ledger: [entry({ override: { choice: 'approve', at: ANSWERED, decidedBy: 'person' } })],
    })
    expect(
      processParkClosure(
        token,
        holder,
        undefined,
        (answer, when) => `Decided — ${answer} · ${when}`,
      ),
    ).toEqual({ tone: 'handled', line: `Decided — you approved it · ${at(ANSWERED)}` })
  })

  it('says the person accepted the dropped change', () => {
    const holder = run({
      ledger: [
        entry({
          override: {
            choice: 'accept-dropped-change',
            at: ANSWERED,
            decidedBy: 'person',
            decidedVia: 'desktop',
            note: 'dev removed it',
          },
        }),
      ],
    })
    expect(processParkClosure(token, holder).line).toBe(
      `Handled — you accepted the dropped change on desktop · ${at(ANSWERED)}`,
    )
  })

  it('says the person accepted the review with its follow-ups filed', () => {
    const holder = run({
      ledger: [
        entry({
          override: { choice: 'accept-with-follow-ups', at: ANSWERED, decidedBy: 'person' },
        }),
      ],
    })
    expect(processParkClosure(token, holder).line).toBe(
      `Handled — you accepted it with the follow-ups filed · ${at(ANSWERED)}`,
    )
  })

  it('counts an answer given at the very moment the run parked', () => {
    const holder = run({ ledger: [entry({ override: { choice: 'retry', at: PARKED } })] })
    expect(processParkClosure(token, holder)).toEqual({
      tone: 'handled',
      line: `Handled — had it tried again · ${at(PARKED)}`,
    })
  })

  it('reads a run chat agent by the root’s chat when it answered a nested run', () => {
    const root = run({ id: 'root' })
    const holder = run({
      ledger: [
        entry({
          override: {
            choice: 'allow',
            at: ANSWERED,
            decidedBy: 'agent',
            chatContextId: getChatContextKey(
              processRunChatContext({ id: 'root', projectId: 'p1' }),
            ),
          },
        }),
      ],
    })
    expect(processParkClosure(token, holder, root).line).toBe(
      `Handled — the run’s chat agent allowed it · ${at(ANSWERED)}`,
    )
  })
})
