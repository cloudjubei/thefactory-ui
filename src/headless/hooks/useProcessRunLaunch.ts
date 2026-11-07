import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { UiStackSetting } from 'thefactory-tools/types'

import {
  extractErrorMessage,
  previewProcessRun,
  startProcessRun,
  useAuth,
  type PreviewProcessRunResponse,
  type ProcessRun,
} from '../api'
import { useOptionalProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { useProjects } from '../contexts/ProjectsContext'
import {
  processLaunchDraft,
  processLaunchInputValues,
  processLaunchProblem,
  processLaunchRepos,
} from '../utils/processLaunchForm'
import { PROCESS_LAUNCH_PREVIEW_DEBOUNCE_MS } from '../utils/processLaunchFormConstants'
import type {
  ProcessLaunchDraft,
  ProcessLaunchInputValues,
  ProcessLaunchProblem,
  ProcessLaunchRepos,
} from '../utils/processLaunchFormTypes'
import { processRunStartBody } from '../utils/processRunLaunchGrant'
import { processLaunchDrafts } from './processLaunchDrafts'

export type UseProcessRunLaunch = {
  /** The form as the backend read it: what it asks for, the steps, the base branches and caps. */
  form: PreviewProcessRunResponse | undefined
  /** Why this process cannot be started from a form at all. */
  refusal: string | undefined
  repos: ProcessLaunchRepos
  /** The form as filled so far; `undefined` until what it asks for is read. */
  draft: ProcessLaunchDraft | undefined
  setDraft: (next: ProcessLaunchDraft) => void
  /** What the form sends. */
  inputValues: ProcessLaunchInputValues
  /** The first thing wrong: the form's own reading, else the backend's. */
  problem: ProcessLaunchProblem | undefined
}

/** The serve stack a project answers to: its own, else its main group's. */
function useProjectStack(projectId: string | undefined): UiStackSetting | undefined {
  const { projects } = useProjects()
  const groups = useOptionalProjectsGroups()?.groups
  return useMemo(() => {
    const project = projects.find((p) => p.id === projectId)
    const own = project?.metadata?.serveStack as UiStackSetting | undefined
    if (own) return own
    return groups?.find((g) => g.id === project?.mainGroupId)?.serveStack
  }, [projects, groups, projectId])
}

/**
 * A process's launch form, read from `POST /process-runs/preview` and kept in
 * step with what is typed, a moment behind it. What is filled lives under `key`,
 * outside this screen, so a screen pushed over it edits the same form.
 */
export function useProcessRunLaunch(input: {
  key: string
  projectId: string | undefined
  processId: string | undefined
  /** What an agent already named. */
  asked?: Readonly<Record<string, unknown>>
}): UseProcessRunLaunch {
  const { key, projectId, processId, asked } = input
  const { token } = useAuth()
  const stack = useProjectStack(projectId)
  const repos = useMemo(() => processLaunchRepos(projectId ?? '', stack), [projectId, stack])
  const [form, setForm] = useState<PreviewProcessRunResponse | undefined>()
  const [refusal, setRefusal] = useState<string | undefined>()
  const listen = useCallback(
    (onChange: () => void) => processLaunchDrafts.listen(key, onChange),
    [key],
  )
  const read = useCallback(() => processLaunchDrafts.read(key), [key])
  const draft = useSyncExternalStore(listen, read, read)
  const setDraft = useCallback(
    (next: ProcessLaunchDraft) => processLaunchDrafts.write(key, next),
    [key],
  )
  const inputs = form?.inputs
  const inputValues = useMemo(
    () => (inputs && draft ? processLaunchInputValues(inputs, draft) : {}),
    [inputs, draft],
  )
  const sent = JSON.stringify(inputValues)

  useEffect(() => {
    if (!token || !projectId || !processId) return
    let live = true
    const wait = setTimeout(
      () => {
        void previewProcessRun({
          body: { projectId, processId, inputValues: JSON.parse(sent) as ProcessLaunchInputValues },
          throwOnError: true,
        })
          .then(({ data }) => {
            if (!live) return
            setForm(data)
            setRefusal(undefined)
          })
          .catch((err: unknown) => {
            if (live) setRefusal(extractErrorMessage(err, 'The form could not be read.'))
          })
      },
      form ? PROCESS_LAUNCH_PREVIEW_DEBOUNCE_MS : 0,
    )
    return () => {
      live = false
      clearTimeout(wait)
    }
    // `form` only says whether to wait: a new one must not read the form again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId, processId, sent])

  useEffect(() => {
    if (inputs && !processLaunchDrafts.read(key)) {
      processLaunchDrafts.write(key, processLaunchDraft(inputs, repos, asked))
    }
  }, [key, inputs, repos, asked])

  const problem = useMemo((): ProcessLaunchProblem | undefined => {
    if (!inputs || !draft) return undefined
    const own = processLaunchProblem(inputs, draft)
    if (own) return own
    return form?.problem ? { message: form.problem, fieldKey: '' } : undefined
  }, [inputs, draft, form?.problem])

  return { form, refusal, repos, draft, setDraft, inputValues, problem }
}

/**
 * Starts a process from a card's decision. Resolves the run; a refused launch
 * throws with the backend's reason, for the card to say.
 */
export function useProcessRunStart(projectId: string | undefined, processId: string) {
  return useCallback(
    async (metadata: Record<string, unknown>): Promise<ProcessRun> => {
      if (!projectId) throw new Error('No project selected.')
      const { data } = await startProcessRun({
        body: processRunStartBody(projectId, processId, metadata),
        throwOnError: true,
      })
      return data as ProcessRun
    },
    [projectId, processId],
  )
}
