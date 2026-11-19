import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useOptionalApi } from '../api/ApiContext'
import { getActivity } from '../api/generated'
import { launchTrainerSuggestion } from '../api/trainerSuggestionsApi'
import { useChatActions } from '../contexts/ChatActionsContext'
import {
  TrainerSuggestionStore,
  trainerActivityLabel,
  type TrainerSuggestionLaunchProps,
  type TrainerSuggestionState,
} from './trainerSuggestionStore'

const stores = new WeakMap<object, Map<string, TrainerSuggestionStore>>()
const IDLE: TrainerSuggestionState = { launching: false }
const noListen = () => () => {}
const idleSnapshot = () => IDLE

export function useTrainerSuggestionLaunch(props: TrainerSuggestionLaunchProps) {
  const api = useOptionalApi()
  const chat = useChatActions()
  const projectId = props.projectId ?? chat?.projectId
  const { suggestionId, project } = props
  const store = useMemo(() => {
    if (!api || !projectId) return undefined
    let scoped = stores.get(api.ws)
    if (!scoped) {
      scoped = new Map()
      stores.set(api.ws, scoped)
    }
    const key = JSON.stringify([projectId, project, suggestionId])
    let entry = scoped.get(key)
    if (!entry) {
      entry = new TrainerSuggestionStore(
        () => launchTrainerSuggestion(projectId, suggestionId, project),
        async (activityId) =>
          (await getActivity({ path: { projectId, activityId }, throwOnError: true })).data,
      )
      scoped.set(key, entry)
    }
    return entry
  }, [api?.ws, projectId, suggestionId, project])
  const state = useSyncExternalStore(
    store?.listen ?? noListen,
    store?.snapshot ?? idleSnapshot,
    store?.snapshot ?? idleSnapshot,
  )
  useEffect(() => {
    if (!store || !api) return
    void store.refresh()
    const off = api.ws.on<{ activityId?: string; scope?: string }>('activity:updated', (event) => {
      if (event.scope === projectId && event.activityId === store.snapshot().activityId)
        void store.refresh()
    })
    const reconnect = api.ws.onReconnect(() => {
      void store.refresh()
    })
    return () => {
      off()
      reconnect()
    }
  }, [store, api?.ws, projectId])
  useEffect(() => {
    if (!store || !state.activityId) return
    if (state.activity && !['queued', 'running'].includes(state.activity.status)) return
    const timer = setInterval(() => {
      void store.refresh()
    }, 5000)
    return () => clearInterval(timer)
  }, [store, state.activityId, state.activity?.status])
  return {
    state,
    label: trainerActivityLabel(state),
    canLaunch: !!store && !state.launching && !state.activityId,
    launch: () => {
      void store?.launch()
    },
    refresh: () => {
      void store?.refresh()
    },
    unavailable: !store,
  }
}
