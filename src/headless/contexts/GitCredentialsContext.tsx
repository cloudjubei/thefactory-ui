import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createGitCredential,
  deleteGitCredential,
  listGitCredentials,
  updateGitCredential,
  type GetGitCredentialResponse,
  type GitCredentialCreateInput,
  type GitCredentialEditInput,
} from '../api/generated'
import { useApi } from '../api'
import { useAuth } from '../api/AuthContext'
import { GIT_CREDENTIALS_EVENT } from '../utils/gitCredentialConstants'

export type GitCredentialsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  credentials: GetGitCredentialResponse[]
  createCredentials: (input: GitCredentialCreateInput) => Promise<GetGitCredentialResponse>
  updateCredentials: (
    id: string,
    patch: GitCredentialEditInput,
  ) => Promise<GetGitCredentialResponse>
  deleteCredentials: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const GitCredentialsContext = createContext<GitCredentialsContextValue | null>(null)

export function GitCredentialsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const { ws } = useApi()
  const [credentials, setCredentials] = useState<GetGitCredentialResponse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await listGitCredentials({ throwOnError: true })
      setCredentials(data)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  // Without this the list is a snapshot taken at login: a credential written by
  // an in-chat capture, a GitHub OAuth flow, or another window stays invisible
  // until a full reload. The event carries identity only, so refetch is the read.
  useEffect(() => ws.on(GIT_CREDENTIALS_EVENT, () => void refresh()), [ws, refresh])

  const createCredentials = useCallback(
    async (input: GitCredentialCreateInput) => {
      const { data } = await createGitCredential({ body: input, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const updateCredentials = useCallback(
    async (id: string, patch: GitCredentialEditInput) => {
      const { data } = await updateGitCredential({
        path: { id },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteCredentials = useCallback(
    async (id: string) => {
      await deleteGitCredential({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const value = useMemo<GitCredentialsContextValue>(
    () => ({
      isLoaded,
      loadError,
      credentials,
      createCredentials,
      updateCredentials,
      deleteCredentials,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      credentials,
      createCredentials,
      updateCredentials,
      deleteCredentials,
      refresh,
    ],
  )

  return <GitCredentialsContext.Provider value={value}>{children}</GitCredentialsContext.Provider>
}

export function useGitCredentials(): GitCredentialsContextValue {
  const ctx = useContext(GitCredentialsContext)
  if (!ctx) throw new Error('useGitCredentials must be used within GitCredentialsProvider')
  return ctx
}
