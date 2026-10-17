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
} from '../api'
import { DESIGN_TEXT } from './designViewConstants'
import type { DesignPlaygroundSaveTarget, DesignPlaygroundSceneGroup } from './designViewTypes'

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
