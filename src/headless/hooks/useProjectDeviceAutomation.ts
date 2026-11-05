import { useCallback, useEffect, useRef, useState } from 'react'
import { extractErrorMessage, useApi } from '../api'
import {
  readProjectDeviceAutomation,
  writeProjectDeviceAutomation,
} from '../api/projectDeviceAutomationApi'
import type { DataUpdatedEvent } from '../api/sdkTypes'
import { isProjectDeviceAutomationUpdate } from '../utils/projectDeviceAutomation'
import { PROJECT_DEVICE_AUTOMATION_TEXT } from '../utils/projectDeviceAutomationConstants'
import { useOnWsReopen } from './useOnWsReopen'

export type UseProjectDeviceAutomation = {
  /** `undefined` until it is read: unknown is never shown as off. */
  enabled: boolean | undefined
  saving: boolean
  loadError: string | undefined
  saveError: string | undefined
  reload: () => void
  setEnabled: (enabled: boolean) => void
}

/**
 * A project's device automation switch. A change an agent makes through
 * `setProjectCapabilities` is heard here too.
 */
export function useProjectDeviceAutomation(projectId: string): UseProjectDeviceAutomation {
  const { ws } = useApi()
  const [enabled, setStored] = useState<boolean | undefined>()
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [saveError, setSaveError] = useState<string | undefined>()
  const currentRef = useRef<string | undefined>(projectId)

  const reload = useCallback(() => {
    readProjectDeviceAutomation(projectId)
      .then((next) => {
        if (currentRef.current !== projectId) return
        setStored(next)
        setLoadError(undefined)
      })
      .catch((err: unknown) => {
        if (currentRef.current !== projectId) return
        setLoadError(extractErrorMessage(err, PROJECT_DEVICE_AUTOMATION_TEXT.loadFailed))
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
      ws.on<DataUpdatedEvent>('data:updated', (event) => {
        if (isProjectDeviceAutomationUpdate(event, projectId)) reload()
      }),
    [ws, projectId, reload],
  )

  useOnWsReopen(reload)

  const setEnabled = useCallback(
    (next: boolean) => {
      setSaving(true)
      setSaveError(undefined)
      writeProjectDeviceAutomation(projectId, next)
        .then((stored) => {
          if (currentRef.current === projectId) setStored(stored)
        })
        .catch((err: unknown) => {
          if (currentRef.current !== projectId) return
          setSaveError(extractErrorMessage(err, PROJECT_DEVICE_AUTOMATION_TEXT.saveFailed))
        })
        .finally(() => {
          if (currentRef.current === projectId) setSaving(false)
        })
    },
    [projectId],
  )

  return { enabled, saving, loadError, saveError, reload, setEnabled }
}
