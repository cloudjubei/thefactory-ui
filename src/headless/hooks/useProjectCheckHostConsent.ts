import { useCallback, useEffect, useRef, useState } from 'react'
import { extractErrorMessage, useApi } from '../api'
import {
  readProjectCheckHostConsent,
  revokeProjectCheckHostConsent,
} from '../api/projectCheckHostConsentApi'
import { PROJECT_CHECK_HOST_CONSENT_SETTINGS } from '../utils/projectCheckHostConsentConstants'
import { useOnWsReopen } from './useOnWsReopen'

export type UseProjectCheckHostConsent = {
  /** `undefined` until it is read: unknown is never shown as not allowed. */
  allowed: boolean | undefined
  saving: boolean
  loadError: string | undefined
  saveError: string | undefined
  reload: () => void
  revoke: () => void
}

/**
 * Whether this project's checks may fall back to the host. Allow is granted
 * from the park card; revoke here so the next fallback asks again.
 */
export function useProjectCheckHostConsent(projectId: string): UseProjectCheckHostConsent {
  const { ws } = useApi()
  const [allowed, setStored] = useState<boolean | undefined>()
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [saveError, setSaveError] = useState<string | undefined>()
  const currentRef = useRef<string | undefined>(projectId)

  const reload = useCallback(() => {
    readProjectCheckHostConsent(projectId)
      .then((next) => {
        if (currentRef.current !== projectId) return
        setStored(next)
        setLoadError(undefined)
      })
      .catch((err: unknown) => {
        if (currentRef.current !== projectId) return
        setLoadError(extractErrorMessage(err, PROJECT_CHECK_HOST_CONSENT_SETTINGS.loadFailed))
      })
  }, [projectId])

  useEffect(() => {
    currentRef.current = projectId
    setStored(undefined)
    setLoadError(undefined)
    setSaveError(undefined)
    reload()
    return () => {
      currentRef.current = undefined
    }
  }, [projectId, reload])

  useEffect(
    () =>
      ws.on('projects:updated', (event: unknown) => {
        const data = event as { projectId?: string } | undefined
        if (data?.projectId !== undefined && data.projectId !== projectId) return
        reload()
      }),
    [ws, projectId, reload],
  )

  useOnWsReopen(reload)

  const revoke = useCallback(() => {
    setSaving(true)
    setSaveError(undefined)
    revokeProjectCheckHostConsent(projectId)
      .then((stored) => {
        if (currentRef.current === projectId) setStored(stored)
      })
      .catch((err: unknown) => {
        if (currentRef.current !== projectId) return
        setSaveError(extractErrorMessage(err, PROJECT_CHECK_HOST_CONSENT_SETTINGS.revokeFailed))
      })
      .finally(() => {
        if (currentRef.current === projectId) setSaving(false)
      })
  }, [projectId])

  return { allowed, saving, loadError, saveError, reload, revoke }
}
