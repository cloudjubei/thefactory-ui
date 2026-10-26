import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  canonicalReferences,
  describeReference,
  describeResourceLink,
  referencesAsText,
  referencesAsTyped,
  resolveTypedReference,
  searchHandleReferences,
  searchWorkReferences,
} from 'thefactory-tools/utils'
import type {
  ParsedReference,
  ProcessDefinition,
  ReferenceDescription,
  ReferenceGroup,
  ReferenceIndex,
  ReferenceProject,
  ReferenceSuggestion,
  ResourceLink,
} from 'thefactory-tools/types'
import {
  getProjectDesign,
  getStoriesOrder,
  listGroupNotes,
  listProcesses,
  listProjectNotes,
  listStories,
} from '../api'
import { useApi } from '../api/ApiContext'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useStories } from '../contexts/StoriesContext'
import { loadProjectFilePaths } from '../contexts/FilesContext'
import {
  projectFileMention,
  rankProjectMentionMatches,
  type ProjectMentionFiles,
} from '../utils/mention'
import {
  isLazyReferenceScope,
  isWantedReferenceProject,
  referenceGroupId,
  referencedProjectId,
  referenceProjectsReached,
  referenceProjectsToLoad,
} from '../utils/referenceScope'
import { afterPrimaryLoads } from '../utils/afterPrimaryLoads'
import { referenceDesignOf } from '../utils/design'
import { referenceProcessesOf } from '../utils/referenceProcesses'

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
   * The composer's `@` dropdown in a chat over several projects: every
   * project's files, written `<projectId>:<path>`. Each list loads the first
   * time it is searched. `undefined` in a project's own chat, which offers its
   * own files.
   */
  searchFiles: ((token: string) => string[]) | undefined
  /** An `@` suggestion as its row shows it: the path, and the project it is in when it names one. */
  describeFile: (value: string) => { path: string; project?: string }
  /**
   * Text as it is saved or sent: what was typed (`#3.2`, `&qa-login`) turned
   * into ids. Given the text as it was before the edit, only what is new is
   * turned — an old "PR #12" stays as written.
   */
  canonicalize: (text: string, before?: string) => string
  /** Text with each reference written as its chip reads, for where a chip cannot go. */
  asText: (text: string, options?: { typed?: boolean }) => string
  /**
   * Stored text as a person edits it — `#3.2`, `&qa-login` instead of ids.
   * `canonicalize(edited, stored)` gives the ids back.
   */
  toTyped: (text: string) => string
}

/** A project as read for references — its stories left out when they are held live elsewhere. */
type LoadedProject = Omit<ReferenceProject, 'name' | 'stories'> & {
  stories?: ReferenceProject['stories']
}

type LoadedExtras = Omit<LoadedProject, 'projectId' | 'stories'>

const NO_ATTACHMENTS: readonly string[] = []
const NO_PROJECTS: ReadonlySet<string> = new Set()

/** How long a project fetched for another chat is reused before it is fetched again. */
const REFERENCE_PROJECT_TTL_MS = 60_000
/** Coalesce a burst of `files:changed` into one reload of the `@` file lists. */
const REFERENCE_FILES_DEBOUNCE_MS = 250

const loadedStories = new Map<
  string,
  { at: number; stories: Promise<ReferenceProject['stories']> }
>()
const loadedExtras = new Map<string, { at: number; extras: Promise<LoadedExtras> }>()

/** Who hears that a project's stories or notes changed: every mounted `useReferences`. */
const referenceListeners = new Set<(projectId: string) => void>()

/**
 * Drop what was fetched for a project and have every surface fetch it again —
 * after a note is added or renamed, or a story changes, so a new `&` or `#`
 * resolves and an old chip never reads "no longer exists".
 */
export function invalidateReferenceProject(projectId: string): void {
  loadedStories.delete(projectId)
  loadedExtras.delete(projectId)
  for (const listener of referenceListeners) listener(projectId)
}

const loadedGroups = new Map<string, { at: number; notes: Promise<ReferenceGroup['notes']> }>()

/** Who hears that a group's notes changed: every mounted `useReferences`. */
const referenceGroupListeners = new Set<(groupId: string) => void>()

/**
 * Drop a group's fetched notes and have every surface fetch them again — after a
 * group note is added or renamed, so a new `&group:` resolves and an old chip
 * never reads "no longer exists".
 */
