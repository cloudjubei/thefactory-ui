import { useCallback, useEffect, useRef, useState } from 'react'

import { extractErrorMessage, getKnowledgeEvaluationSettings } from '../api'
import { useAuth } from '../api/AuthContext'
import { readEvaluationDefaults } from '../utils/evaluationDefaults'
import type { KnowledgeEvaluationSettings } from '../utils/knowledgeEvaluationTypes'

export type UseKnowledgeEvaluationSettings = {
  /** Whether the defaults apply, the tab's defaults and every choice; undefined until read, or when the read failed. */
  settings: KnowledgeEvaluationSettings | undefined
  /** Why the last read failed, in the backend's words. */
  error: string | null
  refresh: () => Promise<void>
}

/** Read a project's evaluation settings, its stored defaults checked for shape. */
export async function readKnowledgeEvaluationSettings(
  projectId: string,
): Promise<KnowledgeEvaluationSettings | undefined> {
  const { data } = await getKnowledgeEvaluationSettings({
    path: { projectId },
    throwOnError: true,
  })
  return data ? { ...data, defaults: readEvaluationDefaults(data.defaults) ?? null } : undefined
}

/**
 * A project's knowledge evaluation settings, for the project editor's defaults field: whether its
 * agents hold the evaluation tools at all, the Evaluation tab's defaults every unset setting falls
 * back to, and the stages, presets, capabilities, fixtures and CLIs the defaults may name. Pass
 * `projectId === undefined` to idle.
 */
export function useKnowledgeEvaluationSettings(
  projectId: string | undefined,
): UseKnowledgeEvaluationSettings {
  const { token } = useAuth()
  const [settings, setSettings] = useState<KnowledgeEvaluationSettings | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const projectRef = useRef(projectId)
  projectRef.current = projectId

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSettings(undefined)
      setError(null)
      return
    }
    try {
      const read = await readKnowledgeEvaluationSettings(projectId)
      if (projectRef.current !== projectId) return
      setSettings(read)
      setError(null)
    } catch (err) {
      if (projectRef.current !== projectId) return
      setSettings(undefined)
      setError(extractErrorMessage(err, 'Could not read the evaluation settings.'))
    }
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  return { settings, error, refresh }
}
