import {
  designPlaygroundUrl,
  findDesignScreen,
  findDesignStateAtAddress,
} from 'thefactory-tools/utils'
import type {
  DesignIndex,
  DesignPlaygroundScene,
  DesignPlaygroundTheme,
  DesignScreen,
  DesignScreenKind,
  DesignState,
  GetDesignPlaygroundResponse,
} from '../api'
import {
  DESIGN_PLAYGROUND_FADE_MS,
  DESIGN_PLAYGROUND_IDLE_POLL_MS,
  DESIGN_PLAYGROUND_POLL_MS,
  DESIGN_PLAYGROUND_UPDATED_MS,
  DESIGN_TEXT,
} from './designViewConstants'
import type {
  DesignPlaygroundBar,
  DesignPlaygroundFrame,
  DesignPlaygroundSaveTarget,
  DesignPlaygroundSceneGroup,
  DesignPlaygroundView,
} from './designViewTypes'

function kindLabel(kind: DesignScreenKind): string {
  return kind === 'component' ? DESIGN_TEXT.components : DESIGN_TEXT.screens
}

/**
 * The frame's address: the project's served playground, let in by the view
 * token, showing `address` in `theme` when one is given. Pure.
 */
export function designPlaygroundFrameUrl(
  apiBase: string,
  projectId: string,
  viewToken: string,
  address?: string,
  theme: DesignPlaygroundTheme = 'light',
): string {
  const base = `${apiBase.replace(/\/+$/, '')}/api/v1/projects/${encodeURIComponent(projectId)}/view/_playground/?viewToken=${encodeURIComponent(viewToken)}`
  return address ? designPlaygroundUrl(base, address, theme) : base
}

/**
 * Where a state saved from a scene can be filed: the scene's own screen — the
 * one of its name, or a new one of its kind — then the app's other screens,
 * then its other components, each by name. Pure.
 */
export function designPlaygroundSaveTargets(
  index: DesignIndex,
  appId: string,
  scene: DesignPlaygroundScene,
): DesignPlaygroundSaveTarget[] {
  const own = findDesignScreen(index, appId, scene.name)
  const first: DesignPlaygroundSaveTarget = own
    ? { key: own.id, label: `${kindLabel(own.kind)} › ${own.name}`, target: { screenId: own.id } }
    : {
        key: 'new',
        label: `${kindLabel(scene.kind)} › ${scene.name}`,
        target: { screenName: scene.name, screenKind: scene.kind },
      }
  const rank = (s: DesignScreen) => (s.kind === 'screen' ? 0 : 1)
  const rest = index.screens
    .filter((s) => s.appId === appId && s.id !== own?.id)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((s) => ({
      key: s.id,
      label: `${kindLabel(s.kind)} › ${s.name}`,
      target: { screenId: s.id },
    }))
  return [first, ...rest]
}

/** The state of the app an address is saved as already, with its screen. Pure. */
export function designPlaygroundSavedAt(
  index: DesignIndex,
  appId: string | undefined,
  address: string,
): { screen: DesignScreen; state: DesignState } | undefined {
  return appId ? findDesignStateAtAddress(index, appId, address) : undefined
}

/** The name of the scene's preset a setting is — every value the preset names, the same. Pure. */
export function designPlaygroundPresetName(
  scene: DesignPlaygroundScene,
  values: Record<string, string>,
): string | undefined {
  return scene.presets.find((p) => Object.entries(p.values).every(([k, v]) => values[k] === v))
    ?.name
}

/** The scenes by group, groups and scenes in the order they come. Pure. */
export function designPlaygroundSceneGroups(
  scenes: readonly DesignPlaygroundScene[],
): DesignPlaygroundSceneGroup[] {
  const groups: DesignPlaygroundSceneGroup[] = []
  for (const scene of scenes) {
    const name = scene.group ?? DESIGN_TEXT.otherScenes
    const group = groups.find((g) => g.group === name)
    if (group) group.scenes.push(scene)
    else groups.push({ group: name, scenes: [scene] })
  }
  return groups
}

