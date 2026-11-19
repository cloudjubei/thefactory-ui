import { useEffect, useState } from 'react'

import { extractErrorMessage, getProjectServeSettings, setProjectServeSettings } from '../api'
import { SERVE_BUILD_LIMIT_COPY } from '../utils/serveBuildLimitConstants'
import {
  readServeBuildTimeoutMs,
  serveBuildLimitField,
  serveBuildTimeoutMsToSave,
  type ServeBuildLimitField,
} from '../utils/serveBuildLimit'
import { useProjects } from '../contexts/ProjectsContext'

export type UseProjectServeSettings = {
  /** False until the project's serve settings are read. The settings are not shown before that. */
  ready: boolean
  field: ServeBuildLimitField
  saving: boolean
  saveError?: string
  saved: boolean
  setText: (text: string) => void
  save: () => void
}

type Held = { projectId: string; ms: number | undefined }

/**
 * A project's serve build limit, read from and saved to its serve settings —
 * where a serve reads it. Read again whenever the project changes, so a save
 * from another client shows. A save shows at once and is put back if refused.
 */
export function useProjectServeSettings(projectId: string): UseProjectServeSettings {
  const { projects } = useProjects()
  const project = projects.find((item) => item.id === projectId)
  const [held, setHeld] = useState<Held | undefined>()
  const [typed, setTyped] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const storedMs = held?.projectId === projectId ? held.ms : undefined
  const ready = held?.projectId === projectId

  useEffect(() => {
    setTyped(undefined)
    setSaved(false)
    setSaveError(undefined)
  }, [projectId])

  useEffect(() => {
    let current = true
    void getProjectServeSettings({ path: { projectId }, throwOnError: true })
      .then(({ data }) => {
        if (current) setHeld({ projectId, ms: readServeBuildTimeoutMs(data) })
      })
      .catch(() => {
        if (current) setHeld({ projectId, ms: undefined })
      })
    return () => {
      current = false
    }
  }, [projectId, project])

  // The held limit changes when a save is shown or answered. Drop what was
  // typed only once it is that limit, so a newer value typed in the gap
  // before the answer stays.
  useEffect(() => {
    setTyped((current) =>
      current !== undefined && serveBuildTimeoutMsToSave(current) === (storedMs ?? null)
        ? undefined
        : current,
    )
  }, [storedMs])

  const field = serveBuildLimitField(storedMs, typed)

  const setText = (text: string) => {
    setTyped(text)
    setSaved(false)
    setSaveError(undefined)
  }

  const save = () => {
    const next = serveBuildTimeoutMsToSave(field.text)
    if (!ready || next === undefined || !field.dirty || saving) return
    const before = storedMs
    setHeld({ projectId, ms: next ?? undefined })
    setSaving(true)
    setSaveError(undefined)
    setSaved(true)
    void setProjectServeSettings({
      path: { projectId },
      body: { buildTimeoutMs: next },
      throwOnError: true,
    })
      .then(({ data }) => {
        setHeld((current) =>
          current?.projectId === projectId && current.ms === (next ?? undefined)
            ? { projectId, ms: readServeBuildTimeoutMs(data) }
            : current,
        )
      })
      .catch((err: unknown) => {
        setHeld({ projectId, ms: before })
        setTyped((current) => current ?? field.text)
        setSaved(false)
        setSaveError(extractErrorMessage(err, SERVE_BUILD_LIMIT_COPY.saveFailed))
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return {
    ready,
    field,
    saving,
    ...(saveError ? { saveError } : {}),
    saved,
    setText,
    save,
  }
}
