import { useCallback, useEffect, useState } from 'react'
import { APP_SETTINGS_TYPE, CROSS_PROJECT_ACCEPTANCE_SETTING_KEY } from 'thefactory-tools/constants'
import type { FeatureRequestAcceptance } from 'thefactory-tools/types'
import { getUserSetting, putUserSetting, type PutUserSettingData } from '../api/generated'
import { deleteProjectDataRecord, putProjectDataRecord, queryProjectData } from '../api/projectData'
import { readAcceptanceLayer, resolveAcceptance } from '../utils/crossProjectSettings'

const KEY = CROSS_PROJECT_ACCEPTANCE_SETTING_KEY

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
}

/**
 * Read/write the receiver **`crossProjectAcceptance`** policy (`off` | `manual` | `autonomous`) over
 * the layered app-settings — a per-project override on top of a user-global default, resolved
 * `app ?? global ?? manual` (mirrors the shipped backend resolver, which is what actually enforces
 * the policy at emit). Backs the D.6 receiver toggle. Pass the active `projectId` for the per-project
 * layer; omit it for the global-only view.
 */
export function useCrossProjectSettings(projectId?: string): CrossProjectSettingsState {
  const [globalContent, setGlobalContent] = useState<unknown>(undefined)
  const [appContent, setAppContent] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const g = await getUserSetting({ path: { key: KEY }, throwOnError: true })
      setGlobalContent(g.data?.value ?? undefined)
      if (projectId) {
        const recs = await queryProjectData(projectId, { type: APP_SETTINGS_TYPE, key: KEY })
        setAppContent(recs[0]?.content ?? undefined)
      } else {
        setAppContent(undefined)
      }
    } catch {
      // Best-effort: leave the last-known layers in place on a transient failure.
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  const setGlobal = useCallback(async (mode: FeatureRequestAcceptance) => {
    const value = { mode } as unknown as PutUserSettingData['body']['value']
    await putUserSetting({ path: { key: KEY }, body: { value }, throwOnError: true })
    setGlobalContent({ mode })
  }, [])

  const setOverride = useCallback(
    async (mode: FeatureRequestAcceptance | undefined) => {
      if (!projectId) return
      if (mode === undefined) {
        await deleteProjectDataRecord(projectId, { type: APP_SETTINGS_TYPE, key: KEY })
        setAppContent(undefined)
      } else {
        await putProjectDataRecord(projectId, {
          type: APP_SETTINGS_TYPE,
          key: KEY,
          content: { mode },
        })
        setAppContent({ mode })
      }
    },
    [projectId],
  )

  return {
    loading,
    effective: resolveAcceptance(appContent, globalContent),
    global: readAcceptanceLayer(globalContent) ?? 'manual',
    override: readAcceptanceLayer(appContent),
    setGlobal,
    setOverride,
  }
}