export function invalidateReferenceGroup(groupId: string): void {
  loadedGroups.delete(groupId)
  for (const listener of referenceGroupListeners) listener(groupId)
}

/** A group's notes, fetched once a minute at most; none when they cannot be read. */
function loadReferenceGroupNotes(groupId: string): Promise<ReferenceGroup['notes']> {
  const cached = loadedGroups.get(groupId)
  if (cached && Date.now() - cached.at < REFERENCE_PROJECT_TTL_MS) return cached.notes
  const notes = listGroupNotes({ path: { groupId }, throwOnError: true }).then(
    (r) =>
      (r.data ?? []).map((n) => ({
        id: n.id,
        label: n.label,
        ...(n.description ? { description: n.description } : {}),
      })),
    () => [],
  )
  loadedGroups.set(groupId, { at: Date.now(), notes })
  return notes
}

/** A project's stories in list order, read once a minute at most. */
function loadReferenceStories(projectId: string): Promise<ReferenceProject['stories']> {
  const cached = loadedStories.get(projectId)
  if (cached && Date.now() - cached.at < REFERENCE_PROJECT_TTL_MS) return cached.stories
  const stories = Promise.all([
    listStories({ path: { projectId }, throwOnError: true }).then((r) => r.data ?? []),
    getStoriesOrder({ path: { projectId }, throwOnError: true }).then((r) => r.data ?? []),
  ]).then(([list, order]) => {
    const rank = new Map((order as string[]).map((id, i) => [id, i]))
    return [...list]
      .sort(
        (a, b) =>
          (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      )
      .map(referenceStoryOf)
  })
  loadedStories.set(projectId, { at: Date.now(), stories })
  stories.catch(() => loadedStories.delete(projectId))
  return stories
}

/** A project's notes, design and processes, read once a minute at most. */
function loadReferenceExtras(projectId: string): Promise<LoadedExtras> {
  const cached = loadedExtras.get(projectId)
  if (cached && Date.now() - cached.at < REFERENCE_PROJECT_TTL_MS) return cached.extras
  const extras = Promise.all([
    listProjectNotes({ path: { projectId }, throwOnError: true }).then(
      (r) => r.data ?? [],
      () => [],
    ),
    getProjectDesign({ path: { projectId }, throwOnError: true }).then(
      (r) => (r.data ? referenceDesignOf(r.data) : undefined),
      () => undefined,
    ),
    listProcesses({ query: { projectId }, throwOnError: true }).then(
      (r) => referenceProcessesOf((r.data ?? []) as ProcessDefinition[]),
      () => undefined,
    ),
  ]).then(([notes, design, processes]) => ({
    notes: notes.map((n) => ({
      id: n.id,
      label: n.label,
      ...(n.description ? { description: n.description } : {}),
    })),
    ...(design ? { design } : {}),
    ...(processes ? { processes } : {}),
  }))
  loadedExtras.set(projectId, { at: Date.now(), extras })
  extras.catch(() => loadedExtras.delete(projectId))
  return extras
}

/**
 * A project as references reach it: its notes, design and processes, and — when
 * `withStories` — its stories in list order. The active project's stories are
 * held live by the stories context, so they are not read a second time here.
 */
export async function loadReferenceProject(
  projectId: string,
  withStories: boolean,
): Promise<LoadedProject> {
  const [stories, extras] = await Promise.all([
    withStories ? loadReferenceStories(projectId) : undefined,
    loadReferenceExtras(projectId),
  ])
  return { projectId, ...extras, ...(stories ? { stories } : {}) }
}

/** A story as a reference reaches it: title and status, and its features' too. */
function referenceStoryOf(story: {
  id: string
  title: string
  status?: string
  features?: ReadonlyArray<{ id: string; title: string; status?: string }>
}): ReferenceProject['stories'][number] {
  return {
    id: story.id,
    title: story.title,
    ...(story.status ? { status: story.status } : {}),
    features: (story.features ?? []).map((f) => ({
      id: f.id,
      title: f.title,
      ...(f.status ? { status: f.status } : {}),
    })),
  }
}

/**
 * References — the stories, features, notes, designs, processes, runs and attachments a text points at —
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

  // A chat over every project reads a project's references only once a chip
  // of it shows or a reference is typed — not all twenty on open.
  const lazy = isLazyReferenceScope(scope)
  const [wanted, setWanted] = useState<ReadonlySet<string>>(NO_PROJECTS)
  const wantedRef = useRef(new Set<string>())
  const knownProjectIds = useMemo(() => projects.map((p) => p.id), [projects])
  const want = useCallback(
    (ids: readonly (string | undefined)[]) => {
      let added = false
      for (const id of ids) {
        if (!id || wantedRef.current.has(id)) continue
        if (!isWantedReferenceProject(id, scopeIds, lazy, knownProjectIds)) continue
        wantedRef.current.add(id)
        added = true
      }
      if (added) setTimeout(() => setWanted(new Set(wantedRef.current)), 0)
    },
    [lazy, scopeIds, knownProjectIds],
  )
  const loadIds = useMemo(
    () => referenceProjectsToLoad(scopeIds, lazy, wanted),
    [scopeIds, lazy, wanted],
  )
  // The scope's own projects and the ones its chips name from outside it.
  const reached = useMemo(() => referenceProjectsReached(scopeIds, wanted), [scopeIds, wanted])
  const reachedKey = reached.join('\n')

  const { ws } = useApi()
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const listener = (projectId: string) => {
      if (reachedKey.split('\n').includes(projectId)) setVersion((v) => v + 1)
    }
    referenceListeners.add(listener)
    return () => {
      referenceListeners.delete(listener)
    }
  }, [reachedKey])
  useEffect(() => {
    const refetch = (data: unknown) => {
      const projectId = (data as { projectId?: unknown } | undefined)?.projectId
      if (typeof projectId !== 'string' || !reachedKey.split('\n').includes(projectId)) return
      loadedStories.delete(projectId)
      loadedExtras.delete(projectId)
      setVersion((v) => v + 1)
    }
    const offStories = ws.on('stories:updated', refetch)
    const offDesign = ws.on('design:updated', refetch)
    return () => {
      offStories()
      offDesign()
    }
  }, [ws, reachedKey])

  // The group whose notes this chat reaches — the same one its agents read.
  const notesGroupId = hasScope ? referenceGroupId(scope, projects) : undefined
  const [groupVersion, setGroupVersion] = useState(0)
  useEffect(() => {
    const listener = (groupId: string) => {
      if (groupId === notesGroupId) setGroupVersion((v) => v + 1)
    }
    referenceGroupListeners.add(listener)
    return () => {
      referenceGroupListeners.delete(listener)
    }
  }, [notesGroupId])
  const [groupNotes, setGroupNotes] = useState<
    { groupId: string; notes: ReferenceGroup['notes'] } | undefined
  >(undefined)
  useEffect(() => {
    if (!notesGroupId) {
      setGroupNotes(undefined)
      return
    }
    let live = true
    void loadReferenceGroupNotes(notesGroupId).then((notes) => {
      if (live) setGroupNotes({ groupId: notesGroupId, notes })
    })
    return () => {
      live = false
    }
  }, [notesGroupId, groupVersion])

  const [fetched, setFetched] = useState<ReadonlyMap<string, LoadedProject>>(new Map())
  const [answered, setAnswered] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    let live = true
    const cancel = afterPrimaryLoads(() => {
      void Promise.all(
        loadIds.map((id) =>
          loadReferenceProject(id, id !== activeProjectId).then(
            (p) => p,
            () => undefined,
          ),
        ),
      ).then((loaded) => {
        if (!live) return
        setFetched(new Map(loaded.flatMap((p) => (p ? [[p.projectId, p] as const] : []))))
        setAnswered(new Set(loadIds))
      })
    })
    return () => {
      live = false
      cancel()
    }
  }, [loadIds, version, activeProjectId])

  const index = useMemo<ReferenceIndex>(() => {
    const names = new Map(projects.map((p) => [p.id, p.title]))
    const byId = new Map<string, ReferenceProject>()
    for (const id of reached) {
      const loaded = fetched.get(id)
      const live =
        id === activeProjectId && (!lazy || loaded) ? stories.map(referenceStoryOf) : undefined
      if (!loaded && !live) continue
      byId.set(id, {
        projectId: id,
        ...(names.get(id) ? { name: names.get(id) } : {}),
        stories: live ?? loaded?.stories ?? [],
        notes: loaded?.notes ?? [],
        ...(loaded?.design ? { design: loaded.design } : {}),
        ...(loaded?.processes ? { processes: loaded.processes } : {}),
      })
    }
    const loading = new Set(reached.filter((id) => !byId.has(id) && !answered.has(id)))
    const group =
      notesGroupId && groupNotes?.groupId === notesGroupId
        ? {
            groupId: notesGroupId,
            name: groups.find((g) => g.id === notesGroupId)?.title ?? notesGroupId,
            notes: groupNotes.notes,
          }
        : undefined
    return {
      projects: byId,
      ...(ownProjectId ? { projectId: ownProjectId } : {}),
      attachments,
      ...(group ? { group } : {}),
      ...(loading.size > 0 ? { loading } : {}),
    }
  }, [
    reached,
    fetched,
    answered,
    activeProjectId,
    stories,
    projects,
    ownProjectId,
    attachments,
    notesGroupId,
    groupNotes,
    groups,
    lazy,
  ])

  // Something a chip cannot find may be newer than what was fetched — a note
  // an agent saved a moment ago. Fetch its project once more before it reads
  // as gone.
  const refetched = useRef(new Set<string>())
  const describe = useCallback(
    (parsed: ParsedReference) => {
      want([referencedProjectId(parsed)])
      const description = describeReference(parsed, index)
      if (description?.missing && parsed.type === 'reference') {
        const reference = parsed.reference
        if (reference.kind === 'groupNote') {
          const key = `group:${reference.groupId}:${reference.noteId}`
          if (reference.groupId === notesGroupId && !refetched.current.has(key)) {
            refetched.current.add(key)
            setTimeout(() => invalidateReferenceGroup(reference.groupId), 0)
          }
          return description
        }
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
    [index, notesGroupId, want],
  )
  const describeLink = useCallback(
    (link: ResourceLink) => {
      want([referencedProjectId(link)])
      return describeResourceLink(link, index)
    },
    [index, want],
  )
  const searchWork = useCallback(
    (token: string) => {
      want(scopeIds)
      return searchWorkReferences(token, index)
    },
    [index, want, scopeIds],
  )
  const searchHandles = useCallback(
    (token: string) => {
      want(scopeIds)
      return searchHandleReferences(token, index)
    },
    [index, want, scopeIds],
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

  const toTyped = useCallback((text: string) => referencesAsTyped(text, index), [index])

  // A chat over several projects loads their file lists on the first `@`, not
  // on open — the general chat reaches every project.
  const spansProjects = hasScope && !ownProjectId
  const [filesWanted, setFilesWanted] = useState(false)
  const [filesVersion, setFilesVersion] = useState(0)
  const [projectFiles, setProjectFiles] = useState<readonly ProjectMentionFiles[]>([])
  useEffect(() => {
    if (!spansProjects || !filesWanted) return
    let live = true
    void Promise.all(
      scopeIds.map((projectId) =>
        loadProjectFilePaths(projectId).then(
          (paths) => ({ projectId, paths }),
          () => ({ projectId, paths: [] }),
        ),
      ),
    ).then((loaded) => {
      if (live) setProjectFiles(loaded)
    })
    return () => {
      live = false
    }
  }, [spansProjects, filesWanted, scopeIds, filesVersion])
  useEffect(() => {
    if (!spansProjects || !filesWanted) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = ws.on('files:changed', () => {
      clearTimeout(timer)
      timer = setTimeout(() => setFilesVersion((v) => v + 1), REFERENCE_FILES_DEBOUNCE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [ws, spansProjects, filesWanted])
  const searchFiles = useMemo(() => {
    if (!spansProjects) return undefined
    return (token: string) => {
      // Searched while the dropdown renders, so the load starts after it.
      if (!filesWanted) setTimeout(() => setFilesWanted(true), 0)
      return rankProjectMentionMatches(projectFiles, token)
    }
  }, [spansProjects, filesWanted, projectFiles])
  const describeFile = useCallback(
    (value: string) => {
      const { projectId, path } = projectFileMention(value)
      const project = projectId ? index.projects.get(projectId) : undefined
      return projectId ? { path, project: project?.name ?? projectId } : { path }
    },
    [index],
  )

  return useMemo(
    () => ({
      index,
      describe,
      describeLink,
      searchWork,
      searchHandles,
      searchFiles,
      describeFile,
      canonicalize,
      asText,
      toTyped,
    }),
    [
      index,
      describe,
      describeLink,
      searchWork,
      searchHandles,
      searchFiles,
      describeFile,
      canonicalize,
      asText,
      toTyped,
    ],
  )
}
