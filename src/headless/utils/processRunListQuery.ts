import type { ProcessRunEnding, ProcessRunStatus } from 'thefactory-tools/types'

import { ALL_PROJECTS_PROCESS_RUN_LIST_KEY } from './processViewCacheConstants'
import { PROCESS_RUN_STATUS_VIEW } from './processView'
import {
  PROCESS_RUN_LIST_ANY,
  PROCESS_RUN_LIST_COPY,
  PROCESS_RUN_LIST_STATUSES,
  PROCESS_RUN_SCOPE_ALL,
  PROCESS_RUN_SCOPE_GROUP_PREFIX,
  PROCESS_RUN_SCOPE_PROJECT,
} from './processRunListQueryConstants'

/** Whose runs the list reads: one project, every project, or one group's members. */
export type ProcessRunListScope =
  | { kind: 'project'; projectId: string }
  | { kind: 'all' }
  | { kind: 'group'; groupId: string; projectIds: readonly string[] }

/**
 * What narrows a scope. Every field set is asked of the list route, which ANDs
 * them. Absent means that filter is not applied.
 */
export interface ProcessRunListFilter {
  storyId?: string
  status?: ProcessRunStatus
  ending?: ProcessRunEnding
}

/** A scope plus the filters on it — what `useProcessRuns` reads. */
export interface ProcessRunListRequest {
  scope: ProcessRunListScope
  filter: ProcessRunListFilter
}

/** The `GET /process-runs` query for a request. `rootOnly` always: a child run is opened from its parent. */
export interface ProcessRunListQuery {
  projectId?: string
  projectIds?: string[]
  storyId?: string
  status?: ProcessRunStatus
  ending?: ProcessRunEnding
  rootOnly: true
}

/** One option in a filter picker. */
export interface ProcessRunListChoice {
  value: string
  label: string
}

/** A story the story picker can offer, with the project it belongs to. */
export interface ProcessRunListStorySource {
  projectId: string
  id: string
  title: string
}

const QUERY_KEY_PREFIX = 'query:'

const ENDINGS = new Set<ProcessRunEnding>(['abandoned', 'unmerged'])

/** `useProcessRuns()` and `useProcessRuns(projectId)` as a request. */
export function processRunListRequestFromArg(
  arg?: string | ProcessRunListRequest,
): ProcessRunListRequest {
  if (typeof arg === 'string') return { scope: { kind: 'project', projectId: arg }, filter: {} }
  if (arg) return arg
  return { scope: { kind: 'all' }, filter: {} }
}

/** The list-route query. A group's projects are sorted so the same members share one request. */
export function processRunListQuery(request: ProcessRunListRequest): ProcessRunListQuery {
  const query: ProcessRunListQuery = { rootOnly: true }
  const { scope, filter } = request
  if (scope.kind === 'project') query.projectId = scope.projectId
  if (scope.kind === 'group') query.projectIds = [...scope.projectIds].sort()
  if (filter.storyId) query.storyId = filter.storyId
  if (filter.status) query.status = filter.status
  if (filter.ending) query.ending = filter.ending
  return query
}

/**
 * An empty group matches nothing. Sending no `projectIds` would mean every
 * project, so the caller skips the request and holds an empty list.
 */
export function processRunListMatchesNothing(query: ProcessRunListQuery): boolean {
  return query.projectIds !== undefined && query.projectIds.length === 0
}

/**
 * The store key. An unfiltered project, and every project with no filter, keep
 * the keys the nav badge and the chat list already share. Anything narrower
 * is its own list.
 */
export function processRunListCacheKey(request: ProcessRunListRequest): string {
  const query = processRunListQuery(request)
  const bare =
    query.storyId === undefined &&
    query.status === undefined &&
    query.ending === undefined &&
    query.projectIds === undefined
  if (bare) return query.projectId ?? ALL_PROJECTS_PROCESS_RUN_LIST_KEY
  return `${QUERY_KEY_PREFIX}${JSON.stringify({
    projectId: query.projectId,
    projectIds: query.projectIds,
    storyId: query.storyId,
    status: query.status,
    ending: query.ending,
  })}`
}

/** The request a store key was built from. A filtered group's id is not in the key; its projects are. */
export function processRunListRequestFromKey(key: string): ProcessRunListRequest {
  if (key === ALL_PROJECTS_PROCESS_RUN_LIST_KEY) return { scope: { kind: 'all' }, filter: {} }
  if (!key.startsWith(QUERY_KEY_PREFIX))
    return { scope: { kind: 'project', projectId: key }, filter: {} }
  const body = JSON.parse(key.slice(QUERY_KEY_PREFIX.length)) as {
    projectId?: string
    projectIds?: string[]
    storyId?: string
    status?: ProcessRunStatus
    ending?: ProcessRunEnding
  }
  const scope: ProcessRunListScope = body.projectIds
    ? { kind: 'group', groupId: '', projectIds: body.projectIds }
    : body.projectId
      ? { kind: 'project', projectId: body.projectId }
      : { kind: 'all' }
  const filter: ProcessRunListFilter = {}
  if (body.storyId) filter.storyId = body.storyId
  if (body.status) filter.status = body.status
  if (body.ending) filter.ending = body.ending
  return { scope, filter }
}

