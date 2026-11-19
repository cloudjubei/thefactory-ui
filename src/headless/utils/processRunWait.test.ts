import { describe, expect, it } from 'vitest'
import type { ProcessPark, ProcessRun, ProcessRunWait } from 'thefactory-tools/types'

import {
  groupSignOffWaitLine,
  isProcessParkWaitingElsewhere,
  isProcessRunWaitingOnWork,
  processGroupLegWaitLine,
  processPlannedWaitView,
  processRunWaitLine,
  processRunWaitView,
  processRunWaitingLine,
  processWaitActionBody,
  processWaitConfirmView,
  withPendingWaitAction,
} from './processRunWait'

const at = (when: number) => `t${when}`

const ZNR780 = { label: 'ZNR-780', branch: 'znr-780-persona-evals' }
const ZNR781 = { label: 'ZNR-781', pullRequestUrl: 'https://github.com/o/r/pull/9' }

type RunInput = Partial<Omit<ProcessRun, 'park'>> & { park?: Partial<ProcessPark> }

const run = (over: RunInput = {}): ProcessRun =>
  ({
    id: 'r1',
    projectId: 'osc-be',
    title: 'ZNR-821',
    status: 'running',
    plan: {
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent' },
        { id: 'wait-for-work', name: 'Wait for other work', kind: 'check', waitsForWork: true },
        { id: 'proof', name: 'Proof', kind: 'capture' },
      ],
    },
    ledger: [],
    workBranch: { branch: 'work/znr-821', baseRef: 'dev' },
    waitsFor: [ZNR780],
    ...over,
  }) as unknown as ProcessRun

const waitingPark = {
  reason: 'waiting-on-work',
  stepId: 'wait-for-work',
  message: 'Waiting on other work',
  parkedAt: 100,
  waitingOn: ['ZNR-780'],
} as ProcessPark

const waitingRun = (wait: Partial<ProcessRunWait> = {}, over: RunInput = {}) =>
  run({
    status: 'parked',
    park: waitingPark,
    wait: {
      entries: [{ label: 'ZNR-780', waiting: 'znr-780 is not on dev yet.' }],
      since: 100,
      baseRef: 'dev',
      ...wait,
    },
    ...over,
  })

describe('isProcessParkWaitingElsewhere', () => {
  it('is true for a park on blockers or on other work, false for any other or none', () => {
    expect(isProcessParkWaitingElsewhere({ reason: 'waiting-on-work' })).toBe(true)
    expect(isProcessParkWaitingElsewhere({ reason: 'waiting-on-blockers' })).toBe(true)
    expect(isProcessParkWaitingElsewhere({ reason: 'step-failed' })).toBe(false)
    expect(isProcessParkWaitingElsewhere({ reason: 'gate' })).toBe(false)
    expect(isProcessParkWaitingElsewhere(undefined)).toBe(false)
  })
})

describe('isProcessRunWaitingOnWork', () => {
  it('is true only while the run is parked at its wait for other work', () => {
    expect(isProcessRunWaitingOnWork(waitingRun())).toBe(true)
    expect(isProcessRunWaitingOnWork(run())).toBe(false)
    expect(
      isProcessRunWaitingOnWork(
        run({ status: 'parked', park: { ...waitingPark, reason: 'gate' } }),
      ),
    ).toBe(false)
    expect(isProcessRunWaitingOnWork(run({ status: 'running', park: waitingPark }))).toBe(false)
  })
})

