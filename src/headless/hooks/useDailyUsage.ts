import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LLMDailyUsageSummaryContent } from 'thefactory-tools/types'

import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { extractErrorMessage } from '../api/errorMessage'
import { getDailyUsage, recomputeDailyUsage } from '../api/generated'
import { dailyUsageRangeEnding, dailyUsageView } from '../utils/dailyUsage'
import {
  DAILY_USAGE_DEFAULT_DAYS,
  DAILY_USAGE_LOAD_FAILED,
  DAILY_USAGE_REBUILD_FAILED,
  DAILY_USAGE_UPDATED_EVENT,
} from '../utils/dailyUsageConstants'
import type { DailyUsageView } from '../utils/dailyUsageTypes'
import { useOnWsReopen } from './useOnWsReopen'

export type UseDailyUsage = {
  view: DailyUsageView
  /** `undefined` until the first read lands. */
  summaries: LLMDailyUsageSummaryContent[] | undefined
  loading: boolean
  /** Why the last read or rebuild failed, for the person to see. */
  error: string | undefined
  days: number
  setDays: (days: number) => void
  reload: () => Promise<void>
  /** Rebuild the summaries from the ledger, then read them again. */
  rebuild: () => Promise<void>
  rebuilding: boolean
}

/** The summaries of the last `days` UTC days up to `now`. */
export async function loadDailyUsage(
  now: number,
  days: number,
): Promise<LLMDailyUsageSummaryContent[]> {
  const res = await getDailyUsage({ query: dailyUsageRangeEnding(now, days), throwOnError: true })
  return res.data.summaries as LLMDailyUsageSummaryContent[]
}

/** Rebuild the summaries from the latest summarized day on; the days written. */
export async function rebuildDailyUsage(): Promise<string[]> {
  const res = await recomputeDailyUsage({ body: {}, throwOnError: true })
  return res.data.days
}

/**
 * What LLM calls spent each UTC day over the last `days` — read on mount, when
 * the range changes, whenever a rebuild writes days, and when the socket
 * comes back.
 */
export function useDailyUsage(initialDays = DAILY_USAGE_DEFAULT_DAYS): UseDailyUsage {
  const { ws } = useApi()
  const { token } = useAuth()
  const [days, setDays] = useState(initialDays)
  const [summaries, setSummaries] = useState<LLMDailyUsageSummaryContent[]>()
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState<string>()
  const latestRead = useRef(0)

  const reload = useCallback(async () => {
    const read = ++latestRead.current
    setLoading(true)
    try {
      const next = await loadDailyUsage(Date.now(), days)
      if (read !== latestRead.current) return
      setSummaries(next)
      setError(undefined)
    } catch (err) {
      if (read === latestRead.current) setError(extractErrorMessage(err, DAILY_USAGE_LOAD_FAILED))
    } finally {
      if (read === latestRead.current) setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (!token) return
    void reload()
  }, [token, reload])
  useOnWsReopen(() => void reload())
  useEffect(() => ws.on(DAILY_USAGE_UPDATED_EVENT, () => void reload()), [ws, reload])

  const rebuild = useCallback(async () => {
    setRebuilding(true)
    try {
      await rebuildDailyUsage()
      await reload()
    } catch (err) {
      setError(extractErrorMessage(err, DAILY_USAGE_REBUILD_FAILED))
    } finally {
      setRebuilding(false)
    }
  }, [reload])

  const view = useMemo(() => dailyUsageView(summaries ?? []), [summaries])

  return { view, summaries, loading, error, days, setDays, reload, rebuild, rebuilding }
}
