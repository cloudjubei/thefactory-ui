import type { SignInSessionState } from 'thefactory-tools/types'
import { useSignInBrowser, useSignInSession } from '../../../headless'
import SignInSessionDialog from './SignInSessionDialog'
import SignInSessionPage from './SignInSessionPage'

function LivePage({ session }: { session: SignInSessionState }) {
  const { state, store } = useSignInBrowser(session)
  return <SignInSessionPage state={state} store={store} />
}

/**
 * Shows the sign-in the app has open, over whatever the person was on, and
 * goes by itself once it ends: they are back where they pressed. Mounted once
 * per app; whatever starts a sign-in only hands its session to
 * `useSignInSession().show`.
 */
export default function SignInSessionHost() {
  const { view, session, close, answer } = useSignInSession()
  if (!view || !session) return null
  return (
    <SignInSessionDialog
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
