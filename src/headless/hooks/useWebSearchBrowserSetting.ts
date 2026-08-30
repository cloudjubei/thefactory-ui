import { useCallback, useEffect, useState } from 'react'
import { getUserSetting, putUserSetting, type PutUserSettingData } from '../api'
import { useAuth } from '../api/AuthContext'

// The user-global settings key holding the web-search browser prefs. Single-sourced on the backend as
// `WEB_SEARCH_SETTINGS_KEY` (thefactory-tools) — keep this literal in sync with it.
const WEB_SEARCH_SETTINGS_KEY = 'web-search'

export interface WebSearchBrowserSetting {
  /** False until the initial read resolves (or fails) — gate the control on it so it can't flip a stale value. */
  isLoaded: boolean
  /** Whether the browser-backed web search/reads run headed (visible real Chrome) vs headless. */
  headed: boolean
  /** The last persist failure, if any (the optimistic change is reverted when a write fails). */
  saveError: Error | null
  setHeaded: (value: boolean) => Promise<void>
}

/**
 * The "use headed browser for web search" toggle, persisted under the `web-search` user setting. Reads once
 * when authenticated; `setHeaded` updates optimistically and persists, reverting the local value if the write
 * fails. The backend reads the same setting live to launch the browser headed vs headless.
 */
export function useWebSearchBrowserSetting(): WebSearchBrowserSetting {
  const { token } = useAuth()
  const [headed, setHeadedState] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        const { data } = await getUserSetting({
          path: { key: WEB_SEARCH_SETTINGS_KEY },
          throwOnError: true,
        })
        const value = (data?.value as { headedBrowser?: unknown } | null)?.headedBrowser === true
        if (!cancelled) setHeadedState(value)
      } catch {
        // A failed read leaves the safe default (headless); the control still becomes interactive below.
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const setHeaded = useCallback(
    async (value: boolean) => {
      const prev = headed
      setHeadedState(value)
      setSaveError(null)
      try {
        await putUserSetting({
          path: { key: WEB_SEARCH_SETTINGS_KEY },
          body: {
            value: { headedBrowser: value } as unknown as PutUserSettingData['body']['value'],
          },
          throwOnError: true,
        })
      } catch (err) {
        setHeadedState(prev)
        setSaveError(err instanceof Error ? err : new Error(String(err)))
      }
    },
    [headed],
  )

  return { isLoaded, headed, saveError, setHeaded }
}
