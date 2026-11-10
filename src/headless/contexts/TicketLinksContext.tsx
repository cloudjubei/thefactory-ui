import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { readGroupTicketPreview, readProjectTicketPreview } from '../api/generated'
import { ticketPreviewStoreFor, type TicketPreviewStore } from '../hooks/ticketPreviewStore'
import type { TicketPreviewState } from '../utils/ticketCardTypes'
import { chatTicketSite } from '../utils/ticketLinks'
import type { TicketSite } from '../utils/ticketLinksTypes'
import { useProjectsOptional } from './ProjectsContext'
import { useOptionalProjectsGroups } from './ProjectsGroupsContext'
import { useOptionalProviderConnections } from './ProviderConnectionsContext'

/** What a link in a chat needs to be shown as a ticket: the chat's Jira site, and its tickets' previews. */
export type TicketLinksValue = {
  site: TicketSite
  previews: Pick<TicketPreviewStore, 'getState' | 'subscribe' | 'request'>
}

const TicketLinksContext = createContext<TicketLinksValue | undefined>(undefined)

const IDLE: TicketPreviewState = { kind: 'idle' }
const noStore = () => () => undefined

/** Hands a chat's Jira site and previews to the text inside it. A showcase passes fake ones. */
export function TicketLinksProvider({
  value,
  children,
}: {
  value: TicketLinksValue | undefined
  children: ReactNode
}) {
  return <TicketLinksContext.Provider value={value}>{children}</TicketLinksContext.Provider>
}

/** The chat's Jira site and previews, or `undefined` where no Jira is bound: links stay links. */
export function useTicketLinks(): TicketLinksValue | undefined {
  return useContext(TicketLinksContext)
}

/**
 * A ticket's preview as the chat has it. `eager` reads it as soon as this is
 * shown, for a card that is already on screen; left out, nothing is read here
 * and the card that opens asks.
 */
export function useTicketPreview(key: string | undefined, eager = false): TicketPreviewState {
  const previews = useTicketLinks()?.previews
  const getState = useCallback(
    () => (previews && key ? previews.getState(key) : IDLE),
    [previews, key],
  )
  useEffect(() => {
    if (eager && previews && key) previews.request(key)
  }, [eager, previews, key])
  return useSyncExternalStore(previews?.subscribe ?? noStore, getState, getState)
}

/**
 * A chat's ticket links, worked out from what the app has loaded: the Jira site
 * of the chat's own binding (`chatTicketSite`), and previews read through that
 * same scope, kept for the session. Without a binding to Jira it provides
 * nothing and every link stays a link.
 */
export function ChatTicketLinksProvider({
  projectId,
  groupId,
  children,
}: {
  projectId?: string | undefined
  groupId?: string | undefined
  children: ReactNode
}) {
  const projects = useProjectsOptional()?.projects
  const groups = useOptionalProjectsGroups()?.groups
  const connections = useOptionalProviderConnections()?.connections
  const found = chatTicketSite({ projectId, groupId, projects, groups, connections })
  const baseUrl = found?.baseUrl
  const projectKeys = found?.projectKeys.join(',') ?? ''
  const value = useMemo<TicketLinksValue | undefined>(() => {
    if (!baseUrl) return undefined
    const site = { baseUrl, projectKeys: projectKeys ? projectKeys.split(',') : [] }
    const scope = projectId ? `project:${projectId}` : `group:${groupId}`
    const previews = ticketPreviewStoreFor(`${scope}@${baseUrl}`, async (ticketKey) => {
      const { data } = projectId
        ? await readProjectTicketPreview({ path: { projectId, ticketKey }, throwOnError: true })
        : await readGroupTicketPreview({
            path: { groupId: groupId ?? '', ticketKey },
            throwOnError: true,
          })
      return data
    })
    return { site, previews }
  }, [projectId, groupId, baseUrl, projectKeys])
  return <TicketLinksProvider value={value}>{children}</TicketLinksProvider>
}
