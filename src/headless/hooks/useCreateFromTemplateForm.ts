import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Template, TemplateForkProgress } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useTemplates } from '../contexts/TemplatesContext'
import {
  forkProgressLabel,
  projectIdAvailability,
  sanitizeProjectId,
  suggestProjectIdFromName,
  type ProjectIdAvailability,
} from '../utils/createFromTemplate'
import { CREATE_FROM_TEMPLATE_COPY } from '../utils/createFromTemplateConstants'
import {
  githubRepoReadiness,
  useProjectGithubRepo,
  type UseProjectGithubRepoResult,
} from './useProjectGithubRepo'

export type UseCreateFromTemplateFormOptions = {
  /** Prefill the MAIN group (e.g. the group filter the host is on). */
  initialMainGroupId?: string | null
  /**
   * Called when the fork reaches `done`. Hosts typically refresh projects and
   * open the App tab for `projectId`.
   */
  onCreated?: (projectId: string) => void | Promise<void>
  /**
   * Prefill once the catalog is loaded (host wizard resume). Matched against
   * `useTemplates().templates` by id when {@link initialTemplate} is omitted.
   */
  initialTemplateId?: string
  /** Prefill the selected template immediately (design playground fixed sample data). */
  initialTemplate?: Template | null
  /** Prefill the display name. */
  initialName?: string
  /** Prefill the project id (marks the id as user-edited so template pick won't overwrite it). */
  initialId?: string
}

export type UseCreateFromTemplateForm = {
  template: Template | null
  setTemplate: (template: Template | null) => void
  name: string
  setName: (value: string) => void
  id: string
  setId: (value: string) => void
  idAvailability: ProjectIdAvailability
  mainGroupId: string | null
  setMainGroupId: (value: string | null) => void
  /** MAIN groups the person can assign the new project to. */
  mainGroups: Array<{ id: string; title: string }>
  github: UseProjectGithubRepoResult
  errors: string[]
  submitting: boolean
  canSubmit: boolean
  progress: TemplateForkProgress | null
  progressLabel: string
  /** Start the fork; resolves when the job finishes (or throws on error/abort). */
  submit: () => Promise<void>
  /** Abort the in-flight job, if any. */
  abort: () => Promise<void>
  copy: typeof CREATE_FROM_TEMPLATE_COPY
}

/**
 * Shared create-from-template wizard state for web and native:
 * template pick → name + collision-checked id + group (+ optional GitHub),
 * then fork progress via `useTemplates`.
 */