describe('processRunWaitView', () => {
  it('is nothing for a run that waits for no other work', () => {
    expect(processRunWaitView(run({ waitsFor: [] }), { formatAt: at })).toBeUndefined()
    expect(processRunWaitView(run({ waitsFor: undefined }), { formatAt: at })).toBeUndefined()
  })

  it('says what a run on its way to its wait waits for, that it carries on by itself, and offers both ways out', () => {
    expect(processRunWaitView(run(), { formatAt: at })).toEqual({
      state: 'ahead',
      tone: 'queued',
      headline: 'Waits for ZNR-780 to reach dev before its proof',
      meta: ['carries on by itself'],
      entries: [],
      actions: [
        { action: 'continue-now', label: 'Continue now' },
        { action: 'stop-waiting', label: 'Stop waiting' },
      ],
      pending: false,
    })
  })

  it('says since when a run waits at its wait step, with each entry as git last read it', () => {
    const view = processRunWaitView(waitingRun(), { formatAt: at })
    expect(view?.state).toBe('waiting')
    expect(view?.headline).toBe('Waits for ZNR-780 to reach dev before its proof')
    expect(view?.meta).toEqual(['since t100', 'carries on by itself'])
    expect(view?.entries).toEqual([
      { label: 'ZNR-780', onBase: false, line: 'znr-780 is not on dev yet.' },
    ])
    expect(view?.actions.map((a) => a.action)).toEqual(['continue-now', 'stop-waiting'])
  })

  it('names only what is not on the base yet when one of two already is', () => {
    const view = processRunWaitView(
      waitingRun(
        {
          entries: [
            { label: 'ZNR-780', onBase: { how: 'branch', commit: 'abc1234', at: 90 } },
            { label: 'ZNR-781', waiting: 'https://github.com/o/r/pull/9 is not merged yet.' },
          ],
        },
        { waitsFor: [ZNR780, ZNR781] },
      ),
      { formatAt: at },
    )
    expect(view?.headline).toBe('Waits for ZNR-781 to reach dev before its proof')
    expect(view?.entries).toEqual([
      { label: 'ZNR-780', onBase: true, line: 'on dev · by its branch' },
      { label: 'ZNR-781', onBase: false, line: 'https://github.com/o/r/pull/9 is not merged yet.' },
    ])
  })

  it('names every entry while git has not shown any, joined as a sentence', () => {
    const view = processRunWaitView(run({ waitsFor: [ZNR780, ZNR781] }), { formatAt: at })
    expect(view?.headline).toBe('Waits for ZNR-780 and ZNR-781 to reach dev before its proof')
  })

  it('names every entry when each is recorded on the base but the wait is not settled yet', () => {
    const view = processRunWaitView(
      waitingRun({
        entries: [{ label: 'ZNR-780', onBase: { how: 'pull-request', commit: 'c', at: 1 } }],
      }),
      { formatAt: at },
    )
    expect(view?.headline).toBe('Waits for ZNR-780 to reach dev before its proof')
    expect(view?.entries[0]?.line).toBe('on dev · by its merged pull request')
  })

  it('tells how an entry on the base was found by its commit', () => {
    const view = processRunWaitView(
      waitingRun({
        entries: [{ label: 'ZNR-780', onBase: { how: 'commit', commit: 'c', at: 1 } }],
      }),
      { formatAt: at },
    )
    expect(view?.entries[0]?.line).toBe('on dev · by its commit')
  })

  it('reads the base from the work branch before the wait read one, else says the base branch', () => {
    expect(processRunWaitView(run(), { formatAt: at })?.headline).toContain('to reach dev')
    expect(processRunWaitView(run({ workBranch: undefined }), { formatAt: at })?.headline).toBe(
      'Waits for ZNR-780 to reach the base branch before its proof',
    )
    expect(
      processRunWaitView(waitingRun({ baseRef: 'main' }), { formatAt: at })?.headline,
    ).toContain('to reach main')
  })

  it('leaves out a since while the run is not parked at its wait', () => {
    const view = processRunWaitView(run({ wait: { entries: [], since: 100 } }), { formatAt: at })
    expect(view?.meta).toEqual(['carries on by itself'])
  })

  it('says the work reached the base once git cleared it, with nothing left to do', () => {
    const view = processRunWaitView(
      run({
        wait: {
          entries: [{ label: 'ZNR-780', onBase: { how: 'branch', commit: 'c', at: 300 } }],
          baseRef: 'dev',
          settled: { how: 'on-base', at: 300, baseSha: 'f00' },
        },
      }),
      { formatAt: at },
    )
    expect(view).toMatchObject({
      state: 'settled',
      tone: 'done',
      headline: 'ZNR-780 reached dev',
      meta: ['at t300'],
      actions: [],
    })
  })

  it('leaves out the note of a Wait again once git cleared the wait', () => {
    const view = processRunWaitView(
      run({
        wait: {
          entries: [],
          settled: { how: 'on-base', at: 300 },
          decisions: [{ action: 'wait-again', at: 250, note: 'Wait for it after all' }],
        },
      }),
      { formatAt: at },
    )
    expect(view?.headline).toBe('ZNR-780 reached dev')
    expect(view?.note).toBeUndefined()
  })

  it('says a person continued without waiting, who and their note, offering Wait again until the run reaches its wait', () => {
    const view = processRunWaitView(
      run({
        wait: {
          entries: [],
          settled: { how: 'continued', at: 200, decidedBy: 'person', decidedVia: 'web' },
          decisions: [
            {
              action: 'continue-now',
              at: 200,
              note: 'Tested it by hand',
              decidedBy: 'person',
              decidedVia: 'web',
            },
          ],
        },
      }),
      { formatAt: at },
    )
    expect(view).toEqual({
      state: 'settled',
      tone: 'empty',
      headline: 'Continued without waiting',
      meta: ['at t200', 'by you'],
      entries: [],
      actions: [{ action: 'wait-again', label: 'Wait again' }],
      note: 'Tested it by hand',
      pending: false,
    })
  })

  it('says a person stopped waiting, and by the manager when it decided', () => {
    const view = processRunWaitView(
      run({
        wait: {
          entries: [],
          settled: { how: 'dropped', at: 200, decidedBy: 'manager', decidedVia: 'manager' },
        },
      }),
      { formatAt: at },
    )
    expect(view?.headline).toBe('Stopped waiting')
    expect(view?.meta).toEqual(['at t200', 'by the manager'])
    expect(view?.note).toBeUndefined()
  })

  it('leaves out who when the settle names nobody', () => {
    const view = processRunWaitView(
      run({ wait: { entries: [], settled: { how: 'dropped', at: 200 } } }),
      { formatAt: at },
    )
    expect(view?.meta).toEqual(['at t200'])
  })

  it('offers no Wait again once the run went past its wait step after the settle', () => {
    const view = processRunWaitView(
      run({
        ledger: [{ stepId: 'wait-for-work', startedAt: 250 }] as ProcessRun['ledger'],
        wait: { entries: [], settled: { how: 'continued', at: 200 } },
      }),
      { formatAt: at },
    )
    expect(view?.actions).toEqual([])
  })

  it('keeps a settled wait on an ended run, without actions, and drops one that never settled', () => {
    const settled = { entries: [], settled: { how: 'dropped' as const, at: 200 } }
    expect(
      processRunWaitView(run({ status: 'succeeded', wait: settled }), { formatAt: at }),
    ).toMatchObject({ headline: 'Stopped waiting', actions: [] })
    expect(processRunWaitView(run({ status: 'cancelled' }), { formatAt: at })).toBeUndefined()
    expect(processRunWaitView(run({ status: 'failed' }), { formatAt: at })).toBeUndefined()
    expect(processRunWaitView(run({ status: 'succeeded' }), { formatAt: at })).toBeUndefined()
  })

  it('shows an action being sent as done at once, without its buttons', () => {
    const view = processRunWaitView(waitingRun(), {
      formatAt: at,
      pending: { action: 'continue-now', at: 400 },
    })
    expect(view).toMatchObject({
      state: 'settled',
      headline: 'Continued without waiting',
      meta: ['at t400', 'by you'],
      actions: [],
      pending: true,
    })
    expect(
      processRunWaitView(waitingRun(), {
        formatAt: at,
        pending: { action: 'stop-waiting', at: 400 },
      })?.headline,
    ).toBe('Stopped waiting')
  })

  it('shows Wait again being sent as waiting again at once', () => {
    const view = processRunWaitView(
      run({ wait: { entries: [], settled: { how: 'continued', at: 200 } } }),
      { formatAt: at, pending: { action: 'wait-again', at: 400 } },
    )
    expect(view).toMatchObject({
      state: 'ahead',
      headline: 'Waits for ZNR-780 to reach dev before its proof',
      actions: [],
      pending: true,
    })
  })

  it('formats times as a friendly timestamp when no formatter is given', () => {
    const view = processRunWaitView(waitingRun({ since: Date.UTC(2026, 10, 19, 9, 42) }))
    expect(view?.meta[0]).toMatch(/^since \S/)
    expect(view?.meta[0]).not.toBe('since ')
  })
})

