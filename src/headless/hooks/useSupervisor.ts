import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkQueueScope } from 'thefactory-tools/types'

import { extractErrorMessage } from '../api/errorMessage'
import { readScopeStops, readSupervisor, switchSupervisor } from '../api/supervisorApi'
import { supervisorPanelView } from '../utils/supervisorPanel'
import { SUPERVISOR_PANEL_COPY } from '../utils/supervisorPanelConstants'
import type {
  ScopeStop,
  SupervisorPanelView,
  SupervisorRecord,
} from '../utils/supervisorPanelTypes'

export type UseSupervisorOptions = {
  /** Told why the switch was refused, after it was taken back. */
  onError?: (message: string) => void
}

export type UseSupervisor = {
  /** Absent until the supervisor is read, and without a scope. */
  view: SupervisorPanelView | undefined
  loading: boolean
  error?: string
  /** Switch it on or off at once; the same value again sends nothing. */
  setEnabled: (enabled: boolean) => void
  toggle: () => void
  refresh: () => void
}

/**
 * The supervisor of a project, a group or the whole Overseer: its switch, what
 * it did, and the stops it hands over with their answers ready. The switch
 * shows at once and is taken back when refused.
 */
export function useSupervisor(
  scope: WorkQueueScope | undefined,
  { onError }: UseSupervisorOptions = {},
): UseSupervisor {
  const scopeKey = scope ? JSON.stringify(scope) : undefined
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [record, setRecord] = useState<SupervisorRecord>()
  const [stops, setStops] = useState<ScopeStop[]>([])
  const [pick, setPick] = useState<boolean>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const read = useRef(0)
  const switching = useRef(0)

  const refresh = useCallback(() => {
    const current = scopeRef.current
    if (!current) return
    const at = ++read.current
    setLoading(true)
    void Promise.all([readSupervisor(current), readScopeStops(current).catch(() => [])])
      .then(([readRecord, readStops]) => {
        if (at !== read.current) return
        setRecord(readRecord)
        setStops(readStops)
        setError(undefined)
      })
      .catch((err: unknown) => {
        if (at === read.current)
          setError(extractErrorMessage(err, SUPERVISOR_PANEL_COPY.loadFailed))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setRecord(undefined)
    setStops([])
    setPick(undefined)
    setError(undefined)
    if (scopeKey) refresh()
  }, [scopeKey, refresh])

  const view = useMemo(
    () => (record ? supervisorPanelView(record, stops, pick) : undefined),
    [record, stops, pick],
  )
  const enabledRef = useRef<boolean | undefined>(undefined)
  enabledRef.current = view?.enabled

  const setEnabled = useCallback((enabled: boolean) => {
    const current = scopeRef.current
    if (!current || enabledRef.current === undefined || enabledRef.current === enabled) return
    const at = ++switching.current
    enabledRef.current = enabled
    setPick(enabled)
    switchSupervisor(current, enabled)
      .then((answer) => {
        if (at !== switching.current) return
        setRecord(answer)
        setPick(undefined)
      })
      .catch((err: unknown) => {
        if (at === switching.current) setPick(undefined)
        onErrorRef.current?.(extractErrorMessage(err, SUPERVISOR_PANEL_COPY.switchFailed))
      })
  }, [])

  const toggle = useCallback(() => {
    if (enabledRef.current !== undefined) setEnabled(!enabledRef.current)
  }, [setEnabled])

  return {
    view,
    loading,
    ...(error ? { error } : {}),
    setEnabled,
    toggle,
    refresh,
  }
}
