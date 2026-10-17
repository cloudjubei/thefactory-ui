import { describe, expect, it } from 'vitest'
import type { DesignIndex, DesignPlaygroundScene } from '../api'
import {
  designPlaygroundFrameUrl,
  designPlaygroundPresetName,
  designPlaygroundSaveTargets,
  designPlaygroundSavedAt,
  designPlaygroundSceneGroups,
} from './designPlayground'

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
