import { CHAT_SCENES } from '../scenes/chat'
import { PRIMITIVE_SCENES } from '../scenes/primitives'
import type { Scene, SceneGroup, SceneState } from './types'

/**
 * Every scene the showcase serves, in the order the index lists them. A visible change to a
 * component adds or updates its scene here — see "Component showcase" in docs/ARCHITECTURE.md.
 */
export const SCENES: readonly Scene[] = [...CHAT_SCENES, ...PRIMITIVE_SCENES]

export const SCENE_GROUPS: readonly SceneGroup[] = ['Chat', 'Primitives']

/** What a playground URL asks for. */
export type SceneRoute =
  | { kind: 'index' }
  | { kind: 'scene'; scene: Scene }
  | { kind: 'state'; scene: Scene; state: SceneState }
  | { kind: 'missing'; sceneId: string; stateId?: string }

/** The URL of a scene (every state) or of one of its states. */
export function sceneHref(sceneId: string, stateId?: string): string {
  const params = new URLSearchParams({ scene: sceneId })
  if (stateId !== undefined) params.set('state', stateId)
  return `?${params.toString()}`
}

/** Read `?scene=<id>&state=<state>` against `scenes`. */
export function routeOf(search: string, scenes: readonly Scene[] = SCENES): SceneRoute {
  const params = new URLSearchParams(search)
  const sceneId = params.get('scene')
  const stateId = params.get('state') ?? undefined
  if (!sceneId) return { kind: 'index' }
  const scene = scenes.find((s) => s.id === sceneId)
  if (!scene) return { kind: 'missing', sceneId, ...(stateId !== undefined ? { stateId } : {}) }
  if (stateId === undefined) return { kind: 'scene', scene }
  const state = scene.states.find((s) => s.id === stateId)
  return state ? { kind: 'state', scene, state } : { kind: 'missing', sceneId, stateId }
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** What is wrong with a set of scenes — ids that would make two URLs collide or read badly. */
export function sceneProblems(scenes: readonly Scene[]): string[] {
  const problems: string[] = []
  const sceneIds = new Set<string>()
  for (const scene of scenes) {
    if (!ID.test(scene.id)) problems.push(`scene "${scene.id}": id is not kebab-case`)
    if (sceneIds.has(scene.id)) problems.push(`scene "${scene.id}": id used twice`)
    sceneIds.add(scene.id)
    if (scene.states.length === 0) problems.push(`scene "${scene.id}": no states`)
    const stateIds = new Set<string>()
    for (const state of scene.states) {
      if (!ID.test(state.id)) problems.push(`${scene.id}/${state.id}: id is not kebab-case`)
      if (stateIds.has(state.id)) problems.push(`${scene.id}/${state.id}: id used twice`)
      stateIds.add(state.id)
    }
  }
  return problems
}
