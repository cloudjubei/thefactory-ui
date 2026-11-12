import { describe, expect, it } from 'vitest'
import type { ProcessPark, ProcessStep } from 'thefactory-tools/types'

import {
  isLiveCheckStep,
  isLiveCheckWatchStep,
  liveCheckWatchDecidedLine,
  liveCheckWatchState,
  liveCheckWatchView,
} from './liveCheckWatch'
import { LIVE_CHECK_WATCH_COPY } from './liveCheckWatchConstants'

const READY =
  'Watch it live: The emulator is up with the build open and signed in. Watch the change, then say whether it looks right.'
const PROBLEM =
  'Watch it live could not set the device up: no emulator here. Set it up again, or check it yourself and say whether it looks right.'
const PLAIN = 'Watch it live: check the change on a test account, then say whether it looks right.'

const watchStep: ProcessStep = {
  id: 'live-check-watch',
  name: 'Watch it live',
  kind: 'gate',
  gateKind: 'live-check',
  liveCheck: { mode: 'ask-me' },
}

const park = (over: Partial<ProcessPark> = {}): ProcessPark => ({
  reason: 'gate',
  stepId: 'live-check-watch',
  message: READY,
  parkedAt: 1,
  ...over,
})

const run = (p: ProcessPark | undefined, steps: ProcessStep[] = [watchStep]) => ({
  ...(p ? { park: p } : {}),
  plan: { steps },
})

const withSend = [
  { choice: 'approve' },
  { choice: 'send-to-developer' },
  { choice: 'abandon' },
] as const
const noSend = [{ choice: 'approve' }, { choice: 'retry' }, { choice: 'abandon' }] as const

describe('isLiveCheckWatchStep', () => {
  it('holds for the live-check gate only', () => {
    expect(isLiveCheckWatchStep(watchStep)).toBe(true)
    expect(isLiveCheckWatchStep({ kind: 'gate' })).toBe(false)
    expect(isLiveCheckWatchStep({ kind: 'gate', gateKind: 'design' })).toBe(false)
    expect(isLiveCheckWatchStep({ kind: 'agent', gateKind: 'live-check' })).toBe(false)
    expect(isLiveCheckWatchStep(undefined)).toBe(false)
  })
})

describe('isLiveCheckStep', () => {
  it('holds for the agent step and the watch, not for a plain gate', () => {
    expect(isLiveCheckStep({ kind: 'agent', liveCheck: { mode: 'required' } })).toBe(true)
    expect(isLiveCheckStep(watchStep)).toBe(true)
    expect(isLiveCheckStep({ kind: 'gate' })).toBe(false)
  })
})

describe('liveCheckWatchState', () => {
  it('reads ready, problem and a line nothing set up', () => {
    expect(liveCheckWatchState(READY)).toBe('ready')
    expect(liveCheckWatchState(PROBLEM)).toBe('problem')
    expect(liveCheckWatchState(PLAIN)).toBe('unprepared')
  })
})

describe('liveCheckWatchView', () => {
  it('shows the host’s ready line with Send offered', () => {
    expect(liveCheckWatchView(run(park()), withSend)).toEqual({
      title: LIVE_CHECK_WATCH_COPY.title,
      state: 'ready',
      badge: 'Ready',
      line: READY,
      walk: LIVE_CHECK_WATCH_COPY.walkAfter,
      sendOffered: true,
    })
  })

  it('shows the problem line', () => {
    const view = liveCheckWatchView(run(park({ message: PROBLEM })), withSend)
    expect(view?.state).toBe('problem')
    expect(view?.badge).toBe('Not set up')
    expect(view?.line).toBe(PROBLEM)
  })

  it('has no badge when nothing set a device up', () => {
    expect(liveCheckWatchView(run(park({ message: PLAIN })), withSend)?.badge).toBeUndefined()
  })

  it('says no passes are left when Send is not offered', () => {
    const view = liveCheckWatchView(run(park()), noSend)
    expect(view?.sendOffered).toBe(false)
    expect(view?.noPassesLine).toBe(LIVE_CHECK_WATCH_COPY.noPassesLine)
  })

  it('says the base is walked first with before and after', () => {
    const step = { ...watchStep, liveCheck: { mode: 'ask-me' as const, beforeAndAfter: true } }
    expect(liveCheckWatchView(run(park(), [step]), withSend)?.walk).toBe(
      LIVE_CHECK_WATCH_COPY.walkBeforeAndAfter,
    )
  })

  it('is nothing at any other stop', () => {
    expect(liveCheckWatchView(run(undefined), withSend)).toBeUndefined()
    expect(liveCheckWatchView(run(park({ reason: 'step-failed' })), withSend)).toBeUndefined()
    expect(
      liveCheckWatchView(
        run(park(), [{ id: 'live-check-watch', name: 'Sign-off', kind: 'gate' }]),
        withSend,
      ),
    ).toBeUndefined()
    expect(liveCheckWatchView(run(park({ childRunId: 'c1' })), withSend)).toBeUndefined()
  })
})

describe('liveCheckWatchDecidedLine', () => {
  it('names each choice, nothing before one', () => {
    expect(liveCheckWatchDecidedLine('approve')).toBe('Looks right')
    expect(liveCheckWatchDecidedLine('send-to-developer')).toBe('Sent to the developer')
    expect(liveCheckWatchDecidedLine('retry')).toBe('Set up again')
    expect(liveCheckWatchDecidedLine('abandon')).toBe('Stopped here')
    expect(liveCheckWatchDecidedLine(undefined)).toBeUndefined()
    expect(liveCheckWatchDecidedLine('continue')).toBeUndefined()
  })
})
