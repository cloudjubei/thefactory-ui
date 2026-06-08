import { getUserSetting, putUserSetting, type PutUserSettingData } from './generated'
import { APP_SETTINGS_TYPE } from 'thefactory-tools/constants'
import { queryProjectData, putProjectDataRecord, deleteProjectDataRecord } from './projectData'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/** A layered settings value — always a JSON object (e.g. the locale set). */
export type AppSettingsValue = Record<string, unknown>

/** Which layer a `settings.put` targets: the cross-app user default, or this app only. */
export type AppSettingsLevel = 'global' | 'app'

/** `settings.get` result: the two raw layers. Apps resolve `app ?? global ?? inferred`. */
export interface AppSettingsLayers {
  global: AppSettingsValue | null
  app: AppSettingsValue | null
}

/**
 * Dispatch an `overseer:settings.*` bridge request on behalf of an embedded app.
 * Returns `undefined` for messages that aren't `settings.*` (so the host can
 * compose other handlers). A setting has two layers: a user-global default
 * (shared across every project/app) and a per-app override (this project's
 * scope). `settings.get` returns both raw; `settings.put` writes the chosen
 * layer; `settings.delete` clears the per-app override so the global default
 * re-applies. The bearer credential never leaves the host.
 */
export async function dispatchAppSettingsBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('settings.')) return undefined
  if (!projectId) {
    throw new Error('Cannot handle a settings bridge request without an active project')
  }

  switch (name) {
    case 'settings.get': {
      const p = (req.payload ?? {}) as { key?: string }
      if (!p.key) throw new Error('settings.get requires a key')
      const [appRecs, globalRes] = await Promise.all([
        queryProjectData(projectId, { type: APP_SETTINGS_TYPE, key: p.key }),
        getUserSetting({ path: { key: p.key }, throwOnError: true }),
      ])
      const layers: AppSettingsLayers = {
        global: (globalRes.data?.value as AppSettingsValue | undefined) ?? null,
        app: (appRecs[0]?.content as AppSettingsValue | undefined) ?? null,
      }
      return layers
    }
    case 'settings.put': {
      const p = (req.payload ?? {}) as {
        key?: string
        level?: AppSettingsLevel
        value?: AppSettingsValue
      }
      if (!p.key) throw new Error('settings.put requires a key')
      if (p.level !== 'global' && p.level !== 'app') {
        throw new Error("settings.put requires level 'global' or 'app'")
      }
      if (typeof p.value !== 'object' || p.value === null || Array.isArray(p.value)) {
        throw new Error('settings.put requires an object value')
      }
      if (p.level === 'global') {
        const res = await putUserSetting({
          path: { key: p.key },
          body: { value: p.value as unknown as PutUserSettingData['body']['value'] },
          throwOnError: true,
        })
        return { value: (res.data?.value as AppSettingsValue | undefined) ?? null }
      }
      const rec = await putProjectDataRecord(projectId, {
        type: APP_SETTINGS_TYPE,
        key: p.key,
        content: p.value,
      })
      return { value: rec.content as AppSettingsValue }
    }
    case 'settings.delete': {
      const p = (req.payload ?? {}) as { key?: string }
      if (!p.key) throw new Error('settings.delete requires a key')
      await deleteProjectDataRecord(projectId, { type: APP_SETTINGS_TYPE, key: p.key })
      return { deleted: true }
    }
    default:
      throw new Error(`Unknown settings bridge op: ${name}`)
  }
}
