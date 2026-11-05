import type { GroupConstellationLayout } from './groupConstellationViewTypes'

export const GROUP_CONSTELLATION_LAYOUTS: readonly GroupConstellationLayout[] = [
  'layers',
  'ring',
  'list',
]

export const GROUP_CONSTELLATION_DEFAULT_LAYOUT: GroupConstellationLayout = 'layers'

export const GROUP_CONSTELLATION_LAYOUT_LABELS: Record<GroupConstellationLayout, string> = {
  layers: 'Layers',
  ring: 'Ring',
  list: 'List',
}

/** One project's box on the map. */
export const GROUP_CONSTELLATION_NODE = { width: 160, height: 44 } as const

/** The space between boxes. */
export const GROUP_CONSTELLATION_GAP = { x: 16, y: 44 } as const

/** How far an arrowhead reaches back from its tip, and how wide it opens. */
export const GROUP_CONSTELLATION_ARROW = { length: 8, halfWidth: 4 } as const

/** The width the map is laid out for before it is measured. */
export const GROUP_CONSTELLATION_FALLBACK_WIDTH = 720

/** What the group's dependency map says, on web and native. */
export const GROUP_CONSTELLATION_COPY = {
  title: 'Dependencies',
  reading: 'Reading dependencies…',
  unread: 'The dependencies could not be read.',
  none: 'These projects do not depend on each other.',
  key: 'Arrows point at what a project builds on. Dashed: only while developing.',
  noCheckout: 'No checkout',
  noMap: 'No map yet',
  dependsOn: 'Builds on',
  usedBy: 'Used by',
  nothing: 'Nothing here',
  dev: 'dev',
  imports: (count: number) => `import · ${count}`,
} as const
