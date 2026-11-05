import { useCallback, useEffect, useMemo, useState } from 'react'

import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useGroupProjectStories } from './useGroupProjectStories'
import {
  PROCESS_RUN_LIST_ANY,
  PROCESS_RUN_SCOPE_GROUP_PREFIX,
  PROCESS_RUN_SCOPE_PROJECT,
} from '../utils/processRunListQueryConstants'
import {
  processRunListEndingOptions,
  processRunListFilterFromValues,
  processRunListScopeFromValue,
  processRunListScopeOptions,
  processRunListStatusOptions,
  processRunListStoryOptions,
  type ProcessRunListChoice,
  type ProcessRunListRequest,
  type ProcessRunListStorySource,
} from '../utils/processRunListQuery'

interface KeptControls {
  scope: string
  story: string
  status: string
  ending: string
}

const INITIAL: KeptControls = {
  scope: PROCESS_RUN_SCOPE_PROJECT,
  story: PROCESS_RUN_LIST_ANY,
  status: PROCESS_RUN_LIST_ANY,
  ending: PROCESS_RUN_LIST_ANY,
}

/** Kept per project for the session, so leaving the tab and coming back finds the filters as they were. */
const KEPT = new Map<string, KeptControls>()

function readKept(projectId: string): KeptControls {
  return KEPT.get(projectId) ?? INITIAL
}

export interface ProcessRunListControls {
  /** What `useProcessRuns` reads for this project and the filters on it. */
  request: ProcessRunListRequest
  scope: string
  setScope: (value: string) => void
  story: string
  setStory: (value: string) => void
  status: string
  setStatus: (value: string) => void
  ending: string
  setEnding: (value: string) => void
  scopeOptions: ProcessRunListChoice[]
  storyOptions: ProcessRunListChoice[]
  statusOptions: ProcessRunListChoice[]
  endingOptions: ProcessRunListChoice[]
  /** A row names its project — the list is wider than the one the tab was opened on. */
  showProject: boolean
  projectName: (projectId: string) => string | undefined
  /** Story, status or ending is narrowed, so an empty list is the filter's doing. */
  narrowed: boolean
  /** A saved group scope is waiting for the group list, so the runs are not read yet. */
  scopePending: boolean
}

/**
 * The Processes tab's scope and filters, kept for the session against the
 * project the tab was opened on. The scope can widen to every project or to a
 * group; story, status and ending narrow what the list route is asked for.
 */
export function useProcessRunListControls(projectId: string): ProcessRunListControls {
  const { projects } = useProjects()
  const { groups, isLoaded: groupsLoaded } = useProjectsGroups()
  const [kept, setKept] = useState<KeptControls>(() => readKept(projectId))
  const [forProject, setForProject] = useState(projectId)
  if (forProject !== projectId) {
    setForProject(projectId)
    setKept(readKept(projectId))
  }
  const stored = forProject === projectId ? kept : readKept(projectId)

  const change = useCallback(
    (patch: Partial<KeptControls>) => {
      setKept((prev) => {
        const base = forProject === projectId ? prev : readKept(projectId)
        const next = { ...base, ...patch }
        KEPT.set(projectId, next)
        return next
      })
    },
    [forProject, projectId],
  )

  const setScope = useCallback((scope: string) => change({ scope }), [change])
  const setStory = useCallback((story: string) => change({ story }), [change])
  const setStatus = useCallback((status: string) => change({ status }), [change])
  const setEnding = useCallback((ending: string) => change({ ending }), [change])

  const scope = useMemo(
    () => processRunListScopeFromValue(stored.scope, projectId, groups, groupsLoaded),
    [stored.scope, projectId, groups, groupsLoaded],
  )

  useEffect(() => {
    if (!groupsLoaded) return
    if (!stored.scope.startsWith(PROCESS_RUN_SCOPE_GROUP_PREFIX)) return
    if (scope.kind === 'group') return
    change({ scope: PROCESS_RUN_SCOPE_PROJECT })
  }, [groupsLoaded, stored.scope, scope.kind, change])

  const storyProjectIds = useMemo(() => {
    if (scope.kind === 'project') return [projectId]
    if (scope.kind === 'group') return [...scope.projectIds]
    return projects.map((project) => project.id)
  }, [scope, projectId, projects])
  const storiesByProject = useGroupProjectStories(storyProjectIds)

  useEffect(() => {
    if (stored.story === PROCESS_RUN_LIST_ANY) return
    const owner = Object.entries(storiesByProject).find(([, stories]) =>
      stories.some((story) => story.id === stored.story),
    )?.[0]
    if (!owner) {
      const loaded =
        storyProjectIds.length > 0 &&
        storyProjectIds.every((id) => Object.prototype.hasOwnProperty.call(storiesByProject, id))
      if (loaded || (scope.kind === 'group' && scope.projectIds.length === 0 && groupsLoaded)) {
        setStory(PROCESS_RUN_LIST_ANY)
      }
      return
    }
    if (scope.kind === 'project' && owner !== projectId) setStory(PROCESS_RUN_LIST_ANY)
    else if (scope.kind === 'group' && !scope.projectIds.includes(owner)) {
      setStory(PROCESS_RUN_LIST_ANY)
    }
  }, [stored.story, storiesByProject, storyProjectIds, scope, projectId, groupsLoaded, setStory])

  const projectName = useCallback(
    (id: string) => projects.find((project) => project.id === id)?.title,
    [projects],
  )
  const showProject = scope.kind !== 'project'
  const storySources = useMemo<ProcessRunListStorySource[]>(() => {
    const sources: ProcessRunListStorySource[] = []
    for (const id of storyProjectIds) {
      for (const story of storiesByProject[id] ?? []) {
        sources.push({ projectId: id, id: story.id, title: story.title })
      }
    }
    return sources
  }, [storyProjectIds, storiesByProject])

  const request = useMemo<ProcessRunListRequest>(
    () => ({
      scope,
      filter: processRunListFilterFromValues({
        story: stored.story,
        status: stored.status,
        ending: stored.ending,
      }),
    }),
    [scope, stored.story, stored.status, stored.ending],
  )

  return {
    request,
    scope: stored.scope,
    setScope,
    story: stored.story,
    setStory,
    status: stored.status,
    setStatus,
    ending: stored.ending,
    setEnding,
    scopeOptions: processRunListScopeOptions(groups),
    storyOptions: processRunListStoryOptions(storySources, projectName, showProject),
    statusOptions: processRunListStatusOptions(),
    endingOptions: processRunListEndingOptions(),
    showProject,
    projectName,
    narrowed:
      stored.story !== PROCESS_RUN_LIST_ANY ||
      stored.status !== PROCESS_RUN_LIST_ANY ||
      stored.ending !== PROCESS_RUN_LIST_ANY,
    scopePending: scope.kind === 'group' && !groupsLoaded,
  }
}
