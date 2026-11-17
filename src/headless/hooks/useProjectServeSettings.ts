import { useEffect, useState } from 'react'

import { extractErrorMessage, updateProject } from '../api'
import { SERVE_BUILD_LIMIT_COPY } from '../utils/serveBuildLimitConstants'
import {
  readServeBuildTimeoutMs,
  serveBuildLimitField,
  serveBuildLimitMinutesText,
  withServeBuildTimeout,
  type ServeBuildLimitField,
} from '../utils/serveBuildLimit'
import { useProjects } from '../contexts/ProjectsContext'

export type UseProjectServeSettings = {
  /** False until the project is in the list. The settings are not shown before that. */
  ready: boolean
  field: ServeBuildLimitField
  saving: boolean
  saveError?: string
  saved: boolean
  setText: (text: string) => void
  save: () => void
}

/** A project's serve build limit: what the field shows, and a save onto its metadata. */
export function useProjectServeSettings(projectId: string): UseProjectServeSettings {
  const { projects } = useProjects()
  const project = projects.find((item) => item.id === projectId)
  const metadata = (project?.metadata ?? {}) as Record<string, unknown>
  const storedMs = readServeBuildTimeoutMs(metadata)
  const [typed, setTyped] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const storedKey = storedMs === undefined ? '' : String(storedMs)

  useEffect(() => {
    setTyped(undefined)
    setSaved(false)
    setSaveError(undefined)
  }, [projectId])

  // A refresh after Save changes the stored limit and would wipe the field.
  // Drop what was typed only once it matches that limit, so a newer value
  // typed in the gap after the request returns stays.
  useEffect(() => {
    setTyped((current) => {
      if (current === undefined) return current
      const storedText = storedMs === undefined ? '' : serveBuildLimitMinutesText(storedMs)
      return current === storedText ? undefined : current
    })
  }, [storedKey, storedMs])

  const field = serveBuildLimitField(storedMs, typed)

  const setText = (text: string) => {
    setTyped(text)
    setSaved(false)
    setSaveError(undefined)
  }

  const save = () => {
    if (!project || !field.dirty || field.error || saving) return
    setSaving(true)
    setSaveError(undefined)
    setSaved(false)
    void updateProject({
      path: { id: projectId },
      body: { metadata: withServeBuildTimeout(metadata, field.text) },
      throwOnError: true,
    })
      .then(() => {
        setSaved(true)
      })
      .catch((err: unknown) => {
        setSaveError(extractErrorMessage(err, SERVE_BUILD_LIMIT_COPY.saveFailed))
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return {
    ready: project !== undefined,
    field,
    saving,
    ...(saveError ? { saveError } : {}),
    saved,
    setText,
    save,
  }
}
