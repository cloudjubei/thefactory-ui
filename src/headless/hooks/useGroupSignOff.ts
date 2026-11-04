import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { useProjects } from '../contexts/ProjectsContext'
import { groupSignOffScreen, signOffOutputChips } from '../utils/groupSignOff'
import { GROUP_SIGN_OFF_EVENT } from '../utils/groupSignOffConstants'
import type {
  GroupSignOffAttachment,
  GroupSignOffDecision,
  GroupSignOffScreen,
  GroupSignOffState,
  SignOffOutputActions,
  SignOffOutputChipView,
} from '../utils/groupSignOffTypes'
import { GroupSignOffStore } from './groupSignOffStore'

export type UseGroupSignOff = {
  /** What its screens show; undefined until read. */
  screen: GroupSignOffScreen | undefined
  /** Each output's chip, with what opens behind it. */
  outputs: SignOffOutputChipView[]
  outputActions: SignOffOutputActions
  readError: string | null
  actionError: string | null
  acting: GroupSignOffState['acting']
  decide: (decision: GroupSignOffDecision) => Promise<boolean>
  retry: () => Promise<boolean>
  readAttachment: (attachment: GroupSignOffAttachment) => Promise<ArrayBuffer | undefined>
}

const NO_OUTPUTS: SignOffOutputChipView[] = []

/**
 * A group run's one sign-off, read again on every update of the group run. Pass
 * no id for a run built some other way: nothing is read. An approval carries out
 * leg by leg, so its answer may still say `opening`; the updates say the rest.
 */
export function useGroupSignOff(groupRunId: string | undefined): UseGroupSignOff {
  const { token } = useAuth()
  const { ws, client } = useApi()
  const { projects } = useProjects()
  const decidedVia = useRef(client)
  decidedVia.current = client
  const store = useMemo(
    () => new GroupSignOffStore(groupRunId ?? '', () => decidedVia.current),
    [groupRunId],
  )
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && groupRunId) void store.refresh()
  }, [token, groupRunId, store])

  useEffect(() => {
    if (!token || !groupRunId) return
    const offUpdate = ws.on(GROUP_SIGN_OFF_EVENT, (data: unknown) => {
      if ((data as { groupRunId?: string })?.groupRunId === groupRunId) void store.refresh()
    })
    const offReconnect = ws.onReconnect(() => void store.refresh())
    return () => {
      offUpdate()
      offReconnect()
    }
  }, [ws, token, groupRunId, store])

  const nameOf = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.title ?? id,
    [projects],
  )

  return useMemo(
    () => ({
      screen: state.data ? groupSignOffScreen(state.data, state, nameOf) : undefined,
      outputs: state.data ? signOffOutputChips(state.data, state, nameOf) : NO_OUTPUTS,
      outputActions: {
        startEdit: store.startEdit,
        changeDraft: store.changeDraft,
        cancelEdit: store.cancelEdit,
        saveDraft: store.saveDraft,
        keepEdit: store.keepEdit,
      },
      readError: state.readError,
      actionError: state.actionError,
      acting: state.acting,
      decide: store.decide,
      retry: store.retry,
      readAttachment: store.readAttachment,
    }),
    [state, store, nameOf],
  )
}