/** The scope a select value names. An unknown group, once groups are known, falls back to the project. */
export function processRunListScopeFromValue(
  value: string,
  projectId: string,
  groups: readonly { id: string; projects: readonly string[] }[],
  groupsLoaded: boolean,
): ProcessRunListScope {
  if (value === PROCESS_RUN_SCOPE_ALL) return { kind: 'all' }
  if (value.startsWith(PROCESS_RUN_SCOPE_GROUP_PREFIX)) {
    const groupId = value.slice(PROCESS_RUN_SCOPE_GROUP_PREFIX.length)
    const group = groups.find((item) => item.id === groupId)
    if (group) return { kind: 'group', groupId, projectIds: group.projects }
    if (!groupsLoaded) return { kind: 'group', groupId, projectIds: [] }
    return { kind: 'project', projectId }
  }
  return { kind: 'project', projectId }
}

export function processRunGroupScopeValue(groupId: string): string {
  return `${PROCESS_RUN_SCOPE_GROUP_PREFIX}${groupId}`
}

/** This project, all projects, then each group by title. */
export function processRunListScopeOptions(
  groups: readonly { id: string; title: string }[],
): ProcessRunListChoice[] {
  const sorted = [...groups].sort(
    (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  )
  return [
    { value: PROCESS_RUN_SCOPE_PROJECT, label: PROCESS_RUN_LIST_COPY.thisProject },
    { value: PROCESS_RUN_SCOPE_ALL, label: PROCESS_RUN_LIST_COPY.allProjects },
    ...sorted.map((group) => ({ value: processRunGroupScopeValue(group.id), label: group.title })),
  ]
}

/** Any story, then each story. A list wider than one project names the project beside the title. */
export function processRunListStoryOptions(
  stories: readonly ProcessRunListStorySource[],
  projectTitle: (projectId: string) => string | undefined,
  multiProject: boolean,
): ProcessRunListChoice[] {
  const rows = stories.map((story) => {
    const project = projectTitle(story.projectId)
    const label = multiProject && project ? `${story.title} · ${project}` : story.title
    return { value: story.id, label }
  })
  rows.sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
  return [{ value: PROCESS_RUN_LIST_ANY, label: PROCESS_RUN_LIST_COPY.anyStory }, ...rows]
}

/** Any status, then each run status in the picker's words. */
export function processRunListStatusOptions(): ProcessRunListChoice[] {
  return [
    { value: PROCESS_RUN_LIST_ANY, label: PROCESS_RUN_LIST_COPY.anyStatus },
    ...PROCESS_RUN_LIST_STATUSES.map((status) => ({
      value: status,
      label: PROCESS_RUN_STATUS_VIEW[status].label,
    })),
  ]
}

/** Any ending, Not merged, Abandoned. */
export function processRunListEndingOptions(): ProcessRunListChoice[] {
  return [
    { value: PROCESS_RUN_LIST_ANY, label: PROCESS_RUN_LIST_COPY.anyEnding },
    { value: 'unmerged', label: PROCESS_RUN_LIST_COPY.unmerged },
    { value: 'abandoned', label: PROCESS_RUN_LIST_COPY.abandoned },
  ]
}

export function isProcessRunListStatus(value: string): value is ProcessRunStatus {
  return (PROCESS_RUN_LIST_STATUSES as readonly string[]).includes(value)
}

export function isProcessRunListEnding(value: string): value is ProcessRunEnding {
  return ENDINGS.has(value as ProcessRunEnding)
}

/** The filter a picker's values name. `any` leaves that field off the query. */
export function processRunListFilterFromValues(values: {
  story: string
  status: string
  ending: string
}): ProcessRunListFilter {
  const filter: ProcessRunListFilter = {}
  if (values.story !== PROCESS_RUN_LIST_ANY) filter.storyId = values.story
  if (isProcessRunListStatus(values.status)) filter.status = values.status
  if (isProcessRunListEnding(values.ending)) filter.ending = values.ending
  return filter
}

/** A live update as far as list membership cares. */
export interface ProcessRunListUpdate {
  runId?: string
  projectId?: string
  run?: {
    projectId: string
    parentRunId?: string | null
    storyId?: string
    status: ProcessRunStatus
  }
  deleted?: boolean
}

/** What a live update does to a list that already holds `held` for its run id. */
export type ProcessRunUpdateAction = 'ignore' | 'upsert' | 'drop' | 'reread'

function projectInScope(projectId: string | undefined, scope: ProcessRunListScope): boolean {
  if (scope.kind === 'all') return true
  if (!projectId) return false
  if (scope.kind === 'project') return projectId === scope.projectId
  return scope.projectIds.includes(projectId)
}

function updateInScope(update: ProcessRunListUpdate, scope: ProcessRunListScope): boolean {
  if (scope.kind === 'all') return true
  if (update.projectId !== undefined && !projectInScope(update.projectId, scope)) return false
  return projectInScope(update.run?.projectId, scope)
}

/**
 * How a `process:run-update` changes a scoped, filtered list.
 *
 * A child run never belongs (the list is root runs). Story and status are on
 * the record, so a run that leaves them is dropped and one that enters is
 * inserted. An ending is decided by the list route — a list narrowed by one
 * re-reads instead of guessing, and a run that has left the other filters is
 * still dropped.
 */
export function processRunUpdateAction(
  update: ProcessRunListUpdate,
  request: ProcessRunListRequest,
  held: boolean,
): ProcessRunUpdateAction {
  if (update.deleted && update.runId) return held ? 'drop' : 'ignore'
  if (!update.run || !update.runId) return 'ignore'
  if (update.run.parentRunId) return 'ignore'
  if (!updateInScope(update, request.scope)) return 'ignore'
  const storyOk = !request.filter.storyId || update.run.storyId === request.filter.storyId
  const statusOk = !request.filter.status || update.run.status === request.filter.status
  if (!storyOk || !statusOk) return held ? 'drop' : 'ignore'
  if (request.filter.ending) return 'reread'
  return 'upsert'
}
