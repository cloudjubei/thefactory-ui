import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkProjectGithubName,
  startGitCredentialGithubDevice,
  pollGitCredentialGithubDevice,
} from '../api/generated'

/** Availability of the chosen repository name on the connected account. */
export type GithubRepoNameStatus = 'unknown' | 'checking' | 'available' | 'taken' | 'error'

/**
 * Coerce an arbitrary string into a valid GitHub repository name: lowercase,
 * only `[a-z0-9._-]`, no leading/trailing separators, capped at 100 chars.
 */
export function sanitizeRepoName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100)
}

export interface GithubRepoReadiness {
  /** Submit should take the create-repo path. */
  ready: boolean
  /** A blocking message when the repo option is on but not submittable. */
  validationError?: string
}

/**
 * Whether the "create a GitHub repository" option is submittable, and if not, why.
 * Submit takes the create-repo path only when connected with a valid, available
 * name; an enabled-but-incomplete option blocks submit with a clear message
 * (rather than silently falling back to a plain project or hitting the backend).
 */
export function githubRepoReadiness(input: {
  enabled: boolean
  connected: boolean | null
  repoName: string
  status: GithubRepoNameStatus
}): GithubRepoReadiness {
  const name = input.repoName.trim()
  const ready =
    input.enabled && input.connected === true && name.length > 0 && input.status !== 'taken'
  let validationError: string | undefined
  if (input.enabled) {
    if (input.connected !== true) {
      validationError = 'Connect a GitHub account, or turn off “Create a GitHub repository”.'
    } else if (!name) {
      validationError = 'Repository name is required.'
    } else if (input.status === 'taken') {
      validationError = 'That repository name is already taken.'
    }
  }
  return { ready, validationError }
}

export interface UseProjectGithubRepoOptions {
  /** Recommended repo-name source — the project id. */
  defaultName: string
}

export interface UseProjectGithubRepoResult {
  /** Whether a GitHub account is connected; `null` until the first check resolves. */
  connected: boolean | null
  /** The connected account's login (for the `<login>/<name>` preview). */
  login?: string
  /** Whether to create a repo on submit. Defaults ON once connected; user-toggleable. */
  enabled: boolean
  setEnabled(value: boolean): void
  repoName: string
  setRepoName(value: string): void
  status: GithubRepoNameStatus
  /** Start the GitHub device-authorization flow (drives a connect popup). */
  connect(): Promise<void>
  /** Abandon an in-flight connect (e.g. the popup was dismissed). */
  cancelConnect(): void
  connecting: boolean
  device?: { userCode: string; verificationUri: string }
  connectError?: string
  /** True when submit should take the create-repo path (connected + valid name). */
  ready: boolean
  /** A blocking message when the repo option is on but not submittable; else undefined. */
  validationError?: string
}

/**
 * Drives the "create a GitHub repository" option in the project-create wizard:
 * resolves whether GitHub is connected, checks repo-name availability (debounced),
 * and runs the device-authorization flow when the user needs to connect. Shared
 * across clients; the per-client field component renders this state.
 */
export function useProjectGithubRepo(
  opts: UseProjectGithubRepoOptions,
): UseProjectGithubRepoResult {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [login, setLogin] = useState<string | undefined>(undefined)
  const [enabled, setEnabled] = useState(false)
  const [repoName, setRepoNameState] = useState(() => sanitizeRepoName(opts.defaultName))
  const [status, setStatus] = useState<GithubRepoNameStatus>('unknown')
  const [connecting, setConnecting] = useState(false)
  const [device, setDevice] = useState<{ userCode: string; verificationUri: string } | undefined>(
    undefined,
  )
  const [connectError, setConnectError] = useState<string | undefined>(undefined)
  const [checkNonce, setCheckNonce] = useState(0)

  const nameEditedRef = useRef(false)
  const didAutoEnableRef = useRef(false)
  // A per-invocation token for connect(); a stale loop bails once it no longer
  // matches, so a cancel-then-reconnect can't resurrect the old poll.
  const connectRunRef = useRef<object | null>(null)

  const setRepoName = useCallback((value: string) => {
    nameEditedRef.current = true
    setRepoNameState(sanitizeRepoName(value))
  }, [])

  // Track the project id until the user edits the repo name themselves.
  useEffect(() => {
    if (!nameEditedRef.current) setRepoNameState(sanitizeRepoName(opts.defaultName))
  }, [opts.defaultName])

  // Debounced check: resolves connection state and (when connected) availability.
  useEffect(() => {
    if (!repoName) {
      setStatus('unknown')
      return
    }
    let cancelled = false
    setStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { data } = await checkProjectGithubName({
          query: { name: repoName },
          throwOnError: true,
        })
        if (cancelled || !data) return
        setConnected(data.connected)
        setLogin(data.login)
        if (!data.connected) {
          setStatus('unknown')
          return
        }
        if (!didAutoEnableRef.current) {
          didAutoEnableRef.current = true
          setEnabled(true)
        }
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [repoName, checkNonce])

  const connect = useCallback(async () => {
    const myRun = {}
    connectRunRef.current = myRun
    const stale = () => connectRunRef.current !== myRun
    setConnecting(true)
    setConnectError(undefined)
    try {
      const { data: start } = await startGitCredentialGithubDevice({ throwOnError: true })
      if (stale()) return
      if (!start) throw new Error('Could not start GitHub authorization.')
      setDevice({ userCode: start.userCode, verificationUri: start.verificationUri })
      let intervalMs = Math.max(start.intervalMs || 5000, 1000)
      const deadline = start.expiresAt || Date.now() + 15 * 60 * 1000
      for (;;) {
        if (stale()) return
        if (Date.now() > deadline) throw new Error('GitHub authorization timed out.')
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        if (stale()) return
        const { data: poll } = await pollGitCredentialGithubDevice({
          body: { flowId: start.flowId },
          throwOnError: true,
        })
        if (poll?.status === 'authorized') {
          setLogin(poll.credential?.username)
          break
        }
        if (poll?.status === 'slow_down') intervalMs += 2000
      }
      if (stale()) return
      setDevice(undefined)
      setConnected(true)
      didAutoEnableRef.current = true
      setEnabled(true)
      setCheckNonce((n) => n + 1)
    } catch (err) {
      if (stale()) return
      setDevice(undefined)
      setConnectError(err instanceof Error ? err.message : 'GitHub authorization failed.')
    } finally {
      if (connectRunRef.current === myRun) setConnecting(false)
    }
  }, [])

  const cancelConnect = useCallback(() => {
    connectRunRef.current = null
    setConnecting(false)
    setDevice(undefined)
    setConnectError(undefined)
  }, [])

  const { ready, validationError } = githubRepoReadiness({ enabled, connected, repoName, status })

  return {
    connected,
    login,
    enabled,
    setEnabled,
    repoName,
    setRepoName,
    status,
    connect,
    cancelConnect,
    connecting,
    device,
    connectError,
    ready,
    validationError,
  }
}
