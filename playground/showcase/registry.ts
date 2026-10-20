import { ACTIVITY_STOP_SCENES } from '../scenes/activityStop'
import { AGENT_TYPE_SCENES } from '../scenes/agentTypes'
import { BACKEND_CONNECTION_SCENES } from '../scenes/backendConnection'
import { APP_BRIDGE_ASK_SCENES } from '../scenes/appBridgeAsks'
import { APP_FEATURE_REQUEST_SCENES } from '../scenes/appFeatureRequest'
import { CHAT_SCENES } from '../scenes/chat'
import { CHAT_STOP_SCENES } from '../scenes/chatStop'
import { CIRCLING_SCENES } from '../scenes/circling'
import { CHAT_CHANGES_SCENES } from '../scenes/chatChanges'
import { CHAT_CHANGES_DOCK_SCENES } from '../scenes/chatChangesDock'
import { CHECKS_UNFINISHED_SCENES } from '../scenes/checksUnfinished'
import { COMMIT_RECEIPT_SCENES } from '../scenes/commitReceipt'
import { CHAT_PAUSED_RUN_SCENES } from '../scenes/chatPausedRun'
import { DESIGN_SCENES } from '../scenes/design'
import { DROPPED_CHANGE_SCENES } from '../scenes/droppedChange'
import { FEATURE_POOL_SCENES } from '../scenes/featurePool'
import { FEATURE_REQUEST_CARD_SCENES } from '../scenes/featureRequestCard'
import { FEATURE_REQUEST_WAIT_CYCLE_SCENES } from '../scenes/featureRequestWaitCycle'
import { FILE_SUGGESTION_SCENES } from '../scenes/fileSuggestions'
import { GIT_STASH_SCENES } from '../scenes/gitStash'
import { KNOWLEDGE_EVALUATION_SCENES } from '../scenes/knowledgeEvaluation'
import { LAND_NOTICE_SCENES } from '../scenes/landNotice'
import { LAUNCH_MODEL_CHIP_SCENES } from '../scenes/launchModelChip'
import { LEAVE_GUARD_SCENES } from '../scenes/leaveGuard'
import { MODEL_EFFORT_SCENES } from '../scenes/modelEffort'
import { OPEN_RUN_SCENES } from '../scenes/openRun'
import { PRIMITIVE_SCENES } from '../scenes/primitives'
import { PARK_CLOSING_SCENES } from '../scenes/parkClosing'
import { PROCESS_SCENES } from '../scenes/process'
import { PROCESS_CHECKS_SCENES } from '../scenes/processChecks'
import { PROCESS_FEATURE_SCENES } from '../scenes/processFeatures'
import { PROCESS_MODEL_SCENES } from '../scenes/processModel'
import { PROOF_CHANGE_SCENES } from '../scenes/proofChange'
import { REGENERATED_MERGE_SCENES } from '../scenes/regeneratedMerge'
import { RUNNING_TONE_SCENES } from '../scenes/runningTone'
import { SIBLING_STABLE_BRANCH_SCENES } from '../scenes/siblingStableBranch'
import { RUN_TIME_DETAILS_SCENES } from '../scenes/runTimeDetails'
import { STORY_CHANGE_ERROR_SCENES } from '../scenes/storyChangeErrors'
import { STORY_WORK_SCENES } from '../scenes/storyWork'
import { UI_IMPACT_SCENES } from '../scenes/uiImpact'
import { USAGE_SCENES } from '../scenes/usage'
import { WORK_LAUNCH_SCENES } from '../scenes/workLaunch'
import { WORKFLOW_GUARD_SCENES } from '../scenes/workflowGuards'
import {
  DESIGN_PLAYGROUND_PLAY_PARAM,
  DESIGN_PLAYGROUND_SCENE_PARAM,
  DESIGN_PLAYGROUND_SCENES_MESSAGE,
  DESIGN_PLAYGROUND_THEME_PARAM,
} from 'thefactory-tools/constants'
import type { DesignPlaygroundTheme } from 'thefactory-tools/types'
import { designPlaygroundValues } from 'thefactory-tools/utils'
import type { Scene, SceneGroup, SceneState } from './types'

/**
 * Every scene the showcase serves, in the order the index lists them. A visible change to a
 * component adds or updates its scene here — see "Component showcase" in docs/ARCHITECTURE.md.
 */
export const SCENES: readonly Scene[] = [
  ...CHAT_SCENES,
  ...FILE_SUGGESTION_SCENES,
  ...MODEL_EFFORT_SCENES,
  ...CHAT_STOP_SCENES,
  ...ACTIVITY_STOP_SCENES,
  ...CHAT_CHANGES_SCENES,
  ...CHAT_CHANGES_DOCK_SCENES,
  ...CHECKS_UNFINISHED_SCENES,
  ...COMMIT_RECEIPT_SCENES,
  ...CHAT_PAUSED_RUN_SCENES,
  ...FEATURE_REQUEST_CARD_SCENES,
  ...FEATURE_REQUEST_WAIT_CYCLE_SCENES,
  ...OPEN_RUN_SCENES,
  ...LAND_NOTICE_SCENES,
  ...PROCESS_SCENES,
  ...RUN_TIME_DETAILS_SCENES,
  ...PROCESS_CHECKS_SCENES,
  ...SIBLING_STABLE_BRANCH_SCENES,
  ...PROCESS_FEATURE_SCENES,
  ...PROCESS_MODEL_SCENES,
  ...PROOF_CHANGE_SCENES,
  ...UI_IMPACT_SCENES,
  ...PARK_CLOSING_SCENES,
  ...DROPPED_CHANGE_SCENES,
  ...CIRCLING_SCENES,
  ...REGENERATED_MERGE_SCENES,
  ...RUNNING_TONE_SCENES,
  ...STORY_WORK_SCENES,
  ...STORY_CHANGE_ERROR_SCENES,
  ...WORK_LAUNCH_SCENES,
  ...LAUNCH_MODEL_CHIP_SCENES,
  ...KNOWLEDGE_EVALUATION_SCENES,
  ...FEATURE_POOL_SCENES,
  ...AGENT_TYPE_SCENES,
  ...WORKFLOW_GUARD_SCENES,
  ...DESIGN_SCENES,
  ...LEAVE_GUARD_SCENES,
  ...APP_BRIDGE_ASK_SCENES,
  ...APP_FEATURE_REQUEST_SCENES,
  ...GIT_STASH_SCENES,
  ...USAGE_SCENES,
  ...BACKEND_CONNECTION_SCENES,
  ...PRIMITIVE_SCENES,
]

