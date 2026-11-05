import { useCallback, useEffect, useState } from 'react'
import {
  APP_SETTINGS_TYPE,
  CROSS_PROJECT_ACCEPTANCE_SETTING_KEY,
  CROSS_PROJECT_RESUME_MODE_SETTING_KEY,
} from 'thefactory-tools/constants'
import type { FeatureRequestAcceptance, FeatureRequestResumeMode } from 'thefactory-tools/types'
import { getUserSetting, putUserSetting, type PutUserSettingData } from '../api/generated'
import { deleteProjectDataRecord, putProjectDataRecord, queryProjectData } from '../api/projectData'
import {
  readAcceptanceLayer,
  readResumeLayer,
  resolveAcceptance,
  resolveResumeMode,
} from '../utils/crossProjectSettings'

export interface CrossProjectSettingsState {
  loading: boolean
  /** The effective receiver acceptance for the active project — override ?? global ?? `manual`. */
  effective: FeatureRequestAcceptance
  /** The user-global default acceptance. */
  global: FeatureRequestAcceptance
  /** The active project's override, or `undefined` when it inherits the global default. */
  override: FeatureRequestAcceptance | undefined
  /** Write the user-global default. */
  setGlobal: (mode: FeatureRequestAcceptance) => Promise<void>
  /** Write (or, with `undefined`, clear) the active project's override. */
  setOverride: (mode: FeatureRequestAcceptance | undefined) => Promise<void>
  /** How the sender continues when a request it sent finishes. */
  resume: CrossProjectResumeState
}

/** The sender's resume mode: the same two layers, under its own setting. */
export interface CrossProjectResumeState {
  /** The effective mode for the active project — override ?? global ?? `ask`. */
  effective: FeatureRequestResumeMode
  /** The user-global default. */
  global: FeatureRequestResumeMode
  /** The active project's override, or `undefined` when it inherits the global default. */
  override: FeatureRequestResumeMode | undefined
  /** Write the user-global default. */
  setGlobal: (mode: FeatureRequestResumeMode) => Promise<void>
  /** Write (or, with `undefined`, clear) the active project's override. */
  setOverride: (mode: FeatureRequestResumeMode | undefined) => Promise<void>
}

interface LayeredMode<TMode extends string> {
  loading: boolean
  globalContent: unknown
  appContent: unknown
  setGlobal: (mode: TMode) => Promise<void>
  setOverride: (mode: TMode | undefined) => Promise<void>
}

/** A `{ mode }` setting kept per project over a user-global default, read and written. */
function useLayeredMode<TMode extends string>(key: string, projectId?: string): LayeredMode<TMode> {
  const [globalContent, setGlobalContent] = useState<unknown>(undefined)
  const [appContent, setAppContent] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const g = await getUserSetting({ path: { key }, throwOnError: true })
      setGlobalContent(g.data?.value ?? undefined)
      if (projectId) {
        const recs = await queryProjectData(projectId, { type: APP_SETTINGS_TYPE, key })
        setAppContent(recs[0]?.content ?? undefined)
      } else {
        setAppContent(undefined)
      }
    } catch {
      // Best-effort: leave the last-known layers in place on a transient failure.
    } finally {
      setLoading(false)
    }
  }, [key, projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const setGlobal = useCallback(
    async (mode: TMode) => {
      const value = { mode } as unknown as PutUserSettingData['body']['value']
      await putUserSetting({ path: { key }, body: { value }, throwOnError: true })
      setGlobalContent({ mode })
    },
    [key],
  )

  const setOverride = useCallback(
    async (mode: TMode | undefined) => {
      if (!projectId) return
      if (mode === undefined) {
        await deleteProjectDataRecord(projectId, { type: APP_SETTINGS_TYPE, key })
        setAppContent(undefined)
      } else {
        await putProjectDataRecord(projectId, {
          type: APP_SETTINGS_TYPE,
          key,
          content: { mode },
        })
        setAppContent({ mode })
      }
    },
    [key, projectId],
  )

  return { loading, globalContent, appContent, setGlobal, setOverride }
}

/**
 * Read/write the receiver **`crossProjectAcceptance`** policy (`off` | `manual` | `autonomous`) and
 * the sender **`crossProjectResumeMode`** (`notify` | `ask` | `auto`) over the layered app-settings
 * — a per-project override on top of a user-global default, resolved as the backend does. Backs the
 * Cross-project settings. Pass the active `projectId` for the per-project layer; omit it for the
 * global-only view.
 */
export function useCrossProjectSettings(projectId?: string): CrossProjectSettingsState {
  const acceptance = useLayeredMode<FeatureRequestAcceptance>(
    CROSS_PROJECT_ACCEPTANCE_SETTING_KEY,
    projectId,
  )
  const resume = useLayeredMode<FeatureRequestResumeMode>(
    CROSS_PROJECT_RESUME_MODE_SETTING_KEY,
    projectId,
  )

  return {
    loading: acceptance.loading || resume.loading,
    effective: resolveAcceptance(acceptance.appContent, acceptance.globalContent),
    global: readAcceptanceLayer(acceptance.globalContent) ?? 'manual',
    override: readAcceptanceLayer(acceptance.appContent),
    setGlobal: acceptance.setGlobal,
    setOverride: acceptance.setOverride,
    resume: {
      effective: resolveResumeMode(resume.appContent, resume.globalContent),
      global: resolveResumeMode(undefined, resume.globalContent),
      override: readResumeLayer(resume.appContent),
      setGlobal: resume.setGlobal,
      setOverride: resume.setOverride,
    },
  }
}
