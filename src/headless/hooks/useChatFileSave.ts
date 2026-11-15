import { useCallback, useSyncExternalStore } from 'react'
import { chatFileSaveStore } from './chatFileSaveStore'
import type { ChatFileSaveState, ChatFileSaving } from '../utils/chatFileSaveTypes'

export type UseChatFileSave = {
  state: ChatFileSaveState
  save: (destination: string, overwrite?: boolean) => void
  dismiss: () => void
}

/** Saving one shown file into the chat's project: shown as saved at once, taken back on failure. */
export function useChatFileSave(saving: ChatFileSaving, source: string): UseChatFileSave {
  const { projectId, save: call } = saving
  const subscribe = useCallback((listener: () => void) => chatFileSaveStore.subscribe(listener), [])
  const read = useCallback(() => chatFileSaveStore.stateOf(projectId, source), [projectId, source])
  const state = useSyncExternalStore(subscribe, read, read)
  const save = useCallback(
    (destination: string, overwrite?: boolean) => {
      void chatFileSaveStore.save({
        projectId,
        source,
        destination,
        ...(overwrite ? { overwrite } : {}),
        ...(call ? { call } : {}),
      })
    },
    [projectId, source, call],
  )
  const dismiss = useCallback(
    () => chatFileSaveStore.dismiss(projectId, source),
    [projectId, source],
  )
  return { state, save, dismiss }
}