/** A build's running time: `12s`, `1m 05s`. Pure. */
export function designPlaygroundElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * The frame once `build` is served: kept on the build it shows; moved to a
 * newer one — reloaded at the address it is on — saying when. Pure.
 */
export function designPlaygroundFrameNext(
  frame: DesignPlaygroundFrame,
  build: string,
  now: number,
): DesignPlaygroundFrame {
  if (frame.build === build) return frame
  return frame.build ? { build, refreshedAt: now } : { build }
}

function shownBar(
  status: Extract<GetDesignPlaygroundResponse, { status: 'ready' }>,
  frame: DesignPlaygroundFrame,
  now: number,
): DesignPlaygroundBar | undefined {
  if (status.rebuilding) {
    return {
      kind: 'rebuilding',
      label: DESIGN_TEXT.playgroundRebuilding(
        designPlaygroundElapsed(now - (status.rebuildStartedAt ?? now)),
      ),
    }
  }
  if (status.lastError) {
    return {
      kind: 'rebuild-failed',
      label: DESIGN_TEXT.playgroundRebuildFailed,
      error: status.lastError,
    }
  }
  if (frame.refreshedAt === undefined) return undefined
  const since = now - frame.refreshedAt
  if (since >= DESIGN_PLAYGROUND_UPDATED_MS) return undefined
  return {
    kind: 'updated',
    label: DESIGN_TEXT.playgroundUpdated,
    at: status.builtAt,
    fading: since >= DESIGN_PLAYGROUND_UPDATED_MS - DESIGN_PLAYGROUND_FADE_MS,
  }
}

/**
 * What the Playground shows for its status, the frame it holds and the time:
 * the first build running and for how long; the frame kept while a newer
 * build runs behind it, or after that build failed; a short note once the
 * frame moved to the newer build. Pure.
 */
export function designPlaygroundView(
  status: GetDesignPlaygroundResponse | undefined,
  frame: DesignPlaygroundFrame,
  now: number,
): DesignPlaygroundView {
  if (!status || status.status === 'stopped') {
    return { kind: 'building', label: DESIGN_TEXT.playgroundBuilding, ticking: false }
  }
  if (status.status === 'building') {
    return {
      kind: 'building',
      label: DESIGN_TEXT.playgroundBuildingFor(designPlaygroundElapsed(now - status.startedAt)),
      ticking: true,
    }
  }
  if (status.status === 'failed') return { kind: 'failed', error: status.error }
  if (status.status === 'none') return { kind: 'none' }
  const bar = shownBar(status, frame, now)
  return {
    kind: 'ready',
    build: status.build,
    ...(bar ? { bar } : {}),
    ...(status.rebuilding ? { saveHint: DESIGN_TEXT.playgroundSavesAfterRebuild } : {}),
    ticking: bar?.kind === 'rebuilding' || bar?.kind === 'updated',
  }
}

/**
 * When an open Playground asks for its status again: soon while a build runs
 * or a save waits on one, now and then while ready, never for no playground
 * or a failed first build. Pure.
 */
export function designPlaygroundPollMs(
  status: GetDesignPlaygroundResponse,
  saving: boolean,
): number | undefined {
  if (status.status === 'none' || status.status === 'failed') return undefined
  if (saving || status.status !== 'ready' || status.rebuilding) return DESIGN_PLAYGROUND_POLL_MS
  return DESIGN_PLAYGROUND_IDLE_POLL_MS
}

/**
 * What a save says while it runs: waiting for the build — one already running
 * when it was asked (`waitedOnRebuild`), or the one it started — then
 * capturing. Pure.
 */
export function designPlaygroundSaveLabel(
  status: GetDesignPlaygroundResponse | undefined,
  waitedOnRebuild: boolean,
): string {
  if (status?.status === 'ready' && !status.rebuilding) return DESIGN_TEXT.saving
  return waitedOnRebuild ? DESIGN_TEXT.savingAfterRebuild : DESIGN_TEXT.savingBuildFirst
}
