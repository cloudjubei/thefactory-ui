import { describe, expect, it } from 'vitest'
import type { ProcessPark, ProcessRun } from 'thefactory-tools/types'

import { RUN_NEEDS_YOU_NOTIFICATION_TITLE } from './chatNotifyConstants'
import type { ChatNotifyLevel } from './chatNotifyTypes'
import {
  processRunStopKey,
  processRunStopNotification,
  processRunStopsSince,
} from './processRunStopNews'
import type { ProcessRunStopMarks } from './processRunStopNewsTypes'

const NOW = 1_000

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'r1',
    projectId: 'p1',
    title: 'Review the invoice export',
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    plan: {
      definitionId: 'review',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Colleague review',
      steps: [
        { id: 'review', name: 'Review', kind: 'agent', agentType: 'developer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
    ...over,
  }) as ProcessRun

const park = (over: Partial<ProcessPark> = {}): ProcessPark =>
  ({
    reason: 'gate',
    stepId: 'sign-off',
    message: 'Ready for you',
    parkedAt: 10,
    ...over,
  }) as ProcessPark

const parked = (over: Partial<ProcessPark> = {}, runOver: Partial<ProcessRun> = {}): ProcessRun =>
  run({ status: 'parked', park: park(over), ...runOver })

type Read = { asks?: Record<string, number>; levels?: Record<string, ChatNotifyLevel> }

const since = (
  runs: ProcessRun[],
  marks: ProcessRunStopMarks | undefined,
  read: Read = {},
  now = NOW,
) =>
  processRunStopsSince(runs, now, marks, {
    asksOf: (r) => read.asks?.[r.id] ?? 0,
    levelOf: (r) => read.levels?.[r.id] ?? 'needs-me',
  })

const NONE: ProcessRunStopMarks = new Map()

describe('processRunStopKey', () => {
  it('names nothing for a run at work with nothing waiting in its chat', () => {
    expect(processRunStopKey(run(), NOW, 0)).toBeUndefined()
    expect(processRunStopKey(run({ status: 'pending' }), NOW, 0)).toBeUndefined()
  })

  it('names a stop that is the person’s by when the run stopped', () => {
    expect(processRunStopKey(parked(), NOW, 0)).toBe('stop:10')
    expect(processRunStopKey(parked({ reason: 'step-failed', parkedAt: 22 }), NOW, 0)).toBe(
      'stop:22',
    )
  })

  it('names an ask waiting in the chat of a run that has not stopped for the person', () => {
    expect(processRunStopKey(run(), NOW, 2)).toBe('ask')
    expect(processRunStopKey(run({ status: 'succeeded' }), NOW, 1)).toBe('ask')
  })

  it('names a stopped run’s own stop, not the ask of that stop in its chat', () => {
    expect(processRunStopKey(parked({ reason: 'step-waiting' }), NOW, 1)).toBe('stop:10')
  })

  it('names nothing for a run that is history', () => {
    expect(processRunStopKey(run({ status: 'succeeded' }), NOW, 0)).toBeUndefined()
    expect(processRunStopKey(run({ status: 'cancelled' }), NOW, 0)).toBeUndefined()
  })
})

describe('processRunStopsSince', () => {
  it('tells nothing of what already waited when it first looks, and marks it', () => {
    const out = since([parked()], undefined)
    expect(out.arrived).toEqual([])
    expect(out.marks).toEqual(new Map([['r1', 'stop:10']]))
  })

  it('tells nothing of a run at work, however much its agent writes', () => {
    expect(since([run(), run({ id: 'r2', status: 'pending' })], NONE)).toEqual({
      arrived: [],
      marks: new Map(),
    })
  })

  it('tells a run stopping for the person once, pointing at the run in its home project', () => {
    const first = since([parked({}, { projectId: 'home' })], NONE)
    expect(first.arrived).toEqual([
      { runId: 'r1', projectId: 'home', title: 'Review the invoice export' },
    ])
    const again = since([parked({}, { projectId: 'home' })], first.marks)
    expect(again.arrived).toEqual([])
    expect(again.marks).toEqual(first.marks)
  })

  it.each<ProcessPark['reason']>(['gate', 'step-failed', 'step-waiting'])(
    'tells a %s stop',
    (reason) => {
      expect(since([parked({ reason })], NONE).arrived).toHaveLength(1)
    },
  )

  it('tells a stop once though the same ask also waits in the run’s chat', () => {
    const stopped = parked({ reason: 'step-waiting' })
    const out = since([stopped], NONE, { asks: { r1: 1 } })
    expect(out.arrived).toHaveLength(1)
    expect(since([stopped], out.marks, { asks: { r1: 1 } }).arrived).toEqual([])
    expect(since([stopped], out.marks, { asks: { r1: 2 } }).arrived).toEqual([])
  })

  it('tells once when the ask comes to its chat first and the run stops on it after', () => {
    const asked = since([run()], NONE, { asks: { r1: 1 } })
    expect(asked.arrived).toHaveLength(1)
    const stopped = since([parked({ reason: 'step-waiting' })], asked.marks, { asks: { r1: 1 } })
    expect(stopped.arrived).toEqual([])
    expect(stopped.marks).toEqual(new Map([['r1', 'stop:10']]))
    const handedBack = since([run()], stopped.marks, { asks: { r1: 1 } })
    expect(handedBack.arrived).toEqual([])
  })

  it('tells an ask waiting in the chat of a run at work, and of one that is history', () => {
    const out = since([run(), run({ id: 'r2', status: 'succeeded' })], NONE, {
      asks: { r1: 1, r2: 1 },
    })
    expect(out.arrived.map((s) => s.runId)).toEqual(['r1', 'r2'])
  })

  it('tells the next stop: after the run went on, and straight from one stop to another', () => {
    const first = since([parked({ parkedAt: 10 })], NONE)
    const wentOn = since([run()], first.marks)
    expect(wentOn).toEqual({ arrived: [], marks: new Map() })
    expect(since([parked({ parkedAt: 10 })], wentOn.marks).arrived).toHaveLength(1)
    expect(
      since([parked({ reason: 'step-failed', parkedAt: 30 })], first.marks).arrived,
    ).toHaveLength(1)
  })

  describe('a stop the person has nothing to do at', () => {
    const turn = { runId: 'r1', parkedAt: 10, signature: 's', startedAt: 900, chatContextId: 'c' }
    const failed = { reason: 'step-failed' as const, parkedAt: 10 }

    it('tells nothing while the run’s manager has the stop, then tells it once it is handed on', () => {
      const held = parked(failed, { manager: { turn } } as Partial<ProcessRun>)
      const out = since([held], NONE)
      expect(out).toEqual({ arrived: [], marks: new Map() })
      const stale = since([held], out.marks, {}, 900 + 3 * 60 * 60 * 1000)
      expect(stale.arrived.map((s) => s.runId)).toEqual(['r1'])
    })

    it('tells nothing of a nested run — its stop is told on the run at the top', () => {
      const child = parked(failed, { id: 'c1', parentRunId: 'r1' })
      const top = parked({ ...failed, childRunId: 'c1' })
      expect(since([child], NONE, { asks: { c1: 1 } })).toEqual({ arrived: [], marks: new Map() })
      expect(since([top, child], NONE).arrived.map((s) => s.runId)).toEqual(['r1'])
    })

    it('tells nothing of a run waiting on other work', () => {
      expect(since([parked({ reason: 'waiting-on-work' })], NONE).arrived).toEqual([])
      expect(since([parked({ reason: 'waiting-on-blockers' })], NONE).arrived).toEqual([])
    })

    it('tells nothing while a run waits on someone outside it, then tells what came', () => {
      const ask = (arrived: boolean) =>
        ({
          reason: 'step-waiting',
          ask: { kind: 'question', title: 't', detail: 'd', outside: { arrived } },
        }) as unknown as Partial<ProcessPark>
      const waiting = since([parked(ask(false))], NONE)
      expect(waiting).toEqual({ arrived: [], marks: new Map() })
      expect(since([parked(ask(true))], waiting.marks).arrived).toHaveLength(1)
    })

    it('tells nothing of a run whose chat the person set to nothing, and keeps its mark', () => {
      const out = since([parked()], NONE, { levels: { r1: 'nothing' } })
      expect(out.arrived).toEqual([])
      expect(out.marks).toEqual(new Map([['r1', 'stop:10']]))
      expect(since([parked()], out.marks).arrived).toEqual([])
    })
  })

  it('tells each run that stopped, in the order given', () => {
    const out = since([parked({}, { id: 'b' }), run({ id: 'x' }), parked({}, { id: 'a' })], NONE)
    expect(out.arrived.map((s) => s.runId)).toEqual(['b', 'a'])
  })

  it('names a run without a title by its process', () => {
    expect(since([parked({}, { title: '  ' })], NONE).arrived[0]?.title).toBe('Colleague review')
  })
})

describe('processRunStopNotification', () => {
  it('is short, tagged by its run, and carries the run to open', () => {
    const stop = { runId: 'r1', projectId: 'home', title: 'Review the invoice export' }
    expect(processRunStopNotification(stop)).toEqual({
      title: RUN_NEEDS_YOU_NOTIFICATION_TITLE,
      tag: 'run-needs-you:r1',
      run: stop,
    })
    expect(RUN_NEEDS_YOU_NOTIFICATION_TITLE).toBe('A run needs you')
  })
})