describe('withPendingWaitAction', () => {
  it('settles the wait as the person would, or opens it again for Wait again', () => {
    expect(
      withPendingWaitAction(waitingRun(), { action: 'continue-now', at: 5 }).wait?.settled,
    ).toEqual({
      how: 'continued',
      at: 5,
      decidedBy: 'person',
    })
    expect(
      withPendingWaitAction(waitingRun(), { action: 'stop-waiting', at: 5 }).wait?.settled?.how,
    ).toBe('dropped')
    const reopened = withPendingWaitAction(
      run({ wait: { entries: [], settled: { how: 'dropped', at: 1 } } }),
      { action: 'wait-again', at: 5 },
    )
    expect(reopened.wait?.settled).toBeUndefined()
    expect(reopened.wait?.entries).toEqual([])
  })

  it('starts a wait record for a run that has none yet', () => {
    expect(withPendingWaitAction(run(), { action: 'stop-waiting', at: 5 }).wait).toEqual({
      entries: [],
      settled: { how: 'dropped', at: 5, decidedBy: 'person' },
    })
  })
})

describe('processRunWaitLine', () => {
  it('is the headline and its facts in one line', () => {
    expect(processRunWaitLine(processRunWaitView(waitingRun(), { formatAt: at })!)).toBe(
      'Waits for ZNR-780 to reach dev before its proof · since t100 · carries on by itself',
    )
  })
})

