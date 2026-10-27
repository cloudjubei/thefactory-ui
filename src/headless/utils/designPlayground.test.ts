import { describe, expect, it } from 'vitest'
import type { DesignIndex, DesignPlaygroundScene } from '../api'
import type { GetDesignPlaygroundResponse } from '../api'
import {
  designPlaygroundElapsed,
  designPlaygroundFrameNext,
  designPlaygroundFrameUrl,
  designPlaygroundPollMs,
  designPlaygroundPresetName,
  designPlaygroundSaveLabel,
  designPlaygroundSaveTargets,
  designPlaygroundSavedAt,
  designPlaygroundSceneGroups,
  designPlaygroundView,
} from './designPlayground'
import {
  DESIGN_PLAYGROUND_IDLE_POLL_MS,
  DESIGN_PLAYGROUND_POLL_MS,
  DESIGN_PLAYGROUND_UPDATED_MS,
} from './designViewConstants'

const at = { createdAt: 1, updatedAt: 1 }
const screen = (id: string, name: string, kind: 'screen' | 'component', appId = 'a1') => ({
  id,
  appId,
  name,
  kind,
  aliases: [],
  uses: [],
  variants: [],
  ...at,
})

const index: DesignIndex = {
  version: 2,
  apps: [{ id: 'a1', name: 'UI', kind: 'product', aliases: [], ...at }],
  screens: [
    screen('c1', 'Run header', 'component'),
    screen('s1', 'Process run page', 'screen'),
    screen('c2', 'Approval card', 'component'),
    screen('s2', 'Chat', 'screen'),
    screen('x1', 'Elsewhere', 'screen', 'a2'),
  ],
  states: [
    {
      id: 'st1',
      screenId: 'c1',
      name: 'Running',
      address: 'scene=run-header&level=top&unread=false',
      ...at,
    },
  ],
  versions: [],
  proposals: [],
  tidyPlans: [],
}

const header: DesignPlaygroundScene = {
  id: 'run-header',
  name: 'Run header',
  kind: 'component',
  group: 'Process',
  controls: [],
  presets: [
    { id: 'top', name: 'Top-level run', values: { level: 'top', unread: 'false' } },
    { id: 'nested', name: 'Nested run', values: { level: 'nested' } },
  ],
}

describe('designPlayground', () => {
  it('frames the served playground with the view token, at an address and theme when given', () => {
    expect(designPlaygroundFrameUrl('http://h/', 'p 1', 't&k')).toBe(
      'http://h/api/v1/projects/p%201/view/_playground/?viewToken=t%26k',
    )
    expect(designPlaygroundFrameUrl('', 'p1', 't', 'scene=a&x=1', 'dark')).toBe(
      '/api/v1/projects/p1/view/_playground/?viewToken=t&scene=a&x=1&play=1&theme=dark',
    )
  })

  it('files a save on the scene’s own screen first, then any other screen of the app', () => {
    expect(designPlaygroundSaveTargets(index, 'a1', header)).toEqual([
      { key: 'c1', label: 'Components › Run header', target: { screenId: 'c1' } },
      { key: 's2', label: 'Screens › Chat', target: { screenId: 's2' } },
      { key: 's1', label: 'Screens › Process run page', target: { screenId: 's1' } },
      { key: 'c2', label: 'Components › Approval card', target: { screenId: 'c2' } },
    ])
    const page = { ...header, id: 'run-page', name: 'Run page', kind: 'screen' as const }
    expect(designPlaygroundSaveTargets(index, 'a1', page)[0]).toEqual({
      key: 'new',
      label: 'Screens › Run page',
      target: { screenName: 'Run page', screenKind: 'screen' },
    })
    expect(designPlaygroundSaveTargets(index, 'nope', header)).toEqual([
      {
        key: 'new',
        label: 'Components › Run header',
        target: { screenName: 'Run header', screenKind: 'component' },
      },
    ])
  })

  it('finds the state an address is saved as already', () => {
    expect(
      designPlaygroundSavedAt(index, 'a1', 'unread=false&level=top&scene=run-header'),
    ).toMatchObject({ screen: { id: 'c1' }, state: { id: 'st1' } })
    expect(designPlaygroundSavedAt(index, 'a1', 'scene=run-header&level=deep')).toBeUndefined()
    expect(designPlaygroundSavedAt(index, undefined, 'scene=run-header')).toBeUndefined()
  })

  it('names a setting by the preset it is', () => {
    expect(designPlaygroundPresetName(header, { level: 'top', unread: 'false' })).toBe(
      'Top-level run',
    )
    expect(designPlaygroundPresetName(header, { level: 'nested', unread: 'true' })).toBe(
      'Nested run',
    )
    expect(designPlaygroundPresetName(header, { level: 'top', unread: 'true' })).toBeUndefined()
  })

  it('lists the scenes by group, in the order they come', () => {
    const scene = (id: string, group?: string): DesignPlaygroundScene => ({
      ...header,
      id,
      ...(group ? { group } : { group: undefined }),
    })
    expect(
      designPlaygroundSceneGroups([
        scene('a', 'Process'),
        scene('b', 'Chat'),
        scene('c', 'Process'),
        scene('d'),
      ]).map((g) => [g.group, g.scenes.map((s) => s.id)]),
    ).toEqual([
      ['Process', ['a', 'c']],
      ['Chat', ['b']],
      ['Other', ['d']],
    ])
  })
})

