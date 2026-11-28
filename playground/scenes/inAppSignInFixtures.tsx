import { useMemo, type ReactNode } from 'react'
import type { SignInSessionState } from 'thefactory-tools/types'
import {
  SIGN_IN_SESSIONS_EVENT,
  signInSessionsStoreFor,
  useApi,
  useSignInSession,
  type ProviderOAuthActions,
  type ProviderSignInReport,
} from 'thefactory-ui/headless'
import { Button, SignInSessionHost } from 'thefactory-ui/web'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

type ListenedSocket = { onMessage: (message: { data: string }) => void }

function tell(ws: unknown, event: string, data: unknown): void {
  ;(ws as ListenedSocket).onMessage({ data: JSON.stringify({ event, data }) })
}

function EndBar({ onFinished }: { onFinished?: (session: SignInSessionState) => void }) {
  const { ws } = useApi()
  const { session } = useSignInSession()
  if (!session) return null
  const end = (status: SignInSessionState['status'], error?: string) => {
    if (status === 'finished') onFinished?.(session)
    tell(ws, SIGN_IN_SESSIONS_EVENT, {
      session: { ...session, status, ...(error ? { error } : {}) },
    })
  }
  return (
    <div
      style={{ zIndex: 2147483000 }}
      className="fixed right-4 bottom-4 left-4 flex flex-wrap items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[12px] text-(--text-muted) shadow"
    >
      Showcase only:
      <Button size="sm" variant="ghost" onClick={() => end('finished')}>
        The provider signs you in
      </Button>
      <Button size="sm" variant="ghost" onClick={() => end('timed-out')}>
        It runs out
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => end('failed', 'GitHub said the code expired.')}
      >
        It fails
      </Button>
    </div>
  )
}

/**
 * A sign-in made inside the app, on made-up data: the start routes answer a
 * fake session, the app's sign-in view shows it, and a showcase-only bar ends
 * it as the backend would, so the press, the view and the way back can be
 * tried. `onFinished` runs what the backend does once it finished, before the
 * ending is told.
 */
export function WithSignInView({
  routes,
  onFinished,
  children,
}: {
  routes: FixtureRoutes
  onFinished?: (session: SignInSessionState) => void
  children: ReactNode
}) {
  return (
    <OnFixtures routes={routes}>
      {children}
      <SignInSessionHost />
      <EndBar {...(onFinished ? { onFinished } : {})} />
    </OnFixtures>
  )
}

/** A provider connection’s sign-in on the app’s own sign-in view, its start answered with `session`. */
export function useFakeProviderOAuth(
  setup: Readonly<Record<string, boolean>>,
  session: SignInSessionState,
): ProviderOAuthActions {
  const { ws } = useApi()
  return useMemo(() => {
    const sessions = signInSessionsStoreFor(ws)
    return {
      setup,
      start: async () => ({ signInId: `report-${session.id}`, session }),
      read: async (signInId) => ({ signInId, status: 'waiting' }),
      show: sessions.show,
      onReport: (listener) => ws.on<ProviderSignInReport>('providerConnections:signIn', listener),
      onEnded: sessions.onEnded,
      onReconnect: (listener) => ws.onReconnect(listener),
    }
  }, [ws, setup, session])
}