describe('processRunWaitingLine', () => {
  it('says a run at its wait in its card’s words, and any other wait elsewhere by its park', () => {
    expect(processRunWaitingLine(waitingRun(), at)).toBe(
      'Waits for ZNR-780 to reach dev before its proof · since t100 · carries on by itself',
    )
    const blocked = run({
      status: 'parked',
      waitsFor: undefined,
      park: { reason: 'waiting-on-blockers', message: 'Waits on #s18', parkedAt: 1 },
    })
    expect(processRunWaitingLine(blocked, at)).toBe('Waits on #s18')
    expect(processRunWaitingLine(run({ status: 'parked', waitsFor: undefined }), at)).toBe(
      'Waiting',
    )
    expect(processRunWaitingLine(waitingRun({}, { waitsFor: [] }), at)).toBe(
      'Waiting on other work',
    )
  })
})

describe('processWaitConfirmView', () => {
  const view = processRunWaitView(waitingRun(), { formatAt: at })!
  it('asks before continuing now, saying the base comes in and is checked again', () => {
    expect(processWaitConfirmView('continue-now', waitingRun())).toEqual({
      title: 'Continue now?',
      body: 'Carries on without waiting for ZNR-780: brings dev in, checks again, then the proof.',
      confirm: 'Continue now',
      cancel: 'Cancel',
      noteLabel: 'Note (optional)',
      notePlaceholder: 'Why, for the record',
    })
    expect(view.actions).toHaveLength(2)
  })

  it('asks before stopping the wait and before waiting again', () => {
    expect(processWaitConfirmView('stop-waiting', waitingRun())).toMatchObject({
      title: 'Stop waiting?',
      body: 'Goes on to the proof without ZNR-780. Nothing is brought in.',
      confirm: 'Stop waiting',
    })
    expect(processWaitConfirmView('wait-again', waitingRun())).toMatchObject({
      title: 'Wait again?',
      body: 'Waits for ZNR-780 to reach dev again before the proof.',
      confirm: 'Wait again',
    })
  })
})

describe('processWaitActionBody', () => {
  it('sends who decided and the note trimmed, leaving out an empty one', () => {
    expect(processWaitActionBody('web', '  Tested by hand  ')).toEqual({
      decidedVia: 'web',
      note: 'Tested by hand',
    })
    expect(processWaitActionBody('mobile', '   ')).toEqual({ decidedVia: 'mobile' })
    expect(processWaitActionBody('desktop')).toEqual({ decidedVia: 'desktop' })
  })

  it('cuts a note to what the route takes', () => {
    expect(processWaitActionBody('web', 'x'.repeat(2500)).note).toHaveLength(2000)
  })
})

