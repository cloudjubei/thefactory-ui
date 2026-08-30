import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  GetGitCredentialResponse,
  GitCredentialCreateInput,
  GitCredentialEditInput,
} from '../../../headless/api'
import {
  pollGitCredentialGithubDevice,
  startGitCredentialGithubDevice,
  startGitCredentialGithubRedirect,
} from '../../../headless/api'
import { normalizeGitCredentialHost } from '../../../headless/utils/gitCredentials'
import {
  GIT_CREDENTIAL_HOST_HINT,
  GIT_CREDENTIAL_HOST_LABEL,
  GIT_CREDENTIAL_HOST_PLACEHOLDER,
  GIT_CREDENTIAL_NAME_HINT,
  GIT_CREDENTIAL_PAT_NOTE,
  GIT_CREDENTIAL_TOKEN_PLACEHOLDER,
  GIT_CREDENTIAL_USERNAME_PLACEHOLDER,
} from '../../../headless/utils/gitCredentialConstants'
import { Alert, Button, Field, Input, SecretInput } from '../..'
import { IconSave } from '../../icons'

type GitCredentialsFormMode =
  | { kind: 'create'; onSubmit: (input: GitCredentialCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      credentials: GetGitCredentialResponse
      onSubmit: (patch: GitCredentialEditInput) => Promise<unknown>
    }

/**
 * Which OAuth affordances the form can offer on this host. Redirect only
 * makes sense in a browser (web), where the page can be navigated to
 * GitHub and back. The device flow works everywhere (web fallback when
 * popup-blocked, Electron renderer, React Native).
 *
 * When both are available the form treats `redirect` as the primary path
 * and exposes the device flow as a small secondary link — users don't
 * need to know the distinction. When only `device` is available (desktop
 * / mobile) the device flow becomes the primary path, no link needed.
 */
export interface GitCredentialsFormHostCapabilities {
  canRedirect: boolean
  canOpenBrowser: boolean
}

const DEFAULT_HOST_CAPABILITIES: GitCredentialsFormHostCapabilities = {
  canRedirect: true,
  canOpenBrowser: true,
}

export type GitCredentialsFormProps = {
  mode: GitCredentialsFormMode
  onCancel: () => void
  /**
   * Host capabilities that decide which OAuth method the primary button
   * uses. Defaults to web (`{ canRedirect: true, canOpenBrowser: true }`).
   * Desktop / mobile pass `{ canRedirect: false }`.
   */
  hostCapabilities?: GitCredentialsFormHostCapabilities
  /**
   * Fires after a successful OAuth flow lands a `GitCredential` in the
   * backend (only relevant for the device flow — redirect navigates the
   * window away and the host catches the result via `GithubCallback`).
   */
  onOauthSuccess?: (credential: GetGitCredentialResponse) => void
  /**
   * Opener for the device flow's `verificationUri`. Web uses
   * `window.open` in a new tab; desktop wires `shell.openExternal`
   * (already trapped by the main process's `setWindowOpenHandler`);
   * mobile wires `expo-web-browser`.
   */
  openExternalUrl?: (url: string) => void | Promise<void>
}

interface DeviceFlowState {
  flowId: string
  userCode: string
  verificationUri: string
  verificationUriComplete?: string
  expiresAt: number
  intervalMs: number
}

function defaultOpenExternalUrl(url: string): void {
  if (typeof window === 'undefined') {
    throw new Error('No external-URL opener available — pass `openExternalUrl`.')
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function GitCredentialsForm({
  mode,
  onCancel,
  hostCapabilities = DEFAULT_HOST_CAPABILITIES,
  onOauthSuccess,
  openExternalUrl = defaultOpenExternalUrl,
}: GitCredentialsFormProps) {
  const initial = mode.kind === 'edit' ? mode.credentials : null
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [token, setToken] = useState(initial?.token ?? '')
  const [host, setHost] = useState(initial?.host ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = mode.kind === 'create'
  // Hosts that can redirect (web) get redirect as the primary OAuth path,
  // with the device flow exposed only when the user explicitly opts into
  // it via the small "Use a device code" link. Hosts that can't redirect
  // (desktop / mobile) go straight to the device flow.
  const primaryOauthIsRedirect = hostCapabilities.canRedirect
  const showPatFallback = isCreate

  // PAT form is collapsed by default in create mode so OAuth is visually
  // the main affordance. Always expanded in edit mode (we only allow
  // re-pasting tokens there for now; "re-authorise" is just "create new").
  const [showPatForm, setShowPatForm] = useState(!isCreate)

  // ── OAuth (redirect) state ──────────────────────────────────────────────
  const [redirectBusy, setRedirectBusy] = useState(false)

  // ── OAuth (device) state ────────────────────────────────────────────────
  const [device, setDevice] = useState<DeviceFlowState | null>(null)
  const [deviceStarting, setDeviceStarting] = useState(false)
  const [devicePolling, setDevicePolling] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  const patCanSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    token.trim().length > 0

  const onSubmitPat = async (e: FormEvent) => {
    e.preventDefault()
    if (!patCanSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const normalizedHost = normalizeGitCredentialHost(host)
      await mode.onSubmit({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        token: token.trim(),
        ...(normalizedHost ? { host: normalizedHost } : {}),
      })
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setSubmitting(false)
    }
  }

  // ── OAuth redirect ──────────────────────────────────────────────────────
  // The redirect path navigates the current window away to GitHub. The
  // form is unmounted; the shared `GithubCallback` screen reads back the
  // `state` (`gitcred:<uuid>` prefix), POSTs to the backend, and the host
  // routes back to the credentials screen.
  const startRedirect = async () => {
    if (redirectBusy) return
    setRedirectBusy(true)
    setError(null)
    try {
      const { data } = await startGitCredentialGithubRedirect({
        body: { scopeLabel: name.trim() || undefined },
        throwOnError: true,
      })
      try {
        sessionStorage.setItem('overseer.github.gitcred.scopeLabel', name.trim())
      } catch {
        // sessionStorage may be unavailable; non-fatal.
      }
      window.location.assign(data.authUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start GitHub authorization')
      setRedirectBusy(false)
    }
  }

  // ── OAuth device flow ───────────────────────────────────────────────────
  const startDevice = async () => {
    if (deviceStarting || device) return
    setDeviceStarting(true)
    setError(null)
    try {
      const { data } = await startGitCredentialGithubDevice({ throwOnError: true })
      setDevice(data)
      scheduleNextPoll(data.flowId, data.intervalMs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start GitHub device flow')
    } finally {
      setDeviceStarting(false)
    }
  }

  const scheduleNextPoll = (flowId: string, intervalMs: number) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    pollTimerRef.current = setTimeout(() => void doPoll(flowId, intervalMs), intervalMs)
  }

  const doPoll = async (flowId: string, intervalMs: number) => {
    if (devicePolling) return
    setDevicePolling(true)
    try {
      const { data } = await pollGitCredentialGithubDevice({
        body: { flowId, scopeLabel: name.trim() || undefined },
        throwOnError: true,
      })
      if (data.status === 'authorized') {
        setDevice(null)
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current)
          pollTimerRef.current = null
        }
        onOauthSuccess?.(data.credential)
        onCancel()
        return
      }
      if (data.status === 'slow_down') {
        scheduleNextPoll(flowId, intervalMs + 5_000)
        return
      }
      scheduleNextPoll(flowId, intervalMs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub device flow failed')
      setDevice(null)
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    } finally {
      setDevicePolling(false)
    }
  }

  const cancelDevice = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setDevice(null)
  }

  const copyUserCode = async () => {
    if (!device) return
    try {
      await navigator.clipboard.writeText(device.userCode)
    } catch {
      // Clipboard may be unavailable; user can copy manually.
    }
    try {
      await openExternalUrl(device.verificationUriComplete ?? device.verificationUri)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open GitHub in browser')
    }
  }

  // ── render ──────────────────────────────────────────────────────────────

  // Edit mode: paste-only PAT form (no OAuth tabs). Keeps the existing
  // shape exactly — a user re-authorising via OAuth creates a fresh
  // credential rather than rotating an existing one.
  if (!isCreate) {
    return (
      <form onSubmit={onSubmitPat} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name" hint={GIT_CREDENTIAL_NAME_HINT}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Personal / Work / Org"
            autoFocus
          />
        </Field>
        <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Username">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="off"
          />
        </Field>
        <Field label="Personal access token">
          <SecretInput
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={GIT_CREDENTIAL_TOKEN_PLACEHOLDER}
            autoComplete="off"
            spellCheck={false}
            revealConfirmDescription="The token will be visible until you leave this page."
          />
        </Field>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            loading={submitting}
            disabled={!patCanSubmit}
            title="Save"
            aria-label="Save"
          >
            <IconSave className="w-4 h-4" />
          </Button>
        </div>
      </form>
    )
  }

  // Create mode: OAuth-first. The device-flow card takes over the whole
  // form when active.
  if (device) {
    return (
      <div className="flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-col gap-2 p-3 rounded-md border border-(--border-default) bg-(--surface-subtle)">
          <div className="text-sm text-(--text-primary)">
            Enter this code on GitHub to finish signing in:
          </div>
          <div className="font-mono text-xl tracking-widest text-(--text-primary)">
            {device.userCode}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" onClick={() => void copyUserCode()}>
              Copy code &amp; open GitHub
            </Button>
            <Button type="button" variant="secondary" onClick={cancelDevice}>
              Cancel
            </Button>
          </div>
          <div className="text-[11px] text-(--text-secondary)">
            Waiting for you to authorise on github.com…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}

      <Field
        label="Label (optional)"
        hint="Shown in the credentials list. Defaults to “GitHub OAuth (<login>)”."
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Personal / Work / Org"
          autoFocus
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          loading={primaryOauthIsRedirect ? redirectBusy : deviceStarting}
          onClick={() => void (primaryOauthIsRedirect ? startRedirect() : startDevice())}
        >
          Sign in with GitHub
        </Button>

        {/* Web also exposes the device flow as a small escape hatch — handy
            when redirect is blocked, when the user wants to authorise on a
            different machine, or for the rare account where GitHub rejects
            the redirect callback. Hidden on desktop / mobile where device
            is already the primary affordance. */}
        {primaryOauthIsRedirect && hostCapabilities.canOpenBrowser && (
          <button
            type="button"
            onClick={() => void startDevice()}
            disabled={deviceStarting}
            className="self-start text-[11px] text-(--text-secondary) underline hover:text-(--text-primary) disabled:opacity-60"
          >
            Use a device code instead
          </button>
        )}
      </div>

      {showPatFallback && (
        <div className="border-t border-(--border-subtle) pt-3 flex flex-col gap-2">
          {!showPatForm ? (
            <button
              type="button"
              onClick={() => setShowPatForm(true)}
              className="self-start text-[11px] text-(--text-secondary) underline hover:text-(--text-primary)"
            >
              Or paste a Personal Access Token
            </button>
          ) : (
            <form onSubmit={onSubmitPat} className="flex flex-col gap-3">
              <div className="text-[11px] text-(--text-secondary)">{GIT_CREDENTIAL_PAT_NOTE}</div>
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Personal / Work / Org"
                />
              </Field>
              <Field label={GIT_CREDENTIAL_HOST_LABEL} hint={GIT_CREDENTIAL_HOST_HINT}>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder={GIT_CREDENTIAL_HOST_PLACEHOLDER}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Username">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={GIT_CREDENTIAL_USERNAME_PLACEHOLDER}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </Field>
              <Field label="Personal access token">
                <SecretInput
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={GIT_CREDENTIAL_TOKEN_PLACEHOLDER}
                  autoComplete="off"
                  spellCheck={false}
                  revealConfirmDescription="The token will be visible until you leave this page."
                />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setShowPatForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} disabled={!patCanSubmit}>
                  Add credentials
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
