import {
  SIGN_IN_SESSION_TEXT as TEXT,
  type RemoteBrowserState,
  type RemoteBrowserStore,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import Spinner from '../../primitives/Spinner'
import RemoteBrowserView from '../remoteBrowser/RemoteBrowserView'

export type SignInSessionPageProps = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
  /** A phone's width. */
  compact?: boolean
}

/**
 * A sign-in session's page, live: the remote browser's view of it with no bar
 * of its own, since a sign-in shows only its own page. Until the page is
 * there it says it is opening, and once it is gone that the sign-in is
 * finishing: the view around it closes a moment later. Tab goes to the page, never to a dialog around
 * it: a sign-in form is tabbed through.
 */
export default function SignInSessionPage({ state, store, compact }: SignInSessionPageProps) {
  const over = state.status === 'ended'
  if (over && state.error)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-(--surface-muted) p-6">
        <Alert>{state.error}</Alert>
      </div>
    )
  if (!state.shownId || over)
    return (
      <div
        role="status"
        className="flex min-h-0 flex-1 items-center justify-center gap-2 bg-(--surface-muted) p-6 text-sm text-(--text-secondary)"
      >
        <Spinner size={16} className="text-(--text-muted)" />
        {over ? TEXT.finishing : TEXT.opening}
      </div>
    )
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Tab') event.stopPropagation()
      }}
    >
      <RemoteBrowserView state={state} store={store} compact={compact} toolbar={false} />
    </div>
  )
}