const NOW = 1_000_000
const ready = (
  over: Partial<Extract<GetDesignPlaygroundResponse, { status: 'ready' }>> = {},
): GetDesignPlaygroundResponse => ({
  status: 'ready',
  sha: 'abc',
  dirty: true,
  build: 'b2',
  builtAt: NOW - 2_000,
  ...over,
})

describe('designPlaygroundElapsed', () => {
  it('reads whole seconds under a minute, minutes and padded seconds after, never below zero', () => {
    expect(designPlaygroundElapsed(0)).toBe('0s')
    expect(designPlaygroundElapsed(12_900)).toBe('12s')
    expect(designPlaygroundElapsed(65_000)).toBe('1m 05s')
    expect(designPlaygroundElapsed(3_600_000)).toBe('60m 00s')
    expect(designPlaygroundElapsed(-5_000)).toBe('0s')
  })
})

describe('designPlaygroundFrameNext', () => {
  it('opens on the first build without calling it a refresh', () => {
    expect(designPlaygroundFrameNext({}, 'b1', NOW)).toEqual({ build: 'b1' })
  })

  it('keeps the frame on the same build', () => {
    const frame = { build: 'b1', refreshedAt: 5 }
    expect(designPlaygroundFrameNext(frame, 'b1', NOW)).toBe(frame)
  })

  it('moves to a newer build, saying when', () => {
    expect(designPlaygroundFrameNext({ build: 'b1' }, 'b2', NOW)).toEqual({
      build: 'b2',
      refreshedAt: NOW,
    })
    expect(designPlaygroundFrameNext({ build: 'b1', refreshedAt: 5 }, 'b2', NOW)).toEqual({
      build: 'b2',
      refreshedAt: NOW,
    })
  })
})

