import type { ReactNode } from 'react'
import type {
  DesignPlaygroundControl,
  DesignPlaygroundPreset,
  DesignScreenKind,
} from 'thefactory-tools/types'

/**
 * One state of a component, at its own fixed URL: `/?scene=<scene id>&state=<state id>`.
 *
 * `render` must return the same thing on every load — fixed sample data only: no network, no
 * timers that change what is on screen, no `Date.now()`, no randomness. A screenshot of the URL is
 * the proof of a visible change, so two loads of one build must capture the same pixels.
 */
export type SceneState = {
  /** Kebab-case, unique within its scene. Part of the URL — never rename one casually. */
  id: string
  title: string
  /** What this state shows, for the index. */
  description?: string
  /**
   * The state draws over the whole page itself (an open modal, a toast). It is shown alone at its
   * URL and only linked from its scene's page, where it would cover the other states.
   */
  overlay?: boolean
  /** The state as an element. Keep hooks inside components it renders, not in this function. */
  render: () => ReactNode
}

/** A component and every state worth seeing it in. */
export type Scene = {
  /** Kebab-case, unique across the showcase. Part of the URL — never rename one casually. */
  id: string
  title: string
  /** The component(s) the scene renders, as exported. */
  component: string
  group: SceneGroup
  description: string
  states: SceneState[]
  /**
   * What the Design view's Playground changes the scene with. Declared beside its states, so the
   * Playground, the states saved from it and their captures at every sign-off read one list.
   */
  controls?: DesignPlaygroundControl[]
  /** Settings of its controls worth a name, offered in the Playground. */
  presets?: DesignPlaygroundPreset[]
  /**
   * The scene drawn with one value per control, at `/?scene=<id>&play=1&<control>=<value>`. Fixed
   * sample data only, as `render`: a saved state is captured again at every sign-off.
   */
  play?: (values: Record<string, string>) => ReactNode
  /** What a state saved from it is filed as in the Design view. Defaults to a component. */
  kind?: DesignScreenKind
  /** A whole page, shown at a desktop's width rather than a column's. */
  wide?: boolean
}

export type SceneGroup = 'Chat' | 'Process' | 'Design' | 'Primitives'
