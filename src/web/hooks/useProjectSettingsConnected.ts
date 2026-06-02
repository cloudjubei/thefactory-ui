import {
  useProjectSettings as useProjectSettingsCore,
  type ProjectSettingsApi,
} from '../../headless'
import { localStorageAdapter } from '../compound/storage/localStorageAdapter'

/**
 * Per-project UI preferences keyed by `projectId`, for browser clients (web +
 * the Electron renderer). Binds the shared `localStorage`-backed adapter to
 * the headless `useProjectSettings` core (the single source of truth across
 * web, mobile, and desktop).
 */
export function useProjectSettingsConnected(projectId: string | undefined): ProjectSettingsApi {
  return useProjectSettingsCore(localStorageAdapter, projectId)
}
