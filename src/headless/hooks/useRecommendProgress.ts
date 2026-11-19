import { useEffect, useState } from 'react'
import { useOptionalApi } from '../api/ApiContext'
import { getActivity, listProjectData } from '../api/generated'
import type { CatalogBuildProgress, RecommendProgressData } from '../api/generated'
import { useChatActions } from '../contexts/ChatActionsContext'
import { applyRecommendProgress, EMPTY_RECOMMEND_PROGRESS } from './recommendProgress'

/** Shared web/native subscription, isolated by project, activity, record type and step. */
export function useRecommendProgress(handle: {
  activityId: string
  projectId?: string
  recordType?: string
}) {
  const api = useOptionalApi()
  const chat = useChatActions()
  const projectId = handle.projectId ?? chat?.projectId
  const { activityId } = handle
  const [state, setState] = useState(EMPTY_RECOMMEND_PROGRESS)
  const [status, setStatus] = useState('Loading progress…')
  const [error, setError] = useState<string>()
  useEffect(() => {
    setState(EMPTY_RECOMMEND_PROGRESS)
    setError(undefined)
    if (!api || !projectId) {
      setStatus('Live progress unavailable outside a project chat.')
      return
    }
    let disposed = false
    let revision = 0
    let refreshSequence = 0
    let recordType = handle.recordType
    const stepRevisions = new Map<string, number>()
    const itemRevisions = new Map<string, Map<string, number>>()
    const accept = (event: RecommendProgressData, started?: number) => {
      if (event.projectId !== projectId || event.activityId !== activityId) return
      if (recordType && event.recordType !== recordType) return
      recordType = event.recordType
      // A pending read can contain another category. Merge it, but protect every
      // item and progress line changed since that read began (including newer reads).
      const versions = itemRevisions.get(event.stepKey) ?? new Map<string, number>()
      const protectedKeys = new Set(
        [...versions]
          .filter(([, version]) => started !== undefined && version > started)
          .map(([key]) => key),
      )
      const preserveProgress =
        started !== undefined && (stepRevisions.get(event.stepKey) ?? 0) > started
      revision++
      for (const item of event.progress.categoryResult?.items ?? []) {
        if (!protectedKeys.has(item.key)) versions.set(item.key, revision)
      }
      itemRevisions.set(event.stepKey, versions)
      if (!preserveProgress) stepRevisions.set(event.stepKey, revision)
      setState((previous) =>
        applyRecommendProgress(
          previous,
          event,
          {
            projectId,
            activityId,
            recordType: event.recordType,
          },
          { protectedKeys, preserveProgress },
        ),
      )
    }
    const refresh = async () => {
      const started = revision
      const request = ++refreshSequence
      try {
        const { data: activity } = await getActivity({
          path: { projectId, activityId },
          throwOnError: true,
        })
        if (disposed) return
        const activityRecordType = handle.recordType ?? activity.recordType
        // Status/error are snapshots, unlike category deltas: only the newest
        // refresh may replace them. Older reads may still contribute unseen items.
        if (request === refreshSequence) {
          recordType = activityRecordType
          setStatus(
            activity.status === 'aborted'
              ? 'Stopped — partial results retained'
              : activity.status === 'completed'
                ? 'Completed'
                : activity.status === 'failed'
                  ? 'Failed — partial results retained'
                  : activity.status === 'running' && activity.isLive === false
                    ? 'Paused — not progressing'
                    : activity.status,
          )
          setError(activity.error)
        }
        const { data: records } = await listProjectData({
          path: { projectId },
          query: { type: `${activityRecordType}-progress`, key: activityId },
          throwOnError: true,
        })
        if (disposed) return
        const progress = records[0]?.content as CatalogBuildProgress | undefined
        // Persisted records omit the producing step. Never attribute gathering
        // to a currently running rank step; ambiguous/custom pipelines stay neutral.
        const producers = activity.steps.filter((s) =>
          /^(gather|find-more-products)(-\d+)?$/.test(s.key),
        )
        const stepKey = producers.length === 1 ? producers[0]!.key : 'catalog'
        if (progress && (progress.phase === 'suppliers' || progress.phase === 'items')) {
          accept(
            { projectId, activityId, recordType: activityRecordType, stepKey, progress },
            started,
          )
        }
      } catch {
        if (!disposed && request === refreshSequence)
          setError('Could not refresh progress. Results already received are retained.')
      }
    }
    const off = api.ws.on<RecommendProgressData>('recommend:progress', accept)
    const offActivity = api.ws.on<{ scope: string; activityId: string }>(
      'activity:updated',
      (activity) => {
        if (activity.scope === projectId && activity.activityId === activityId) void refresh()
      },
    )
    const offReconnect = api.ws.onReconnect(() => {
      void refresh()
    })
    void refresh()
    return () => {
      disposed = true
      off()
      offActivity()
      offReconnect()
    }
  }, [api?.ws, projectId, activityId, handle.recordType])
  return { state, status, error }
}
