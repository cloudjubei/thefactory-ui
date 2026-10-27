import { describe, expect, it } from 'vitest'
import type { ActivityStopCard } from 'thefactory-tools/types'

import {
  activityStopApprovalView,
  activityStopCardOf,
  activityStopMilestone,
  isActivityStopGrant,
} from './activityStopApproval'

const card = (over: Partial<ActivityStopCard> = {}): ActivityStopCard => ({
  kind: 'activity-stop',
  version: 1,
  projectId: 'p1',
  activityId: '6f1c2d3e-aaaa-bbbb-cccc-000000000001',
  activityType: 'knowledge-evaluate',
  recordType: 'knowledge-eval',
  status: 'running',
  paused: false,
  launchParams: { stage: 'full', cells: 120 },
  startedAt: '2026-10-20T10:00:00.000Z',
  snapshotAt: '2026-10-20T11:02:05.000Z',
  elapsedMs: 3_725_000,
  steps: [
    { key: 'grade', status: 'running', done: 42, total: 120 },
    { key: 'report', status: 'running', done: 0, total: 0 },
  ],
  costUSD: 3.4,
  ...over,
})

const grant = (detail: unknown, args: Record<string, unknown> = { activityId: 'a1' }) => ({
  toolName: 'stopActivity',
  args,
  detail: { tool: 'stopActivity', args, detail },
})

describe('isActivityStopGrant', () => {
  it('knows a stop by the grant or by its payload', () => {
    expect(isActivityStopGrant({ toolName: 'stopActivity' })).toBe(true)
    expect(isActivityStopGrant({ detail: { tool: 'stopActivity' } })).toBe(true)
    expect(isActivityStopGrant({ toolName: 'stopProcessRun' })).toBe(false)
    expect(isActivityStopGrant({})).toBe(false)
  })
})

describe('activityStopCardOf', () => {
  it('reads a version-1 card from the ask', () => {
    expect(activityStopCardOf(grant(card()))).toEqual(card())
  })
  it.each([
    ['no card', undefined],
    ['another version', { ...card(), version: 2 }],
    ['another kind', { ...card(), kind: 'git-change' }],
  ])('reads nothing from %s', (_label, detail) => {
    expect(activityStopCardOf(grant(detail))).toBeUndefined()
  })
})

