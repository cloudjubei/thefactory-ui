import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SCENE_GROUPS, SCENES, routeOf, sceneHref, sceneProblems } from './registry'
import type { Scene } from './types'

describe('showcase registry', () => {
  it('has well-formed, unique scene and state ids', () => {
    expect(sceneProblems(SCENES)).toEqual([])
  })

  it('lists every scene under a group the index shows', () => {
    for (const scene of SCENES) expect(SCENE_GROUPS).toContain(scene.group)
  })

  it('seeds the chat surfaces and the primitives', () => {
    const ids = SCENES.map((s) => s.id)
    for (const id of [
      'message-bubbles',
      'tool-call-rows',
      'approval-panel',
      'approval-card',
      'button',
      'modal',
      'toast',
    ])
      expect(ids).toContain(id)
  })

  it('reports a duplicate or badly formed id', () => {
    const scene: Scene = {
      id: 'Bad Id',
      title: 'Bad',
      component: 'Bad',
      group: 'Chat',
      description: '',
      states: [
        { id: 'a', title: 'A', render: () => null },
        { id: 'a', title: 'A again', render: () => null },
      ],
    }
    expect(sceneProblems([scene, { ...scene, states: [] }])).toEqual([
      'scene "Bad Id": id is not kebab-case',
      'Bad Id/a: id used twice',
      'scene "Bad Id": id is not kebab-case',
      'scene "Bad Id": id used twice',
      'scene "Bad Id": no states',
    ])
  })
})

describe('showcase routes', () => {
  it('reads the index, a scene, a state and a miss', () => {
    expect(routeOf('')).toEqual({ kind: 'index' })
    expect(routeOf('?scene=button')).toMatchObject({ kind: 'scene', scene: { id: 'button' } })
    expect(routeOf('?scene=button&state=loading')).toMatchObject({
      kind: 'state',
      scene: { id: 'button' },
      state: { id: 'loading' },
    })
    expect(routeOf('?scene=nope')).toEqual({ kind: 'missing', sceneId: 'nope' })
    expect(routeOf('?scene=button&state=nope')).toEqual({
      kind: 'missing',
      sceneId: 'button',
      stateId: 'nope',
    })
  })

  it('round-trips every state through its URL', () => {
    for (const scene of SCENES) {
      expect(routeOf(sceneHref(scene.id))).toMatchObject({ kind: 'scene', scene: { id: scene.id } })
      for (const state of scene.states) {
        expect(routeOf(sceneHref(scene.id, state.id))).toMatchObject({
          kind: 'state',
          scene: { id: scene.id },
          state: { id: state.id },
        })
      }
    }
  })
})

describe('showcase states', () => {
  // An overlay state portals into document.body, which the server renderer has none of; the
  // capture of its URL is what shows it.
  const inline = SCENES.flatMap((scene) =>
    scene.states
      .filter((s) => !s.overlay)
      .map((state) => [`${scene.id}/${state.id}`, state] as const),
  )

  it.each(inline)('%s renders the same markup on every render', (_, state) => {
    const first = renderToStaticMarkup(<>{state.render()}</>)
    expect(first.length).toBeGreaterThan(0)
    expect(renderToStaticMarkup(<>{state.render()}</>)).toBe(first)
  })
})
