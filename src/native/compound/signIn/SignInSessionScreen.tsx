import { useEffect, useRef } from 'react'
import type { SignInSessionState } from 'thefactory-tools/types'
import { useSignInBrowser, useSignInSession } from '../../../headless'
import SignInSessionPage from './SignInSessionPage'
import SignInSessionPanel from './SignInSessionPanel'

export type SignInSessionScreenProps = {
  /** The sign-in ended, or was closed: leave the screen, back to where the person was. */
  onClosed: () => void
}

function LivePage({ session }: { session: SignInSessionState }) {
  const { state, store } = useSignInBrowser(session)
  return <SignInSessionPage state={state} store={store} />
}

/**
 * Native peer of web's `SignInSessionHost`: the sign-in the app has open, as a
 * screen the app pushes. Once the sign-in ends, or the person closes it, it
 * asks to be left, and the person is back where they pressed.
 */
export default function SignInSessionScreen({ onClosed }: SignInSessionScreenProps) {
  const { view, session, close, answer } = useSignInSession()
  const leave = useRef(onClosed)
  leave.current = onClosed
  const shown = !!view && !!session

  useEffect(() => {
    if (!shown) leave.current()
  }, [shown])

  if (!view || !session) return null
  return (
    <SignInSessionPanel
      view={view}
      page={
        view.surface === 'browser' || view.page ? (
          <LivePage key={session.id} session={session} />
        ) : null
      }
      onClose={close}
      onAnswer={answer}
    />
  )
}