describe('activityStopApprovalView', () => {
  it('states the host’s facts on a danger card, the agent’s reason as its own', () => {
    const view = activityStopApprovalView(card(), { activityId: 'a1', reason: 'Enough cells' })
    expect(view.ask).toEqual({
      icon: 'stop',
      tone: 'danger',
      ask: 'Stop a background activity',
      tag: "Can't resume",
      headline: 'knowledge-evaluate · 6f1c2d3e',
      why: 'Enough cells',
      consequence:
        'Its work ends and is waited for, as does anything it started. What it made so far is kept. It won’t start again — run it anew to continue.',
      verb: 'Stop it',
      body: { kind: 'details' },
    })
    expect(view.facts).toEqual([
      { label: 'Type', value: 'knowledge-evaluate' },
      { label: 'Status', value: 'Running' },
      { label: 'Elapsed', value: '1h 2m 5s · since recorded start, queue included' },
      { label: 'Cost so far', value: '$3.40' },
    ])
    expect(view.steps).toEqual([
      { key: 'grade', progress: '42 of 120', status: 'running' },
      { key: 'report', progress: '0', status: 'running' },
    ])
    expect(view.params).toEqual(['stage: "full"', 'cells: 120'])
    expect(view.paramsNotes).toEqual([])
  })

  it('says a paused run is not progressing, and an unknown cost is unknown, not zero', () => {
    const view = activityStopApprovalView(card({ paused: true, costUSD: undefined }), {})
    expect(view.facts).toContainEqual({
      label: 'Status',
      value: 'Paused — interrupted, not progressing',
    })
    expect(view.facts).toContainEqual({ label: 'Cost so far', value: 'Not recorded' })
  })

  it('keeps a recorded zero cost and a queued run’s status', () => {
    const view = activityStopApprovalView(card({ costUSD: 0, status: 'queued' }), {})
    expect(view.facts).toContainEqual({ label: 'Cost so far', value: '$0.00' })
    expect(view.facts).toContainEqual({ label: 'Status', value: 'Queued' })
  })

  it('says why there are no parameters, and names the ones left out as secret', () => {
    expect(
      activityStopApprovalView(card({ launchParams: undefined, paramsOmitted: 'none' }), {})
        .paramsNotes,
    ).toEqual(['No launch parameters recorded'])
    expect(
      activityStopApprovalView(
        card({
          launchParams: undefined,
          paramsOmitted: 'too-large',
          redactedParams: ['apiKey', 'auth.token'],
        }),
        {},
      ).paramsNotes,
    ).toEqual(['Launch parameters too large to show', 'Left out as secret: apiKey, auth.token'])
  })

  it('counts the live activities that stop with it, naming their types', () => {
    const view = activityStopApprovalView(
      card({ liveChildCount: 3, liveChildTypes: ['train', 'evaluate'] }),
      {},
    )
    expect(view.facts.at(-1)).toEqual({
      label: 'Also stops',
      value: '3 it started · train, evaluate',
    })
  })

  it('counts children with no recorded type by number alone', () => {
    expect(activityStopApprovalView(card({ liveChildCount: 1 }), {}).facts.at(-1)).toEqual({
      label: 'Also stops',
      value: '1 it started',
    })
    expect(
      activityStopApprovalView(card({ liveChildCount: 2, liveChildTypes: [] }), {}).facts.at(-1),
    ).toEqual({ label: 'Also stops', value: '2 it started' })
  })

  it('states no children when none stop with it', () => {
    const labels = activityStopApprovalView(card(), {}).facts.map((f) => f.label)
    expect(labels).not.toContain('Also stops')
  })

  it('names an activity whose type is not recorded by its record type', () => {
    const view = activityStopApprovalView(card({ activityType: undefined }), {})
    expect(view.ask.headline).toBe('knowledge-eval · 6f1c2d3e')
    expect(view.facts[0]).toEqual({ label: 'Type', value: 'knowledge-eval' })
  })

  it('formats short elapsed times plainly', () => {
    expect(activityStopApprovalView(card({ elapsedMs: 900 }), {}).facts[2]?.value).toMatch(/^0s/)
    expect(activityStopApprovalView(card({ elapsedMs: 61_000 }), {}).facts[2]?.value).toMatch(
      /^1m 1s/,
    )
  })

  it('without the host’s card, says so and shows nothing the agent claims as fact', () => {
    const view = activityStopApprovalView(undefined, { activityId: 'zz-123456789', reason: 'r' })
    expect(view.unavailable).toBe(
      'The activity’s details couldn’t be read. Stop it only if you know which one it is.',
    )
    expect(view.ask.headline).toBe('Activity · zz-12345')
    expect(view.ask.why).toBe('r')
    expect(view.facts).toEqual([])
    expect(view.steps).toEqual([])
    expect(view).not.toHaveProperty('card')
  })
})

