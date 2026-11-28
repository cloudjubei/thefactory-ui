import { useEffect, type ReactNode } from 'react'
import { useApi } from 'thefactory-ui/headless'
import type { StartCliAuthLoginData } from '../../src/headless/api/generated/types.gen'
import { cliSignInEndedMessage, type CliSignInEnding } from './cliSignInFixtures'

/** How long after the page opens the backend tells the pressed sign-in ended, in states that end. */
const ENDS_AFTER_MS = 900

type ListenedSocket = { onMessage: (message: { data: string }) => void }

/** Tells the socket's listeners the pressed sign-in ended, once it has been pressed and answered. */
export function EndsLater({
  ending,
  request,
  children,
}: {
  ending: CliSignInEnding
  request: StartCliAuthLoginData['body']
  children: ReactNode
}) {
  const { ws } = useApi()
  useEffect(() => {
    const message = cliSignInEndedMessage(ending, request)
    if (!message) return
    const timer = window.setTimeout(() => {
      ;(ws as unknown as ListenedSocket).onMessage({ data: JSON.stringify(message) })
    }, ENDS_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [ws, ending, request])
  return children
}