describe('designPlaygroundView', () => {
  it('shows nothing for a project with no playground', () => {
    expect(designPlaygroundView({ status: 'none' }, {}, NOW)).toEqual({ kind: 'none' })
  })

  it('says the first build is running, for how long once its start is known', () => {
    expect(designPlaygroundView(undefined, {}, NOW)).toEqual({
      kind: 'building',
      label: 'Building the playground…',
      ticking: false,
    })
    expect(designPlaygroundView({ status: 'stopped' }, {}, NOW)).toEqual({
      kind: 'building',
      label: 'Building the playground…',
      ticking: false,
    })
    expect(designPlaygroundView({ status: 'building', startedAt: NOW - 12_000 }, {}, NOW)).toEqual({
      kind: 'building',
      label: 'Building the playground… 12s',
      ticking: true,
    })
  })

  it('says why the first build failed', () => {
    expect(designPlaygroundView({ status: 'failed', error: 'boom' }, {}, NOW)).toEqual({
      kind: 'failed',
      error: 'boom',
    })
  })

  it('shows a ready build calmly, with nothing above it', () => {
    expect(designPlaygroundView(ready(), { build: 'b2' }, NOW)).toEqual({
      kind: 'ready',
      build: 'b2',
      ticking: false,
    })
  })

  it('keeps the frame and says a rebuild is running, saves waiting for it', () => {
    expect(
      designPlaygroundView(
        ready({ rebuilding: true, rebuildStartedAt: NOW - 65_000 }),
        { build: 'b2' },
        NOW,
      ),
    ).toEqual({
      kind: 'ready',
      build: 'b2',
      bar: { kind: 'rebuilding', label: 'Rebuilding with your latest changes… 1m 05s' },
      saveHint: 'Saves after the rebuild',
      ticking: true,
    })
  })

  it('says the rebuild failed while the build before it is shown, and why', () => {
    expect(designPlaygroundView(ready({ lastError: 'Type error' }), { build: 'b2' }, NOW)).toEqual({
      kind: 'ready',
      build: 'b2',
      bar: {
        kind: 'rebuild-failed',
        label: 'The rebuild failed — showing the previous build',
        error: 'Type error',
      },
      ticking: false,
    })
  })

  it('says a rebuild running again over a failed one, not the failure', () => {
    const view = designPlaygroundView(
      ready({ lastError: 'Type error', rebuilding: true, rebuildStartedAt: NOW }),
      { build: 'b2' },
      NOW,
    )
    expect(view).toMatchObject({ bar: { kind: 'rebuilding' } })
  })

  it('confirms a refresh to the newer build for a few seconds, fading at the end', () => {
    const shown = (refreshedAt: number) =>
      designPlaygroundView(ready(), { build: 'b2', refreshedAt }, NOW)
    expect(shown(NOW - 500)).toEqual({
      kind: 'ready',
      build: 'b2',
      bar: {
        kind: 'updated',
        label: 'Updated to your latest changes',
        at: NOW - 2_000,
        fading: false,
      },
      ticking: true,
    })
    expect(shown(NOW - DESIGN_PLAYGROUND_UPDATED_MS + 500)).toMatchObject({
      bar: { kind: 'updated', fading: true },
    })
    expect(shown(NOW - DESIGN_PLAYGROUND_UPDATED_MS)).toEqual({
      kind: 'ready',
      build: 'b2',
      ticking: false,
    })
    expect(shown(NOW + 300)).toMatchObject({ bar: { kind: 'updated', fading: false } })
  })
})

describe('designPlaygroundPollMs', () => {
  it('asks again soon while a build runs or a save waits on one', () => {
    expect(designPlaygroundPollMs({ status: 'building', startedAt: 1 }, false)).toBe(
      DESIGN_PLAYGROUND_POLL_MS,
    )
    expect(designPlaygroundPollMs({ status: 'stopped' }, false)).toBe(DESIGN_PLAYGROUND_POLL_MS)
    expect(designPlaygroundPollMs(ready({ rebuilding: true }), false)).toBe(
      DESIGN_PLAYGROUND_POLL_MS,
    )
    expect(designPlaygroundPollMs(ready(), true)).toBe(DESIGN_PLAYGROUND_POLL_MS)
  })

  it('looks in now and then while ready, so a build started elsewhere shows', () => {
    expect(designPlaygroundPollMs(ready(), false)).toBe(DESIGN_PLAYGROUND_IDLE_POLL_MS)
    expect(designPlaygroundPollMs(ready({ lastError: 'x' }), false)).toBe(
      DESIGN_PLAYGROUND_IDLE_POLL_MS,
    )
  })

  it('stops for no playground and a failed first build, until tried again', () => {
    expect(designPlaygroundPollMs({ status: 'none' }, true)).toBeUndefined()
    expect(designPlaygroundPollMs({ status: 'failed', error: 'x' }, true)).toBeUndefined()
  })
})

describe('designPlaygroundSaveLabel', () => {
  it('says a save waits for the build it started, then captures', () => {
    expect(designPlaygroundSaveLabel(undefined, false)).toBe('Saving… building first')
    expect(designPlaygroundSaveLabel({ status: 'building', startedAt: 1 }, false)).toBe(
      'Saving… building first',
    )
    expect(designPlaygroundSaveLabel(ready({ rebuilding: true }), false)).toBe(
      'Saving… building first',
    )
    expect(designPlaygroundSaveLabel(ready(), false)).toBe(
      'Capturing light and dark, desktop and phone…',
    )
    expect(designPlaygroundSaveLabel(ready({ lastError: 'x' }), false)).toBe(
      'Capturing light and dark, desktop and phone…',
    )
  })

  it('says it saves after a rebuild that was already running when it was asked', () => {
    expect(designPlaygroundSaveLabel(ready({ rebuilding: true }), true)).toBe(
      'Saving after the rebuild…',
    )
    expect(designPlaygroundSaveLabel(ready(), true)).toBe(
      'Capturing light and dark, desktop and phone…',
    )
  })
})