export const SCENE_GROUPS: readonly SceneGroup[] = [
  'Chat',
  'Process',
  'Design',
  'Settings',
  'Primitives',
]

/** What a playground URL asks for. */
export type SceneRoute =
  | { kind: 'index' }
  | { kind: 'scene'; scene: Scene }
  | { kind: 'state'; scene: Scene; state: SceneState }
  | { kind: 'play'; scene: Scene; values: Record<string, string> }
  | { kind: 'missing'; sceneId: string; stateId?: string }

/** The URL of a scene (every state) or of one of its states. */
export function sceneHref(sceneId: string, stateId?: string): string {
  const params = new URLSearchParams({ scene: sceneId })
  if (stateId !== undefined) params.set('state', stateId)
  return `?${params.toString()}`
}

/**
 * Read `?scene=<id>&state=<state>` against `scenes` — or `?scene=<id>&play=1&<control>=<value>`,
 * the scene set by its controls for the Design view's Playground. A state named wins, so a design
 * state saved at a state's address is captured as that state.
 */
export function routeOf(search: string, scenes: readonly Scene[] = SCENES): SceneRoute {
  const params = new URLSearchParams(search)
  const sceneId = params.get(DESIGN_PLAYGROUND_SCENE_PARAM)
  const stateId = params.get('state') ?? undefined
  if (!sceneId) return { kind: 'index' }
  const scene = scenes.find((s) => s.id === sceneId)
  if (!scene) return { kind: 'missing', sceneId, ...(stateId !== undefined ? { stateId } : {}) }
  if (stateId === undefined && params.get(DESIGN_PLAYGROUND_PLAY_PARAM) === '1') {
    if (!scene.play) return { kind: 'missing', sceneId }
    const controls = scene.controls ?? []
    const values = designPlaygroundValues(
      { id: scene.id, name: scene.title, kind: 'component', controls, presets: [] },
      search,
    )
    return { kind: 'play', scene, values }
  }
  if (stateId === undefined) return { kind: 'scene', scene }
  const state = scene.states.find((s) => s.id === stateId)
  return state ? { kind: 'state', scene, state } : { kind: 'missing', sceneId, stateId }
}

/** The theme a playground URL asks for; left out, the showcase's own light theme. */
export function themeOf(search: string): DesignPlaygroundTheme | undefined {
  const theme = new URLSearchParams(search).get(DESIGN_PLAYGROUND_THEME_PARAM)
  return theme === 'dark' || theme === 'light' ? theme : undefined
}

/** What the showcase posts to a Design view framing it: every scene the Playground can set. */
export function playgroundMessage(scenes: readonly Scene[] = SCENES) {
  return {
    type: DESIGN_PLAYGROUND_SCENES_MESSAGE,
    scenes: scenes
      .filter((s) => s.play)
      .map((s) => ({
        id: s.id,
        name: s.title,
        kind: s.kind ?? 'component',
        group: s.group,
        controls: s.controls ?? [],
        presets: s.presets ?? [],
      })),
  }
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED_PARAMS = new Set([
  DESIGN_PLAYGROUND_SCENE_PARAM,
  DESIGN_PLAYGROUND_PLAY_PARAM,
  DESIGN_PLAYGROUND_THEME_PARAM,
  'state',
])

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
    problems.push(...playProblems(scene))
  }
  return problems
}

/** What is wrong with a scene's controls: a name its URL cannot carry, or a preset no control takes. */
function playProblems(scene: Scene): string[] {
  const problems: string[] = []
  const controls = scene.controls ?? []
  if (controls.length > 0 && !scene.play) problems.push(`scene "${scene.id}": controls but no play`)
  const ids = new Set<string>()
  for (const control of controls) {
    if (!ID.test(control.id) || RESERVED_PARAMS.has(control.id)) {
      problems.push(`${scene.id}: control "${control.id}" cannot be a URL parameter`)
    }
    if (ids.has(control.id)) problems.push(`${scene.id}: control "${control.id}" used twice`)
    ids.add(control.id)
  }
  for (const preset of scene.presets ?? []) {
    for (const [key, value] of Object.entries(preset.values)) {
      const control = controls.find((c) => c.id === key)
      const allowed =
        control?.kind === 'toggle'
          ? value === 'true' || value === 'false'
          : control?.options.some((o) => o.id === value)
      if (!allowed) problems.push(`${scene.id}: preset "${preset.id}" sets ${key}=${value}`)
    }
  }
  return problems
}
