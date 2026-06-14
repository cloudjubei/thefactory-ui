import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createProviderConnection,
  deleteProviderConnection,
  importConnectionItem,
  listConnectionAssignedItems,
  listProviderConnections,
  updateProviderConnection,
  type GetProviderConnectionResponse,
  type ImportConnectionItemResponse,
  type ListConnectionAssignedItemsResponse,
  type ProviderConnectionCreateInput,
  type UpdateProviderConnectionData,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'

/** PATCH body for a provider connection (every create field, all optional). */
export type ProviderConnectionEditInput = UpdateProviderConnectionData['body']

export type ProviderConnectionsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  connections: GetProviderConnectionResponse[]
  createConnection: (input: ProviderConnectionCreateInput) => Promise<GetProviderConnectionResponse>
  updateConnection: (
    id: string,
    patch: ProviderConnectionEditInput,
  ) => Promise<GetProviderConnectionResponse>
  deleteConnection: (id: string) => Promise<void>
  refresh: () => Promise<void>
  /** Items currently assigned to the connection's user (a live provider fetch). */
  listAssignedItems: (connectionId: string) => Promise<ListConnectionAssignedItemsResponse>
  /** Import a chosen item into a project as a Story (carrying its `externalIds` back-link). */
  importItem: (
    projectId: string,
    connectionId: string,
    externalId: string,
  ) => Promise<ImportConnectionItemResponse>
}

const ProviderConnectionsContext = createContext<ProviderConnectionsContextValue | null>(null)

export function ProviderConnectionsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [connections, setConnections] = useState<GetProviderConnectionResponse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await listProviderConnections({ throwOnError: true })
      setConnections(data)
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

  const createConnection = useCallback(
    async (input: ProviderConnectionCreateInput) => {
      const { data } = await createProviderConnection({ body: input, throwOnError: true })
      await refresh()
      return data
    },
    [refresh],
  )

  const updateConnection = useCallback(
    async (id: string, patch: ProviderConnectionEditInput) => {
      const { data } = await updateProviderConnection({
        path: { id },
        body: patch,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [refresh],
  )

  const deleteConnection = useCallback(
    async (id: string) => {
      await deleteProviderConnection({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const listAssignedItems = useCallback(async (connectionId: string) => {
    const { data } = await listConnectionAssignedItems({
      path: { id: connectionId },
      throwOnError: true,
    })
    return data
  }, [])

  const importItem = useCallback(
    async (projectId: string, connectionId: string, externalId: string) => {
      const { data } = await importConnectionItem({
        path: { projectId, connectionId },
        body: { externalId },
        throwOnError: true,
      })
      return data
    },
    [],
  )

  const value = useMemo<ProviderConnectionsContextValue>(
    () => ({
      isLoaded,
      loadError,
      connections,
      createConnection,
      updateConnection,
      deleteConnection,
      refresh,
      listAssignedItems,
      importItem,
    }),
    [
      isLoaded,
      loadError,
      connections,
      createConnection,
      updateConnection,
      deleteConnection,
      refresh,
      listAssignedItems,
      importItem,
    ],
  )

  return (
    <ProviderConnectionsContext.Provider value={value}>
      {children}
    </ProviderConnectionsContext.Provider>
  )
}

export function useProviderConnections(): ProviderConnectionsContextValue {
  const ctx = useContext(ProviderConnectionsContext)
  if (!ctx)
    throw new Error('useProviderConnections must be used within ProviderConnectionsProvider')
  return ctx
}
