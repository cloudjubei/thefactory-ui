import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../api'
import type { CliTool } from '../api'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import { loginAwaitsCode, parseLoginUrl } from '../utils/cliRunner'

export type CliSignInStart = {
  cli: CliTool
  label: string
  /** The stored login signed in again. */
  credentialId?: string
  /** The agent's sign-in card this sign-in answers. */
  captureId?: string
}

export type UseCliSignIn = {
  /** The sign-in under way, or null before one starts and after it ends. */
  loginId: string | null
  starting: boolean
  /** The provider's sign-in page, once the CLI printed it. */
  url: string | null
  /** The CLI is waiting for the code the sign-in page shows. */
  needsCode: boolean
  /** Why the last sign-in did not start or did not finish. */
  error: string | null
  start: (request: CliSignInStart) => Promise<string | null>
  /** Hand the pasted code to the sign-in. */
  submitCode: (code: string) => Promise<void>
  cancel: () => Promise<void>
}

/**
 * One interactive CLI sign-in: start it, follow its streamed output for the
 * sign-in link and whether it waits for a code, hand it the code, and learn how
 * it ended. `onSignedIn` runs once with the login it produced.
 */
export function useCliSignIn(onSignedIn?: (credentialId: string) => void): UseCliSignIn {
  const { startAuthLogin, cancelAuthLogin, submitLoginInput, loginOutput, loginResults } =
    useCliConfigs()
  const [loginId, setLoginId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = loginId ? loginResults[loginId] : undefined
  useEffect(() => {
    if (!loginId || !result) return
    setLoginId(null)
    if (result.status === 'completed') onSignedIn?.(result.credentialId)
    else setError(result.error)
  }, [loginId, result, onSignedIn])

  const output = loginId ? (loginOutput[loginId] ?? '') : ''

  const start = useCallback(
    async ({ cli, label, credentialId, captureId }: CliSignInStart) => {
      setStarting(true)
      setError(null)
      try {
        const id = await startAuthLogin(cli, label, {
          ...(credentialId ? { credentialId } : {}),
          ...(captureId ? { captureId } : {}),
        })
        setLoginId(id)
        return id
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to start the CLI login.'))
        return null
      } finally {
        setStarting(false)
      }
    },
    [startAuthLogin],
  )

  const submitCode = useCallback(
    async (code: string) => {
      const text = code.trim()
      if (!loginId || !text) return
      await submitLoginInput(loginId, text)
    },
    [loginId, submitLoginInput],
  )

  const cancel = useCallback(async () => {
    if (!loginId) return
    setLoginId(null)
    await cancelAuthLogin(loginId).catch(() => undefined)
  }, [loginId, cancelAuthLogin])

  return {
    loginId,
    starting,
    url: parseLoginUrl(output),
    needsCode: loginAwaitsCode(output),
    error,
    start,
    submitCode,
    cancel,
  }
}
