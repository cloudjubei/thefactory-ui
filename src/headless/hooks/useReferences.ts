import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  canonicalReferences,
  describeReference,
  describeResourceLink,
  referencesAsText,
  resolveTypedReference,
  searchHandleReferences,
  searchWorkReferences,
} from 'thefactory-tools/utils'
import type {
  ParsedReference,
  ReferenceDescription,
  ReferenceIndex,
  ReferenceProject,
  ReferenceSuggestion,
  ResourceLink,
} from 'thefactory-tools/types'
import { getStoriesOrder, listProjectNotes, listStories } from '../api'
import { useApi } from '../api/ApiContext'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useStories } from '../contexts/StoriesContext'

/**
 * Where references resolve: a project, a group's projects, or — a scope naming
 * neither, like the general chat — every project. No scope resolves nothing.
 */
export type ReferenceScope = {
  projectId?: string | null
  groupId?: string | null
}

/** What references are resolved against, and what a surface does with them. */
export type References = {
  index: ReferenceIndex
  /** How a reference token shows as a chip, as things stand now. */
  describe: (parsed: ParsedReference) => ReferenceDescription | undefined
  /** How an `overseer://` link shows as a chip. */
  describeLink: (link: ResourceLink) => ReferenceDescription | undefined
  /** The composer's `#` dropdown. */
  searchWork: (token: string) => ReferenceSuggestion[]
  /** The composer's `&` dropdown. */
  searchHandles: (token: string) => ReferenceSuggestion[]
  /**
   * Text as it is saved or sent: what was typed (`#3.2`, `&qa-login`) turned
   * into ids. Given the text as it was before the edit, only what is new is
   * turned — an old "PR #12" stays as written.
   */
  canonicalize: (text: string, before?: string) => string
  /** Text with each reference written as its chip reads, for where a chip cannot go. */
  asText: (text: string, options?: { typed?: boolean }) => string
}

type LoadedProject = Omit<ReferenceProject, 'name'>

const NO_ATTACHMENTS: readonly string[] = []

/** How long a project fetched for another chat is reused before it is fetched again. */
const REFERENCE_PROJECT_TTL_MS = 60_000

const loadedProjects = new Map<string, { at: number; project: Promise<LoadedProject> }>()

/** Who hears that a project's stories or notes changed: every mounted `useReferences`. */
const referenceListeners = new Set<(projectId: string) => void>()

/**
 * Drop what was fetched for a project and have every surface fetch it again —
 * after a note is added or renamed, or a story changes, so a new `&` or `#`
 * resolves and an old chip never reads "no longer exists".
 */
export function invalidateReferenceProject(projectId: string): void {
  loadedProjects.delete(projectId)
  for (const listener of referenceListeners) listener(projectId)
}

/** A project's stories in list order and its notes, fetched once a minute at most. */
function loadReferenceProject(projectId: string): Promise<LoadedProject> {
  const cached = loadedProjects.get(projectId)
  if (cached && Date.now() - cached.at < REFERENCE_PROJECT_TTL_MS) return cached.project
  const project = (async (): Promise<LoadedProject> => {
    const [stories, order, notes] = await Promise.all([
      listStories({ path: { projectId }, throwOnError: true }).then((r) => r.data ?? []),
      getStoriesOrder({ path: { projectId }, throwOnError: true }).then((r) => r.data ?? []),
      listProjectNotes({ path: { projectId }, throwOnError: true }).then(
        (r) => r.data ?? [],
        () => [],
      ),
    ])
    const rank = new Map((order as string[]).map((id, i) => [id, i]))
    const ordered = [...stories].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    )
    return {
      projectId,
      stories: ordered.map((s) => ({
        id: s.id,
        title: s.title,
        features: (s.features ?? []).map((f) => ({ id: f.id, title: f.title })),
      })),
      notes: notes.map((n) => ({
        id: n.id,
        label: n.label,
        ...(n.description ? { description: n.description } : {}),
      })),
    }
  })()
  loadedProjects.set(projectId, { at: Date.now(), project })
  project.catch(() => loadedProjects.delete(projectId))
  return project
}

/**
 * References — the stories, features, notes and attachments a text points at —
 * resolved for showing as chips, offered in `#` and `&` dropdowns, and turned
 * into ids when the text is saved or sent. A project scope reaches its own
 * project, live; a group scope its member projects; no scope every project.
 */