describe('activityStopMilestone', () => {
  it.each([
    [
      { activityId: 'a', outcome: 'stopped', status: 'aborted' },
      'success',
      'Stopped — its work has ended',
    ],
    [
      { activityId: 'a', outcome: 'noop', status: 'completed' },
      'neutral',
      'Already completed — nothing changed',
    ],
    [
      { activityId: 'a', outcome: 'not-stopped', status: 'completed' },
      'warning',
      'Not stopped — it is completed',
    ],
    [
      { activityId: 'a', outcome: 'failed', code: 'adapter-failed', status: 'running' },
      'warning',
      'Couldn’t confirm it stopped — it may still be running',
    ],
    [
      { activityId: 'a', outcome: 'refused', code: 'not-found' },
      'warning',
      'Not stopped — no such activity',
    ],
    [
      { activityId: 'a', outcome: 'refused', code: 'target-changed' },
      'warning',
      'Not stopped — the activity changed since you approved',
    ],
    [
      { activityId: 'a', outcome: 'refused', code: 'some-new-code' },
      'warning',
      'Not stopped — nothing was touched',
    ],
    [
      { activityId: 'a', outcome: 'refused', code: 'constructor' },
      'warning',
      'Not stopped — nothing was touched',
    ],
    [{ activityId: 'a', outcome: 'refused' }, 'warning', 'Not stopped — nothing was touched'],
  ])('says %j plainly on its row', (result, tone, title) => {
    expect(activityStopMilestone(result, 'success', false)).toEqual({ tone, title })
    expect(activityStopMilestone(JSON.stringify(result), 'success', false)).toEqual({ tone, title })
  })

  it('reads the outcome the action recorded carrying the call out over the row’s own copy', () => {
    const recorded = JSON.stringify({ activityId: 'a', outcome: 'stopped', status: 'aborted' })
    const row = { activityId: 'a', outcome: 'failed', code: 'adapter-failed' }
    expect(activityStopMilestone(row, 'success', false, recorded)).toEqual({
      tone: 'success',
      title: 'Stopped — its work has ended',
    })
  })

  it('falls back to the row’s result when the recorded execution is not a stop result', () => {
    const row = { activityId: 'a', outcome: 'stopped', status: 'aborted' }
    expect(activityStopMilestone(row, 'success', false, '{"activityId":"a","outc…')?.tone).toBe(
      'success',
    )
  })

  it('counts what it started that was stopped with it', () => {
    const result = {
      activityId: 'a',
      outcome: 'stopped',
      status: 'aborted',
      children: [
        { activityId: 'c1', parentActivityId: 'a', outcome: 'stopped', status: 'aborted' },
        { activityId: 'c2', parentActivityId: 'c1', outcome: 'stopped', status: 'aborted' },
      ],
    }
    expect(activityStopMilestone(result, 'success', false)).toEqual({
      tone: 'success',
      title: 'Stopped — its work has ended',
      detail: 'Also stopped 2 it started',
    })
  })

  it('says which of what it started may still be running, and warns', () => {
    const result = {
      activityId: 'a',
      outcome: 'stopped',
      status: 'aborted',
      children: [
        { activityId: 'c1', parentActivityId: 'a', outcome: 'stopped', status: 'aborted' },
        { activityId: 'c2', parentActivityId: 'a', outcome: 'noop', status: 'completed' },
        { activityId: 'c3', parentActivityId: 'a', outcome: 'failed', code: 'stop-errored' },
        { activityId: 'c4', parentActivityId: 'a', outcome: 'not-stopped', status: 'failed' },
      ],
    }
    expect(activityStopMilestone(result, 'success', false)).toEqual({
      tone: 'warning',
      title: 'Stopped — its work has ended',
      detail: 'Stopped 1 of 4 it started · 2 had already ended · 1 may still be running',
    })
  })

  it('names only the kinds of outcome its started activities had', () => {
    const base = { activityId: 'a', outcome: 'stopped', status: 'aborted' }
    const c = (outcome: string) => ({ activityId: outcome, parentActivityId: 'a', outcome })
    expect(
      activityStopMilestone({ ...base, children: [c('stopped'), c('noop')] }, 'success', false),
    ).toEqual({
      tone: 'success',
      title: 'Stopped — its work has ended',
      detail: 'Stopped 1 of 2 it started · 1 had already ended',
    })
    expect(
      activityStopMilestone({ ...base, children: [c('stopped'), c('refused')] }, 'success', false)
        ?.detail,
    ).toBe('Stopped 1 of 2 it started · 1 may still be running')
  })

  it('falls back to the row’s result when the recorded execution names no stop outcome', () => {
    const row = { activityId: 'a', outcome: 'stopped', status: 'aborted' }
    expect(activityStopMilestone(row, 'success', false, '{"outcome":"denied"}')?.title).toBe(
      'Stopped — its work has ended',
    )
  })

  it('says one started activity in the singular', () => {
    const result = {
      activityId: 'a',
      outcome: 'failed',
      code: 'adapter-failed',
      children: [{ activityId: 'c1', parentActivityId: 'a', outcome: 'stopped' }],
    }
    expect(activityStopMilestone(result, 'success', false)?.detail).toBe(
      'Also stopped 1 it started',
    )
  })

  it('shows nothing while the stop waits on the person, or for a call that did not return a stop', () => {
    const result = { activityId: 'a', outcome: 'stopped', status: 'aborted' }
    expect(activityStopMilestone(result, 'success', true)).toBeUndefined()
    expect(activityStopMilestone(result, 'running', false)).toBeUndefined()
    expect(activityStopMilestone({ outcome: 'denied' }, 'not_allowed', false)).toBeUndefined()
    expect(activityStopMilestone('not json', 'success', false)).toBeUndefined()
    expect(activityStopMilestone({ outcome: 'other' }, 'success', false)).toBeUndefined()
    expect(activityStopMilestone(undefined, 'success', false)).toBeUndefined()
  })

  it('reads a carried-out stop whose call errored from what the action recorded', () => {
    const recorded = JSON.stringify({
      activityId: 'a',
      outcome: 'refused',
      code: 'approval-replayed',
    })
    expect(activityStopMilestone('Error: boom', 'errored', false, recorded)).toEqual({
      tone: 'warning',
      title: 'Not stopped — that approval was already used',
    })
  })
})
