import { useCallback, useEffect, useRef, useState } from 'react'
import { checkProjectGithubName } from '../api/generated'
import { useGithubSignIn } from './useGithubSignIn'

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
  /** Sign in with GitHub inside the app, or show the sign-in open again. */
  connect(): void
  /** The press is on its way. */
  connecting: boolean
  /** Why the sign-in did not start or finish. */
  connectError?: string
  /** True when submit should take the create-repo path (connected + valid name). */
  ready: boolean
  /** A blocking message when the repo option is on but not submittable; else undefined. */
  validationError?: string
}

/**
 * Drives the "create a GitHub repository" option in the project-create wizard:
 * resolves whether GitHub is connected, checks repo-name availability (debounced),
 * and signs in with GitHub inside the app when the user needs to connect. Shared
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
  const [checkNonce, setCheckNonce] = useState(0)

  const nameEditedRef = useRef(false)
  const didAutoEnableRef = useRef(false)
  const github = useGithubSignIn('git-credential')
  const signedIn = github.state.step === 'done'

  useEffect(() => {
    if (!signedIn) return
    setConnected(true)
    didAutoEnableRef.current = true
    setEnabled(true)
    setCheckNonce((n) => n + 1)
  }, [signedIn])

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

  const { ready, validationError } = githubRepoReadiness({ enabled, connected, repoName, status })

  return {
    connected,
    login,
    enabled,
    setEnabled,
    repoName,
    setRepoName,
    status,
    connect: github.start,
    connecting: github.busy,
    ...(github.state.error ? { connectError: github.state.error } : {}),
    ready,
    validationError,
  }
}
