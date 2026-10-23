import type { KnowledgeLook, KnowledgeSectionId } from './knowledgeOverviewTypes'

/** How long a project's overview stays held after the tab closes: none, so every opening reads it again. */
export const KNOWLEDGE_OVERVIEW_LINGER_MS = 0

/** The look the tab ships with. */
export const KNOWLEDGE_DEFAULT_LOOK: KnowledgeLook = { capabilities: 'list', modelMark: 'pill' }

/** The most files listed under one entry. */
export const KNOWLEDGE_SOURCES_PER_ENTRY = 3

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Every word the Knowledge tab shows, the same on every client. */
export const KNOWLEDGE_TEXT = {
  tab: 'Knowledge',
  sections: {
    purpose: 'Purpose',
    capabilities: 'Capabilities',
    modules: 'Main modules',
    recordedWork: 'Recorded work',
    documentWork: 'Planned in documents',
  } satisfies Record<KnowledgeSectionId, string>,
  refreshed: (when: string) => `Refreshed ${when}`,
  stale: 'Out of date',
  staleTitle: 'What this part describes changed since it was written. It is written again soon.',
  model: (when: string) => `Model · ${when}`,
  modelCaption: (when: string) => `(model, ${when})`,
  modelTitle: (when: string, stale: boolean) =>
    `Written by a model, ${when}${stale ? '. The code may have changed since.' : ''}`,
  noEntries: 'None found in the code yet.',
  recordedUnknown: 'Not known yet.',
  noStories: 'No stories recorded yet.',
  openOf: (open: number, total: number) =>
    `${open} open of ${plural(total, 'recorded story', 'recorded stories')}`,
  more: {
    capabilities: (n: number) => `And ${plural(n, 'more capability', 'more capabilities')}`,
    modules: (n: number) => `And ${plural(n, 'more module', 'more modules')}`,
    documentWork: (n: number) => `And ${plural(n, 'more work item', 'more work items')}`,
    stories: (n: number) => `And ${plural(n, 'more open story', 'more open stories')}`,
    features: (n: number) => `And ${plural(n, 'more open feature', 'more open features')}`,
  },
  loading: 'Reading the overview…',
  updating: 'Building the map again. The overview follows.',
  error: "Couldn't read the overview",
  errorFallback: 'The server did not answer.',
  retry: 'Try again',
  empty: {
    'no-checkout': {
      title: 'Not on this machine',
      body: "This project has no checkout here, so its code can't be read.",
    },
    queued: {
      title: 'Map queued',
      body: (ahead: number) =>
        ahead > 0
          ? `${plural(ahead, 'project', 'projects')} ahead of it. The overview follows once its map is built.`
          : 'Its map is built next. The overview follows.',
    },
    building: {
      title: 'Building the map',
      body: (progress: string) => `${progress}. The overview follows.`,
      percent: (percent: number) => `${percent}% done`,
      started: (ago: string) => `Started ${ago} ago`,
      left: (eta: string) => `about ${eta} left`,
    },
    failed: {
      title: "The map couldn't be built",
      body: (error: string | undefined) => {
        const said = error?.trim().replace(/[.\s]+$/, '')
        return said
          ? `${said}. It is tried again on the next pass.`
          : 'It is tried again on the next pass.'
      },
    },
    none: {
      title: 'No overview yet',
      body: "It is written once the project's map is built.",
    },
  },
} as const
