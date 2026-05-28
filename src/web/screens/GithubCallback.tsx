import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  completeGitCredentialGithubRedirect,
  completeOverseerGithubAuth,
  getResponseDataMessage,
} from '../../headless/api'
import LoadingScreen from '../compound/shell/LoadingScreen'

/**
 * Landing page for the GitHub OAuth redirect flow. GitHub redirects here
 * with `?code=...&state=...` after the user authorises the app. The
 * `state` is namespaced by purpose:
 *
 *   - `bootstrap:<uuid>` — the overseer first-run flow. Resolves to a
 *     `tokenId` (in-memory, 10 min TTL) that `WelcomeView` consumes to
 *     create the overseer repo.
 *   - `gitcred:<uuid>` — adding a per-credential GitHub login from
 *     Settings → Credentials. Resolves to a persisted `GitCredential`;
 *     this page hands the credential id back to the host (sessionStorage
 *     key {@link GITHUB_CREDENTIAL_STORAGE_KEY}) and navigates home so the
 *     credentials screen can refresh its list.
 *
 * Two delivery modes for the bootstrap path:
 *
 *   - **Popup mode** (`window.open(...)`): post the result back to the
 *     opener via `postMessage` and `window.close()`. The opener resumes
 *     inline.
 *   - **Full-page mode**: stash the `tokenId` under
 *     {@link GITHUB_TOKEN_STORAGE_KEY} and `navigate('/')`. `WelcomeView`
 *     reads the key on mount.
 *
 * The gitcred path is always full-page (a popup-with-postMessage
 * variant would be doable but isn't needed for the settings flow).
 */
export const GITHUB_TOKEN_STORAGE_KEY = 'overseer.github.tokenId'
export const GITHUB_CREDENTIAL_STORAGE_KEY = 'overseer.github.gitcred.credentialId'
export const GITHUB_GITCRED_SCOPE_LABEL_STORAGE_KEY = 'overseer.github.gitcred.scopeLabel'
export const GITHUB_OAUTH_MESSAGE_TYPE = 'overseer-github-oauth-result'

/**
 * Result we hand back to the opener — success or failure. Origin is checked
 * on the receiving side so an unrelated `postMessage` can't impersonate this.
 */
export type GithubOAuthResult = { ok: true; tokenId: string } | { ok: false; error: string }

/** Cross-window envelope: discriminator + result. */
export type GithubOAuthMessage = { type: typeof GITHUB_OAUTH_MESSAGE_TYPE } & GithubOAuthResult

export default function GithubCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code || !state) {
      const message = 'Missing OAuth code or state in the callback URL.'
      setError(message)
      tryReportToOpener({ ok: false, error: message })
      return
    }

    let cancelled = false
    void (async () => {
      try {
        if (state.startsWith('gitcred:')) {
          // Per-credential GitHub login from Settings → Credentials. The
          // backend persists the resulting `GitCredential` itself; we
          // just hand the id back to the host via sessionStorage so the
          // credentials screen can refresh.
          let scopeLabel: string | undefined
          try {
            scopeLabel = sessionStorage.getItem(GITHUB_GITCRED_SCOPE_LABEL_STORAGE_KEY) ?? undefined
            sessionStorage.removeItem(GITHUB_GITCRED_SCOPE_LABEL_STORAGE_KEY)
          } catch {
            // sessionStorage may be unavailable; non-fatal.
          }
          const { data } = await completeGitCredentialGithubRedirect({
            body: { code, state, scopeLabel },
            throwOnError: true,
          })
          if (cancelled) return
          try {
            sessionStorage.setItem(GITHUB_CREDENTIAL_STORAGE_KEY, data.credential.id)
          } catch {
            // Non-fatal — caller can resync from /git-credentials directly.
          }
          navigate('/', { replace: true })
          return
        }

        const { data } = await completeOverseerGithubAuth({
          body: { code, state },
          throwOnError: true,
        })
        if (cancelled) return

        if (tryReportToOpener({ ok: true, tokenId: data.tokenId })) {
          // Popup path: opener has the tokenId. Close us. (If `close()` is
          // blocked — some browsers refuse to close windows they didn't
          // open programmatically — the user just sees a "complete" screen
          // and can close it manually.)
          window.close()
          return
        }

        sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, data.tokenId)
        navigate('/', { replace: true })
      } catch (err) {
        if (cancelled) return
        const message =
          getResponseDataMessage(err) ??
          (err instanceof Error ? err.message : 'GitHub authorization failed.')
        setError(message)
        tryReportToOpener({ ok: false, error: message })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, navigate])

  if (error) {
    return <LoadingScreen label="GitHub authorization failed" error={error} />
  }
  return <LoadingScreen label="Completing GitHub authorization…" />
}

/**
 * `postMessage` the result to `window.opener` if (a) we have one and (b) it
 * isn't this same window. Returns `true` when the message was sent so the
 * caller can decide whether to also fall through to the sessionStorage path.
 */
function tryReportToOpener(result: GithubOAuthResult): boolean {
  const opener = window.opener as Window | null
  if (!opener || opener === window) return false
  const message: GithubOAuthMessage = { type: GITHUB_OAUTH_MESSAGE_TYPE, ...result }
  try {
    opener.postMessage(message, window.location.origin)
    return true
  } catch {
    return false
  }
}
