import type { DesignIndex } from '../../headless/api/generated/types.gen'

export const DAY = 86_400_000
export const T0 = 1_760_000_000_000
export const at = (days: number) => ({ createdAt: T0 + days * DAY, updatedAt: T0 + days * DAY })

/** The Overseer's own design: the run header saved from the playground once, the run page beside it. */
export const PLAY_INDEX: DesignIndex = {
  version: 2,
  apps: [{ id: 'ui', name: 'Overseer', kind: 'product', aliases: [], ...at(0) }],
  screens: [
    {
      id: 'run-page',
      appId: 'ui',
      name: 'Process run page',
      kind: 'screen',
      aliases: [],
      uses: ['run-header'],
      variants: [],
      ...at(0),
    },
    {
      id: 'run-header',
      appId: 'ui',
      name: 'Run header',
      kind: 'component',
      aliases: [],
      uses: [],
      variants: ['Light · Desktop', 'Dark · Desktop', 'Light · Phone', 'Dark · Phone'],
      ...at(0),
    },
  ],
  states: [
    {
      id: 'top-level',
      screenId: 'run-header',
      name: 'Top-level run',
      address: 'scene=run-header&level=top&unread=false',
      ...at(1),
    },
  ],
  versions: [],
  proposals: [],
  tidyPlans: [],
}
