import type {
  CreateGroupStoryData,
  ListGroupStoriesResponses,
  ListProjectGroupStoriesResponses,
  ListStoryGroupStoriesResponses,
  PreviewGroupStoryRunResponses,
  RunGroupStoryData,
} from '../api'
import type { StatusPickerValue } from './status'

/** A group story with its parts read now: what the group's Stories tab and its page show. */
export type GroupStoryView = ListGroupStoriesResponses[200][number]

/** One part of a group story as its page shows it. */
export type GroupStoryPartView = GroupStoryView['partViews'][number]

/** A group story's latest group run. */
export type GroupStoryRunSummary = NonNullable<GroupStoryView['latestRun']>

/** A group story a story is a part of — what the story's header links back to. */
export type GroupStoryMembership = ListStoryGroupStoriesResponses[200][number]

/** The group stories each of a project's stories is a part of, by story id — what a story list's rows show. */
export type GroupStoryMembershipsByStory = ListProjectGroupStoriesResponses[200]

/** What creating or changing a group story sends. */
export type GroupStoryWriteBody = NonNullable<CreateGroupStoryData['body']>

/** What running a group story sends: the agent, a cap per part, each part's branch. */
export type GroupStoryRunBody = NonNullable<RunGroupStoryData['body']>

/** What running a group story would start. */
export type GroupStoryRunPreview = PreviewGroupStoryRunResponses[200]

/** One column of a group story's page: the parts that run side by side in a step. */
export interface GroupStoryStepColumn {
  /** 1 first. */
  step: number
  parts: GroupStoryPartView[]
}

/** How a project takes part, on the new group story form. */
export type GroupStoryPartChoice = 'none' | 'existing' | 'new'

/** One member project's row on the group story form. */
export interface GroupStoryFormRow {
  projectId: string
  projectTitle: string
  choice: GroupStoryPartChoice
  /** With `existing`: the project's story picked. */
  storyId?: string
  /** With `new`: its title; the group story's own when blank. */
  newStoryTitle?: string
  /** The other rows' projects it needs first. */
  needs: string[]
}

/** The group story form as the person fills it. */
export interface GroupStoryForm {
  title: string
  description: string
  rows: GroupStoryFormRow[]
}

/** A member project, as the form lists it. */
export interface GroupStoryMemberProject {
  id: string
  title: string
}

/** What a group story's latest run is doing, as the Stories tab filters by it. */
export type GroupStoryRunState = 'running' | 'needs-you' | 'waiting' | 'not-running'

/** The Stories tab's run filter: any run, or one state. */
export type GroupStoryRunFilter = 'all' | GroupStoryRunState

/** How the Stories tab orders its group stories: the group's own order, or by status. */
export type GroupStorySorting = 'order_asc' | 'order_desc' | 'status_asc' | 'status_desc'

/** How the Stories tab lays its group stories out: rows, or columns by status. */
export type GroupStoryListLayout = 'list' | 'board'

/** What the Stories tab shows: its search, status, project and run filters, its order and its layout. */
export interface GroupStoryListFilter {
  /** Matched against the position, title, description, and each part's project and story. */
  query: string
  status: StatusPickerValue
  /** Only group stories with a part in this project; every one when absent. */
  projectId?: string
  run: GroupStoryRunFilter
  sortBy: GroupStorySorting
  layout: GroupStoryListLayout
}

/** A group story's Run button: whether it can be pressed and what it says, or why not. */
export interface GroupStoryRunButton {
  disabled: boolean
  label: string
}

/** Which parts of a group story's page are open: its Parts, its Overview and the Overview's sections by key. */
export interface GroupStoryFolds {
  parts: boolean
  overview: boolean
  sections: readonly string[]
}

/** A group story page's folds and the ways to change them. */
export interface GroupStoryFoldControls {
  folds: GroupStoryFolds
  toggleParts: () => void
  toggleOverview: () => void
  toggleSection: (key: string) => void
  /** Open exactly these Overview sections, folding the rest — Expand all / Collapse all. */
  setSections: (keys: readonly string[]) => void
}
