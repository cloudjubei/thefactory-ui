import type {
  GroupStoryFolds,
  GroupStoryListFilter,
  GroupStoryMembership,
  GroupStoryRunFilter,
  GroupStorySorting,
} from './groupStoryTypes'

/** The group stories of a story that is no part — one list, so a row reading it never redraws. */
export const NO_GROUP_STORIES: readonly GroupStoryMembership[] = []

/** The Stories tab before anything is picked: every group story, in the group's order. */
export const GROUP_STORY_LIST_FILTER_DEFAULT: GroupStoryListFilter = {
  query: '',
  status: 'all',
  run: 'all',
  sortBy: 'order_asc',
  layout: 'list',
}

/** The Stories tab's orders. */
export const GROUP_STORY_SORT_OPTIONS: ReadonlyArray<{ value: GroupStorySorting; label: string }> =
  [
    { value: 'order_asc', label: 'In order' },
    { value: 'order_desc', label: 'Last first' },
    { value: 'status_asc', label: 'Status (todo→done)' },
    { value: 'status_desc', label: 'Status (done→todo)' },
  ]

/** The Stories tab's run filter, by what each group story's latest run is doing. */
export const GROUP_STORY_RUN_FILTER_OPTIONS: ReadonlyArray<{
  value: GroupStoryRunFilter
  label: string
}> = [
  { value: 'all', label: 'Any run' },
  { value: 'running', label: 'Running' },
  { value: 'needs-you', label: 'Needs you' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'not-running', label: 'Not running' },
]

/** The project filter's label while no project is picked. */
export const GROUP_STORY_ALL_PROJECTS = 'All projects'

/** The group story page's header buttons, as a screen reader says them and as they read on hover. */
export const GROUP_STORY_ACTION_LABELS = {
  back: 'Back to Stories',
  run: 'Run every part as one group run',
  edit: 'Edit group story',
  delete: 'Delete group story',
} as const

/** A group story page as first opened: Parts and Overview open, every Overview section folded. */
export const GROUP_STORY_FOLDS_DEFAULT: GroupStoryFolds = {
  parts: true,
  overview: true,
  sections: [],
}

/** The group story page's section headings and controls. */
export const GROUP_STORY_PAGE_LABELS = {
  parts: 'Parts',
  linked: 'Linked stories',
  linkedHint: 'Tracked here, never run by this group story.',
  overview: 'Overview',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
} as const

/** The group story form's headings and controls, the same on web and mobile. */
export const GROUP_STORY_FORM_LABELS = {
  parts: 'Parts',
  partsHint: 'One project’s stories run one after another, top first.',
  addPart: 'Add story',
  linked: 'Linked stories',
  linkedHint: 'Tracked only: a linked story is never run.',
  addLink: 'Link a story from',
  needsFirst: 'Needs first',
  existing: 'Use a story',
  new: 'New story',
  pickStory: 'Pick a story…',
  loadingStories: 'Loading its stories…',
  moveUp: (name: string) => `Move ${name} up`,
  moveDown: (name: string) => `Move ${name} down`,
  remove: (name: string) => `Remove ${name}`,
  noParts: 'No stories',
} as const
