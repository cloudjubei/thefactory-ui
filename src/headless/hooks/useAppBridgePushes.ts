import { useEffect, useState } from 'react'
import { useApi } from '../api/ApiContext'
import type { DataUpdatedEvent, LiveDataUpdatedEvent } from '../api/sdkTypes'
import { dataChangedPush, liveDataChangedPush } from '../utils/appLiveData'
import { AppPushChannel } from '../utils/appPushChannel'

/**
 * The pushes an embedded app gets about its project: `overseer:live-data.changed` when one of the
 * project's own sources starts, finishes or fails a refresh (WS `liveData:updated`), and
 * `overseer:data.changed` when the project's records change (WS `data:updated`). Hand the channel
 * to `ProjectAppView`'s `pushes`.
 */
export function useAppBridgePushes(projectId: string | undefined): AppPushChannel {
  const { ws } = useApi()
  const [channel] = useState(() => new AppPushChannel())

  useEffect(() => {
    if (!projectId) return
    const offLiveData = ws.on<LiveDataUpdatedEvent>('liveData:updated', (event) => {
      if (!event || typeof event.sourceId !== 'string') return
      const push = liveDataChangedPush(projectId, event, new Date().toISOString())
      if (push) channel.post(push)
    })
    const offData = ws.on<DataUpdatedEvent>('data:updated', (event) => {
      if (!event || typeof event.scope !== 'string' || typeof event.type !== 'string') return
      const push = dataChangedPush(projectId, event)
      if (push) channel.post(push)
    })
    return () => {
      offLiveData()
      offData()
    }
  }, [ws, projectId, channel])

  return channel
}
