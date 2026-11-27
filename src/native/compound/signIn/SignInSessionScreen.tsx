import { useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import type { SignInSessionState } from 'thefactory-tools/types'
import { useSignInBrowser, useSignInSession } from '../../../headless'
import SignInSessionPage from './SignInSessionPage'
import SignInSessionPanel from './SignInSessionPanel'

export type SignInSessionScreenProps = {
  /** The sign-in ended, or was closed: leave the screen, back to where the person was. */
  onClosed: () => void
  /** Opens a prompt's link in the person's own browser; the system's when absent. */
  onOpenLink?: (url: string) => void
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
export default function SignInSessionScreen({ onClosed, onOpenLink }: SignInSessionScreenProps) {
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
      page={view.surface === 'browser' ? <LivePage key={session.id} session={session} /> : null}
      onClose={close}
      onAnswer={answer}
      onOpenLink={onOpenLink ?? ((url) => void Linking.openURL(url))}
    />
  )
}
