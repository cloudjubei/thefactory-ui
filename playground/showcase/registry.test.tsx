import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseDesignPlaygroundManifest } from 'thefactory-tools/utils'
import {
  SCENE_GROUPS,
  SCENES,
  playgroundMessage,
  routeOf,
  sceneHref,
  sceneProblems,
  themeOf,
} from './registry'
import type { Scene } from './types'

describe('showcase registry', () => {
  it('has well-formed, unique scene and state ids', () => {
    expect(sceneProblems(SCENES)).toEqual([])
  })

  it('lists every scene under a group the index shows', () => {
    for (const scene of SCENES) expect(SCENE_GROUPS).toContain(scene.group)
  })

  it('seeds the chat surfaces, the run page, the Design tab and the primitives', () => {
    const ids = SCENES.map((s) => s.id)
    for (const id of [
      'message-bubbles',
      'tool-call-rows',
      'approval-panel',
      'approval-card',
      'chat-change-card',
      'run-chat-proposal',
      'run-land-notice',
      'docked-chat-header',
      'run-header',
      'run-time-details',
      'going-in-circles',
      'run-chat-dock',
      'running-vs-done',
      'design-current',
      'design-proposals',
      'design-history',
      'design-tidy',
      'button',
      'modal',
      'toast',
    ])
      expect(ids).toContain(id)
  })

  it('pairs every accepted-unchecked state with a plain-pass base that never says it', () => {
    const scene = SCENES.find((s) => s.id === 'accepted-unchecked')
    const said = /accepted unchecked|never proven/i
    const states = scene?.states ?? []
    const bases = states.filter((s) => s.id.endsWith('-plain-pass') || s.id.endsWith('-passed'))
    expect(bases).toHaveLength(6)
    for (const base of bases) {
      const surface = base.id.replace(/-(plain-pass|passed)$/, '')
      const accepted = states.filter((s) => s.id.startsWith(`${surface}-accepted`))
      expect(accepted.length, surface).toBeGreaterThan(0)
      expect(renderToStaticMarkup(<>{base.render()}</>), base.id).not.toMatch(said)
      for (const state of accepted) {
        expect(renderToStaticMarkup(<>{state.render()}</>), state.id).toMatch(said)
      }
    }
  })

  it('shows the stash dialog leaving untracked files out and taking them', () => {
    const stash = SCENES.find((s) => s.id === 'git-stash')
    expect(stash?.states.map((s) => s.id)).toEqual(['tracked-only', 'include-untracked'])
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

  describe('the Playground', () => {
    const toggle: Scene = {
      id: 'pill',
      title: 'Pill',
      component: 'Pill',
      group: 'Primitives',
      description: '',
      states: [{ id: 'a', title: 'A', render: () => null }],
      controls: [
        {
          id: 'status',
          label: 'Status',
          kind: 'choice',
          options: [
            { id: 'running', label: 'Running' },
            { id: 'done', label: 'Done' },
          ],
          default: 'running',
        },
        { id: 'unread', label: 'Unread', kind: 'toggle', default: false },
      ],
      presets: [{ id: 'done', name: 'Done', values: { status: 'done' } }],
      play: (values) => <span>{JSON.stringify(values)}</span>,
    }
    const plain = {
      ...toggle,
      id: 'plain',
      controls: undefined,
      presets: undefined,
      play: undefined,
    }

    it('opens a scene set by its controls, the default for what is missing or not allowed', () => {
      const route = routeOf('?scene=pill&play=1&status=done&unread=maybe&theme=dark', [toggle])
      expect(route).toEqual({
        kind: 'play',
        scene: toggle,
        values: { status: 'done', unread: 'false' },
      })
      expect(routeOf('?scene=plain&play=1', [plain])).toEqual({ kind: 'missing', sceneId: 'plain' })
      expect(routeOf('?scene=pill&play=0', [toggle])).toEqual({ kind: 'scene', scene: toggle })
      expect(routeOf('?scene=plain&state=a&play=1&theme=dark', [plain])).toEqual({
        kind: 'state',
        scene: plain,
        state: plain.states[0],
      })
    })

    it('reads the theme a page asks for', () => {
      expect(themeOf('?theme=dark')).toBe('dark')
      expect(themeOf('?theme=light')).toBe('light')
      expect(themeOf('?theme=blue')).toBeUndefined()
      expect(themeOf('')).toBeUndefined()
    })

    it('posts the scenes it can set, as the Design view reads them', () => {
      const message = playgroundMessage([
        toggle,
        plain,
        { ...toggle, id: 'page', kind: 'screen', controls: undefined, presets: undefined },
      ])
      expect(parseDesignPlaygroundManifest(message)).toEqual({
        scenes: [
          {
            id: 'pill',
            name: 'Pill',
            kind: 'component',
            group: 'Primitives',
            controls: toggle.controls,
            presets: toggle.presets,
          },
          {
            id: 'page',
            name: 'Pill',
            kind: 'screen',
            group: 'Primitives',
            controls: [],
            presets: [],
          },
        ],
      })
    })

    it('posts every scene of the showcase with controls, and each plays', () => {
      const posted = parseDesignPlaygroundManifest(playgroundMessage())!.scenes
      expect(posted.map((s) => s.id)).toEqual(
        expect.arrayContaining(['run-header', 'run-model-chip']),
      )
      for (const scene of SCENES.filter((s) => s.play)) {
        const route = routeOf(`?scene=${scene.id}&play=1`)
        expect(route.kind).toBe('play')
        if (route.kind === 'play')
          expect(renderToStaticMarkup(<>{scene.play!(route.values)}</>)).not.toBe('')
      }
    })

    it('reports controls a URL cannot carry and presets no control takes', () => {
      const bad: Scene = {
        ...toggle,
        controls: [
          ...toggle.controls!,
          { id: 'theme', label: 'Theme', kind: 'toggle', default: false },
          { id: 'unread', label: 'Unread', kind: 'toggle', default: false },
          { id: 'Big', label: 'Big', kind: 'toggle', default: false },
        ],
        presets: [
          { id: 'p', name: 'P', values: { status: 'gone', unread: 'true', nope: 'x' } },
          { id: 'q', name: 'Q', values: { unread: 'yes' } },
        ],
      }
      expect(sceneProblems([bad, { ...plain, controls: toggle.controls }])).toEqual([
        'pill: control "theme" cannot be a URL parameter',
        'pill: control "unread" used twice',
        'pill: control "Big" cannot be a URL parameter',
        'pill: preset "p" sets status=gone',
        'pill: preset "p" sets nope=x',
        'pill: preset "q" sets unread=yes',
        'scene "plain": controls but no play',
      ])
    })
  })
})
