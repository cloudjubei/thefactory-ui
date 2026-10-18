import { useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { UNSAFE_NavigationContext, parsePath, useLocation, type To } from 'react-router-dom'
import {
  LeaveGuardProvider,
  useLeaveGuardState,
  useLeaveGuardStore,
} from '../../../headless/contexts/LeaveGuardContext'
import type { LeaveGuardStore } from '../../../headless/utils/leaveGuardStore'
import LeaveConfirmDialog from './LeaveConfirmDialog'

type PatchableNavigator = {
  push: (to: To, ...rest: unknown[]) => void
  replace: (to: To, ...rest: unknown[]) => void
  go: (delta: number) => void
  location?: { pathname: string }
}

/**
 * The shell's leave guard for a `BrowserRouter` / `HashRouter` app. While a surface blocks (see
 * `useLeaveBlocker`), every navigation to another page — `navigate`, links, back / forward — and a
 * project switch made through `useRequestLeave` asks first in the same discard-style dialog forms
 * use; a reload or closing the tab gets the browser's own `beforeunload` prompt. Mount it inside the
 * router, around the routes.
 */
export default function RouterLeaveGuard({ children }: { children: ReactNode }) {
  return (
    <LeaveGuardProvider>
      <RouterLeaveGuardHost />
      {children}
    </LeaveGuardProvider>
  )
}

function RouterLeaveGuardHost() {
  const store = useLeaveGuardStore() as LeaveGuardStore
  const { navigator } = useContext(UNSAFE_NavigationContext)
  const { pathname } = useLocation()
  const { blockingMessage, pendingMessage } = useLeaveGuardState()
  const pathnameRef = useRef(pathname)
  const indexRef = useRef<number | null>(historyIndex())

  useEffect(() => {
    pathnameRef.current = pathname
    indexRef.current = historyIndex()
  })

  useLayoutEffect(() => {
    const history = navigator as unknown as PatchableNavigator
    const { push, replace, go } = history
    let allowNextPop = false
    let swallowNextPop = false

    const leavesPage = (to: To) => {
      const target = typeof to === 'string' ? parsePath(to).pathname : to.pathname
      return !!target && target !== pathnameRef.current
    }
    history.push = (to, ...rest) => {
      if (leavesPage(to)) store.request(() => push.call(history, to, ...rest))
      else push.call(history, to, ...rest)
    }
    history.replace = (to, ...rest) => {
      if (leavesPage(to)) store.request(() => replace.call(history, to, ...rest))
      else replace.call(history, to, ...rest)
    }
    history.go = (delta) =>
      store.request(() => {
        allowNextPop = delta !== 0
        go.call(history, delta)
      })

    const onPopState = (event: PopStateEvent) => {
      const next = historyIndex()
      if (allowNextPop) {
        allowNextPop = false
        indexRef.current = next
        return
      }
      if (swallowNextPop) {
        swallowNextPop = false
        event.stopImmediatePropagation()
        return
      }
      const current = indexRef.current
      if (
        store.blockingMessage() === null ||
        current === null ||
        next === null ||
        next === current ||
        history.location?.pathname === pathnameRef.current
      ) {
        indexRef.current = next
        return
      }
      const delta = next - current
      event.stopImmediatePropagation()
      swallowNextPop = true
      window.history.go(-delta)
      store.request(() => {
        allowNextPop = true
        window.history.go(delta)
      })
    }
    window.addEventListener('popstate', onPopState, true)

    return () => {
      history.push = push
      history.replace = replace
      history.go = go
      window.removeEventListener('popstate', onPopState, true)
    }
  }, [navigator, store])

  useEffect(() => {
    if (blockingMessage === null) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [blockingMessage])

  return (
    <LeaveConfirmDialog
      message={pendingMessage}
      onLeave={() => store.confirm()}
      onStay={() => store.cancel()}
    />
  )
}

function historyIndex(): number | null {
  const state = window.history.state as { idx?: unknown } | null
  return typeof state?.idx === 'number' ? state.idx : null
}