export function useReferences({
  scope,
  attachments = NO_ATTACHMENTS,
}: {
  scope: ReferenceScope | undefined
  /** Project paths of the files attached in a chat, the composer's included. */
  attachments?: readonly string[]
}): References {
  const { projects, activeProjectId } = useProjects()
  const { groups } = useProjectsGroups()
  const { stories } = useStories()
  const ownProjectId = scope?.projectId ?? undefined
  const groupId = scope?.groupId ?? undefined

  const hasScope = scope !== undefined
  // Keyed on a string so a caller passing a fresh scope object each render
  // neither recomputes the index nor fetches again.
  const scopeKey = useMemo<string>(() => {
    if (!hasScope) return ''
    if (ownProjectId) return ownProjectId
    if (groupId) return (groups.find((g) => g.id === groupId)?.projects ?? []).join('\n')
    return projects.map((p) => p.id).join('\n')
  }, [hasScope, ownProjectId, groupId, groups, projects])
  const scopeIds = useMemo<string[]>(() => (scopeKey ? scopeKey.split('\n') : []), [scopeKey])

  const { ws } = useApi()
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const listener = (projectId: string) => {
      if (scopeKey.split('\n').includes(projectId)) setVersion((v) => v + 1)
    }
    referenceListeners.add(listener)
    return () => {
      referenceListeners.delete(listener)
    }
  }, [scopeKey])
  useEffect(
    () =>
      ws.on('stories:updated', (data: unknown) => {
        const projectId = (data as { projectId?: unknown } | undefined)?.projectId
        if (typeof projectId !== 'string' || !scopeKey.split('\n').includes(projectId)) return
        loadedProjects.delete(projectId)
        setVersion((v) => v + 1)
      }),
    [ws, scopeKey],
  )

  const [fetched, setFetched] = useState<ReadonlyMap<string, LoadedProject>>(new Map())
  useEffect(() => {
    let live = true
    void Promise.all(
      scopeIds.map((id) =>
        loadReferenceProject(id).then(
          (p) => p,
          () => undefined,
        ),
      ),
    ).then((loaded) => {
      if (!live) return
      setFetched(new Map(loaded.flatMap((p) => (p ? [[p.projectId, p] as const] : []))))
    })
    return () => {
      live = false
    }
  }, [scopeIds, version])

  const index = useMemo<ReferenceIndex>(() => {
    const names = new Map(projects.map((p) => [p.id, p.title]))
    const byId = new Map<string, ReferenceProject>()
    for (const id of scopeIds) {
      const loaded = fetched.get(id)
      const live =
        id === activeProjectId
          ? stories.map((s) => ({
              id: s.id,
              title: s.title,
              features: (s.features ?? []).map((f) => ({ id: f.id, title: f.title })),
            }))
          : undefined
      if (!loaded && !live) continue
      byId.set(id, {
        projectId: id,
        ...(names.get(id) ? { name: names.get(id) } : {}),
        stories: live ?? loaded?.stories ?? [],
        notes: loaded?.notes ?? [],
      })
    }
    return {
      projects: byId,
      ...(ownProjectId ? { projectId: ownProjectId } : {}),
      attachments,
    }
  }, [scopeIds, fetched, activeProjectId, stories, projects, ownProjectId, attachments])

  // Something a chip cannot find may be newer than what was fetched — a note
  // an agent saved a moment ago. Fetch its project once more before it reads
  // as gone.
  const refetched = useRef(new Set<string>())
  const describe = useCallback(
    (parsed: ParsedReference) => {
      const description = describeReference(parsed, index)
      if (description?.missing && parsed.type === 'reference') {
        const reference = parsed.reference
        const projectId =
          ('projectId' in reference && reference.projectId) || index.projectId || undefined
        const key = `${projectId}:${JSON.stringify(reference)}`
        if (projectId && !refetched.current.has(key)) {
          refetched.current.add(key)
          setTimeout(() => invalidateReferenceProject(projectId), 0)
        }
      }
      return description
    },
    [index],
  )
  const describeLink = useCallback(
    (link: ResourceLink) => describeResourceLink(link, index),
    [index],
  )
  const searchWork = useCallback((token: string) => searchWorkReferences(token, index), [index])
  const searchHandles = useCallback(
    (token: string) => searchHandleReferences(token, index),
    [index],
  )
  const canonicalize = useCallback(
    (text: string, before?: string) =>
      canonicalReferences(text, (typed) => resolveTypedReference(typed, index), before),
    [index],
  )
  const asText = useCallback(
    (text: string, options?: { typed?: boolean }) => referencesAsText(text, index, options),
    [index],
  )

  return useMemo(
    () => ({ index, describe, describeLink, searchWork, searchHandles, canonicalize, asText }),
    [index, describe, describeLink, searchWork, searchHandles, canonicalize, asText],
  )
}