describe('processGroupLegWaitLine', () => {
  it('says what a waiting leg waits for, to its base branch when it has one', () => {
    expect(processGroupLegWaitLine({ waitsFor: [ZNR780], baseBranch: 'dev' })).toBe(
      'Waits for ZNR-780 to reach dev before its proof · carries on by itself',
    )
    expect(processGroupLegWaitLine({ waitsFor: [ZNR780, ZNR781] })).toBe(
      'Waits for ZNR-780 and ZNR-781 to reach the base branch before its proof · carries on by itself',
    )
    expect(processGroupLegWaitLine({ waitsFor: [] })).toBeUndefined()
    expect(processGroupLegWaitLine({})).toBeUndefined()
  })
})

describe('processPlannedWaitView', () => {
  it('shows a wait no run holds yet as a run on its way to it: what, on which base, carrying on by itself', () => {
    expect(processPlannedWaitView([ZNR780, ZNR781], 'dev')).toEqual({
      state: 'ahead',
      tone: 'queued',
      headline: 'Waits for ZNR-780 and ZNR-781 to reach dev before its proof',
      meta: ['carries on by itself'],
      entries: [
        { label: 'ZNR-780', onBase: false, line: 'branch znr-780-persona-evals' },
        { label: 'ZNR-781', onBase: false, line: 'pull request https://github.com/o/r/pull/9' },
      ],
      actions: [],
      pending: false,
    })
  })

  it('says the base branch when none is named, and every target an entry gives', () => {
    const view = processPlannedWaitView([
      {
        label: 'ZNR-782',
        commit: 'abc1234',
        branch: 'znr-782',
        pullRequestUrl: 'https://x/pull/1',
      },
    ])
    expect(view?.headline).toBe('Waits for ZNR-782 to reach the base branch before its proof')
    expect(view?.entries).toEqual([
      {
        label: 'ZNR-782',
        onBase: false,
        line: 'branch znr-782 · commit abc1234 · pull request https://x/pull/1',
      },
    ])
  })

  it('lists no entry that names nothing to find', () => {
    expect(processPlannedWaitView([{ label: 'ZNR-783' }])?.entries).toEqual([])
  })

  it('is nothing for no wait', () => {
    expect(processPlannedWaitView([])).toBeUndefined()
    expect(processPlannedWaitView(undefined)).toBeUndefined()
  })
})

describe('groupSignOffWaitLine', () => {
  it('says what a repo still waits for, since when, and that it carries on by itself', () => {
    expect(
      groupSignOffWaitLine(
        { waitsFor: ['ZNR-780', 'ZNR-781'], waitingOn: ['ZNR-781'], since: 100 },
        'dev',
        at,
      ),
    ).toBe('Waits for ZNR-781 to reach dev before its proof · since t100 · carries on by itself')
  })

  it('names every entry when none is listed as still waiting, and leaves since out when absent', () => {
    expect(groupSignOffWaitLine({ waitsFor: ['ZNR-780'], waitingOn: [] }, undefined, at)).toBe(
      'Waits for ZNR-780 to reach the base branch before its proof · carries on by itself',
    )
  })

  it('says how the wait settled', () => {
    expect(
      groupSignOffWaitLine({ waitsFor: ['ZNR-780'], waitingOn: [], settled: 'on-base' }, 'dev', at),
    ).toBe('ZNR-780 reached dev')
    expect(
      groupSignOffWaitLine(
        { waitsFor: ['ZNR-780'], waitingOn: [], settled: 'continued' },
        'dev',
        at,
      ),
    ).toBe('Continued without waiting')
    expect(
      groupSignOffWaitLine({ waitsFor: ['ZNR-780'], waitingOn: [], settled: 'dropped' }, 'dev', at),
    ).toBe('Stopped waiting')
  })

  it('is nothing for a repo that waits for nothing', () => {
    expect(groupSignOffWaitLine(undefined, 'dev', at)).toBeUndefined()
    expect(groupSignOffWaitLine({ waitsFor: [], waitingOn: [] }, 'dev', at)).toBeUndefined()
  })
})