export function useCreateFromTemplateForm(
  opts: UseCreateFromTemplateFormOptions = {},
): UseCreateFromTemplateForm {
  const { templates, createFromTemplate, abortCreateFromTemplate, forkProgress } = useTemplates()
  const { projects } = useProjects()
  const { groups } = useProjectsGroups()

  const [template, setTemplateState] = useState<Template | null>(opts.initialTemplate ?? null)
  const [name, setNameState] = useState(opts.initialName ?? '')
  const [id, setIdState] = useState(opts.initialId ?? '')
  const [mainGroupId, setMainGroupId] = useState<string | null>(opts.initialMainGroupId ?? null)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const idEditedRef = useRef(!!opts.initialId?.trim())
  const activeJobRef = useRef<string | null>(null)
  const onCreatedRef = useRef(opts.onCreated)
  onCreatedRef.current = opts.onCreated

  const github = useProjectGithubRepo({ defaultName: id.trim() || 'project' })

  const existingIds = useMemo(() => projects.map((p) => p.id), [projects])
  const idAvailability = projectIdAvailability(id, existingIds)

  const mainGroups = useMemo(
    () => groups.filter((g) => g.type === 'MAIN').map((g) => ({ id: g.id, title: g.title })),
    [groups],
  )

  const setName = useCallback(
    (value: string) => {
      setNameState(value)
      if (!idEditedRef.current) {
        setIdState(suggestProjectIdFromName(value, template?.id))
      }
    },
    [template?.id],
  )

  const setId = useCallback((value: string) => {
    idEditedRef.current = true
    setIdState(sanitizeProjectId(value) || value)
  }, [])

  const setTemplate = useCallback((next: Template | null) => {
    setTemplateState(next)
    if (!next) return
    setNameState((prev) => {
      if (prev.trim()) return prev
      return next.name
    })
    if (!idEditedRef.current) {
      setIdState(suggestProjectIdFromName(next.name, next.id))
    }
  }, [])

  useEffect(() => {
    if (opts.initialMainGroupId === undefined) return
    setMainGroupId(opts.initialMainGroupId)
  }, [opts.initialMainGroupId])

  useEffect(() => {
    if (opts.initialTemplate !== undefined) return
    if (!opts.initialTemplateId || template) return
    const found = templates.find((row) => row.id === opts.initialTemplateId)
    if (found) setTemplate(found)
  }, [opts.initialTemplate, opts.initialTemplateId, templates, template, setTemplate])

  const githubGate = githubRepoReadiness({
    enabled: github.enabled,
    connected: github.connected,
    repoName: github.repoName,
    status: github.status,
  })

  const canSubmit =
    !!template &&
    name.trim().length > 0 &&
    id.trim().length > 0 &&
    idAvailability === 'available' &&
    !submitting &&
    !githubGate.validationError

  const submit = useCallback(async () => {
    const nextErrors: string[] = []
    if (!template) nextErrors.push(CREATE_FROM_TEMPLATE_COPY.pickTemplate)
    if (!name.trim()) nextErrors.push(CREATE_FROM_TEMPLATE_COPY.nameRequired)
    if (!id.trim()) nextErrors.push(CREATE_FROM_TEMPLATE_COPY.idRequired)
    else if (idAvailability === 'taken')
      nextErrors.push(CREATE_FROM_TEMPLATE_COPY.idTaken(id.trim()))
    if (githubGate.validationError) nextErrors.push(githubGate.validationError)
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors([])
    setSubmitting(true)
    try {
      const result = await createFromTemplate({
        templateId: template!.id,
        id: id.trim(),
        mainGroupId: mainGroupId,
        ...(githubGate.ready
          ? {
              github: {
                name: github.repoName,
                private: true,
              },
            }
          : {}),
      })
      setJobId(result.jobId)
      activeJobRef.current = result.jobId
      const progress = await result.done
      if (progress.phase === 'done') {
        await onCreatedRef.current?.(progress.projectId)
        // Backend emits phase done + error when the local fork succeeded but
        // GitHub attach failed — keep that partial-success warning visible
        // after submit ends (onCreated still runs so hosts can open App).
        const warning = progress.error?.trim()
        if (warning) setErrors([warning])
      }
    } catch (err) {
      setErrors([extractErrorMessage(err, 'Could not create project from template.')])
    } finally {
      activeJobRef.current = null
      setJobId(null)
      setSubmitting(false)
    }
  }, [
    template,
    name,
    id,
    idAvailability,
    mainGroupId,
    githubGate.validationError,
    githubGate.ready,
    github.repoName,
    createFromTemplate,
  ])

  const abort = useCallback(async () => {
    const active = activeJobRef.current ?? jobId
    if (!active) return
    try {
      await abortCreateFromTemplate(active)
    } catch (err) {
      setErrors([extractErrorMessage(err, 'Could not cancel create from template.')])
    }
  }, [abortCreateFromTemplate, jobId])

  const progress = submitting ? forkProgress : null

  return {
    template,
    setTemplate,
    name,
    setName,
    id,
    setId,
    idAvailability,
    mainGroupId,
    setMainGroupId,
    mainGroups,
    github,
    errors,
    submitting,
    canSubmit,
    progress,
    progressLabel: submitting
      ? forkProgressLabel(forkProgress) || CREATE_FROM_TEMPLATE_COPY.progressFallback
      : '',
    submit,
    abort,
    copy: CREATE_FROM_TEMPLATE_COPY,
  }
}
