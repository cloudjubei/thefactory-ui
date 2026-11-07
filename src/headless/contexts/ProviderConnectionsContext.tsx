import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createProviderConnection,
  deleteProviderConnection,
  importConnectionItem,
  listConnectionAssignedItems,
  listConnectionStatuses,
  listProviderConnections,
  readProviderOAuthSetup,
  readProviderSignIn,
  startProviderOAuth,
  updateProviderConnection,
  withdrawProviderSignIn,
  type GetProviderConnectionResponse,
  type ImportConnectionItemResponse,
  type ListConnectionAssignedItemsResponse,
  type ProviderConnectionCreateInput,
  type UpdateProviderConnectionData,
} from '../api/generated'
import { useApi } from '../api'
import { useAuth } from '../api/AuthContext'
import { errorStatus } from '../api/errorMessage'
import {
  PROVIDER_CONNECTIONS_EVENT,
  PROVIDER_SIGN_IN_EVENT,
} from '../utils/credentialStoreEventConstants'
import { listConnectionNewItems, markConnectionItemsSeen } from '../api/connectorSyncApi'
import {
  connectorNewItemsById,
  connectorShownItems,
  withConnectorNewItems,
} from '../utils/connectorNewItems'
import { CONNECTOR_NEW_ITEMS_EVENT } from '../utils/connectorNewItemsConstants'
import type { AssignedItemsToShow, ConnectorNewItems } from '../utils/connectorNewItemsTypes'
import type {
  ProviderOAuthActions,
  ProviderSignInReport,
} from '../utils/providerConnectionFormTypes'

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
  /** Sign in with a provider: which ones can, the page to open, and how it ended. */
  oauth: ProviderOAuthActions
  refresh: () => Promise<void>
  /** The statuses a sign-off can move a ticket to through this connection, within these project keys. */
  listStatuses: (connectionId: string, projectKeys: readonly string[]) => Promise<string[]>
  /** Items currently assigned to the connection's user (a live provider fetch). */
  listAssignedItems: (connectionId: string) => Promise<ListConnectionAssignedItemsResponse>
  /** Each connection's tickets not shown yet, kept current in the background: the Import tickets badge. */
  newItems: Readonly<Record<string, ConnectorNewItems>>
  /**
   * List a connection's assigned items for the person to see. Once they are on
   * screen, `markShown` takes them out of the badge, under the identity the
   * connection had when they were listed.
   */
  listItemsToShow: (connectionId: string) => Promise<AssignedItemsToShow>
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
  const { ws } = useApi()
  const [connections, setConnections] = useState<GetProviderConnectionResponse[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [newItems, setNewItems] = useState<Record<string, ConnectorNewItems>>({})
  const [oauthSetup, setOauthSetup] = useState<ProviderOAuthActions['setup']>({})
  const newItemsRef = useRef(newItems)
  newItemsRef.current = newItems

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

  const loadNewItems = useCallback(async () => {
    try {
      const byId = connectorNewItemsById(await listConnectionNewItems())
      setNewItems(byId)
      return byId
    } catch {
      return newItemsRef.current
    }
  }, [])

  const loadOAuthSetup = useCallback(async () => {
    try {
      const { data } = await readProviderOAuthSetup({ throwOnError: true })
      setOauthSetup(data)
    } catch {
      setOauthSetup({})
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void refresh()
    void loadNewItems()
    void loadOAuthSetup()
  }, [token, refresh, loadNewItems, loadOAuthSetup])
  // Whoever wrote it — another window, an agent's credential form or admin
  // tool — the list refetches, instead of staying the snapshot taken at login.
  // A changed connection may count under a new identity, so its badge does too.
  useEffect(
    () =>
      ws.on(PROVIDER_CONNECTIONS_EVENT, () => {
        void refresh()
        void loadNewItems()
      }),
    [ws, refresh, loadNewItems],
  )
  useEffect(
    () =>
      ws.on<ConnectorNewItems>(CONNECTOR_NEW_ITEMS_EVENT, (counts) =>
        setNewItems((prev) => withConnectorNewItems(prev, counts)),
      ),
    [ws],
  )
  useEffect(() => ws.onReconnect(() => void loadNewItems()), [ws, loadNewItems])

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

  const oauth = useMemo<ProviderOAuthActions>(
    () => ({
      setup: oauthSetup,
      start: async (provider, body) => {
        const { data } = await startProviderOAuth({ path: { provider }, body, throwOnError: true })
        return { page: data.authorizationUrl, signInId: data.signInId }
      },
      read: async (signInId) => {
        try {
          const { data } = await readProviderSignIn({ path: { signInId }, throwOnError: true })
          if (data.status === 'signed-in') await refresh()
          return data
        } catch (err) {
          if (errorStatus(err) === 404) return undefined
          throw err
        }
      },
      withdraw: async (signInId) => {
        await withdrawProviderSignIn({ path: { signInId }, throwOnError: true })
      },
      onReport: (listener) => ws.on<ProviderSignInReport>(PROVIDER_SIGN_IN_EVENT, listener),
      onReconnect: (listener) => ws.onReconnect(listener),
    }),
    [oauthSetup, refresh, ws],
  )

  const deleteConnection = useCallback(
    async (id: string) => {
      await deleteProviderConnection({ path: { id }, throwOnError: true })
      await refresh()
    },
    [refresh],
  )

  const listStatuses = useCallback(async (connectionId: string, projectKeys: readonly string[]) => {
    const { data } = await listConnectionStatuses({
      path: { id: connectionId },
      query: projectKeys.length ? { projectKeys: projectKeys.join(',') } : {},
      throwOnError: true,
    })
    return data.statuses
  }, [])

  const listAssignedItems = useCallback(async (connectionId: string) => {
    const { data } = await listConnectionAssignedItems({
      path: { id: connectionId },
      throwOnError: true,
    })
    return data
  }, [])

  const listItemsToShow = useCallback(
    async (connectionId: string): Promise<AssignedItemsToShow> => {
      const identityEpoch =
        newItemsRef.current[connectionId]?.identityEpoch ??
        (await loadNewItems())[connectionId]?.identityEpoch
      const items = await listAssignedItems(connectionId)
      const markShown = async () => {
        if (!identityEpoch) return
        try {
          const counts = await markConnectionItemsSeen(
            connectionId,
            identityEpoch,
            connectorShownItems(items),
          )
          setNewItems((prev) => withConnectorNewItems(prev, counts))
        } catch {
          return
        }
      }
      return { items, markShown }
    },
    [listAssignedItems, loadNewItems],
  )

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
      oauth,
      refresh,
      listStatuses,
      listAssignedItems,
      newItems,
      listItemsToShow,
      importItem,
    }),
    [
      isLoaded,
      loadError,
      connections,
      createConnection,
      updateConnection,
      deleteConnection,
      oauth,
      refresh,
      listStatuses,
      listAssignedItems,
      newItems,
      listItemsToShow,
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
