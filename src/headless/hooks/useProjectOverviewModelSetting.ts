import { useCallback, useEffect, useState } from 'react'
import {
  PROJECT_OVERVIEW_MODEL_OFF_SETTING,
  PROJECT_OVERVIEW_MODEL_SETTING_KEY,
} from 'thefactory-tools/constants'
import type { ModelChoice } from 'thefactory-tools/types'
import { readProjectOverviewModelChoice } from 'thefactory-tools/validations'
import { getUserSetting, putUserSetting, type PutUserSettingData } from '../api/generated'
import { useAuth } from '../api/AuthContext'

export interface ProjectOverviewModelSettingState {
  /** True until the first read settles; gate the control on it so it cannot write over a value not yet read. */
  loading: boolean
  /** The model that writes every project's overview — an API config or a CLI — or `null` when it is Off. */
  model: ModelChoice | null
  /** Choose a model, or `null` for Off. Shows the choice at once and puts the last one back if the write fails. */
  setModel: (model: ModelChoice | null) => Promise<void>
}

/** The model choice under the user-global `projectOverviewModel` setting, or `null` when it is Off. */
export async function readProjectOverviewModelSetting(): Promise<ModelChoice | null> {
  const { data } = await getUserSetting({
    path: { key: PROJECT_OVERVIEW_MODEL_SETTING_KEY },
    throwOnError: true,
  })
  return readProjectOverviewModelChoice(data?.value) ?? null
}

/** Store the model choice, or the Off shape for `null`. */
export async function writeProjectOverviewModelSetting(model: ModelChoice | null): Promise<void> {
  const value = (model
    ? { model }
    : { ...PROJECT_OVERVIEW_MODEL_OFF_SETTING }) as unknown as PutUserSettingData['body']['value']
  await putUserSetting({
    path: { key: PROJECT_OVERVIEW_MODEL_SETTING_KEY },
    body: { value },
    throwOnError: true,
  })
}

/**
 * The model that writes the model part of every project's overview, once a night — the user-global
 * `projectOverviewModel` setting the backend reads on each overview upkeep pass. Off by default.
 */
export function useProjectOverviewModelSetting(): ProjectOverviewModelSettingState {
  const { token } = useAuth()
  const [model, setModelState] = useState<ModelChoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void readProjectOverviewModelSetting()
      .then((stored) => {
        if (!cancelled) setModelState(stored)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const setModel = useCallback(
    async (next: ModelChoice | null) => {
      const previous = model
      setModelState(next)
      try {
        await writeProjectOverviewModelSetting(next)
      } catch {
        setModelState(previous)
      }
    },
    [model],
  )

  return { loading, model, setModel }
}
