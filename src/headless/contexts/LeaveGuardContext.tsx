import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { LeaveGuardStore } from '../utils/leaveGuardStore'
import type { LeaveGuardState } from '../utils/leaveGuardTypes'

const LeaveGuardContext = createContext<LeaveGuardStore | null>(null)

/**
 * One {@link LeaveGuardStore} for the shell. Wrap everything that can navigate away (the router's
 * routes, the sidebar / nav drawer) and render a host that asks from {@link useLeaveGuardState}.
 */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new LeaveGuardStore())
  return <LeaveGuardContext.Provider value={store}>{children}</LeaveGuardContext.Provider>
}

export function useLeaveGuardStore(): LeaveGuardStore | null {
  return useContext(LeaveGuardContext)
}

/** Runs `proceed` now, or after the person confirms leaving unsaved work. Outside a provider it always runs now. */
export function useRequestLeave(): (proceed: () => void) => void {
  const store = useLeaveGuardStore()
  return useCallback(
    (proceed: () => void) => {
      if (store) store.request(proceed)
      else proceed()
    },
    [store],
  )
}

/** Blocks leaving with `message` while it is non-null. */
export function useLeaveBlocker(message: string | null): void {
  const store = useLeaveGuardStore()
  const id = useId()
  useEffect(() => {
    if (!store) return
    store.setBlocker(id, message)
    return () => store.setBlocker(id, null)
  }, [store, id, message])
}

const noopSubscribe = () => () => {}
const none = () => null

export function useLeaveGuardState(): LeaveGuardState {
  const store = useLeaveGuardStore()
  const subscribe = useCallback(
    (listener: () => void) => (store ? store.subscribe(listener) : noopSubscribe()),
    [store],
  )
  const blockingMessage = useSyncExternalStore(
    subscribe,
    store ? () => store.blockingMessage() : none,
    none,
  )
  const pendingMessage = useSyncExternalStore(
    subscribe,
    store ? () => store.pendingMessage() : none,
    none,
  )
  return { blockingMessage, pendingMessage }
}
