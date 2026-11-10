import { splitTextLinks } from './textLinks'
import { readTicketConnection } from './ticketConnection'
import type {
  ChatTicketSiteInput,
  TicketLink,
  TicketLinkSegment,
  TicketSite,
} from './ticketLinksTypes'

const TICKET_PATH = /^\/browse\/([A-Za-z][A-Za-z0-9_]*)-(\d+)\/?$/
const BARE_URL = /https?:\/\/[^\s<>"']+/g
const SENTENCE_END = /[.,;:!?)\]}]+$/

function webUrl(text: string | undefined): URL | undefined {
  if (!text || !URL.canParse(text)) return undefined
  const url = new URL(text)
  const web = url.protocol === 'https:' || url.protocol === 'http:'
  return web && !url.username && !url.password ? url : undefined
}

/**
 * A Jira connection's address as the site ticket links are held to, with the
 * Jira projects its binding names. `undefined` for anything but a web address. Pure.
 */
export function ticketSiteOf(
  baseUrl: string | undefined,
  projectKeys: readonly string[] = [],
): TicketSite | undefined {
  const url = webUrl(baseUrl)
  if (!url) return undefined
  const keys = projectKeys.map((key) => key.trim().toUpperCase()).filter(Boolean)
  return {
    baseUrl: `${url.origin}${url.pathname.replace(/\/+$/, '')}`,
    projectKeys: [...new Set(keys)],
  }
}

/**
 * The ticket a link points at, when it is one on the chat's Jira site: the
 * site's own scheme, host and port, and `/browse/KEY-123` under it, within the
 * Jira projects the binding names. Anything else, however much it looks like a
 * ticket, is `undefined` and stays a plain link. Pure.
 */
export function ticketLinkOf(url: string, site: TicketSite | undefined): TicketLink | undefined {
  const link = webUrl(url)
  const base = site ? webUrl(site.baseUrl) : undefined
  if (!site || !link || !base || link.origin !== base.origin) return undefined
  const under = base.pathname.replace(/\/+$/, '')
  if (!link.pathname.startsWith(`${under}/`)) return undefined
  const match = TICKET_PATH.exec(link.pathname.slice(under.length))
  if (!match) return undefined
  const project = match[1]!.toUpperCase()
  if (site.projectKeys.length > 0 && !site.projectKeys.includes(project)) return undefined
  return { key: `${project}-${match[2]}`, url }
}

/**
 * The address of a ticket on a Jira site, when the key is a ticket key that
 * site's links can hold; `undefined` for anything else. Pure.
 */
export function ticketUrlOnSite(siteUrl: string | undefined, key: string): string | undefined {
  const site = ticketSiteOf(siteUrl)
  return site ? ticketLinkOf(`${site.baseUrl}/browse/${key}`, site)?.url : undefined
}

function pushText(segments: TicketLinkSegment[], value: string): void {
  if (!value) return
  const last = segments[segments.length - 1]
  if (last?.type === 'text') last.value += value
  else segments.push({ type: 'text', value })
}

function pushBareTickets(segments: TicketLinkSegment[], text: string, site: TicketSite): void {
  let at = 0
  for (const match of text.matchAll(BARE_URL)) {
    const url = match[0].replace(SENTENCE_END, '')
    const ticket = ticketLinkOf(url, site)
    if (!ticket) continue
    pushText(segments, text.slice(at, match.index))
    segments.push({ type: 'ticket', ...ticket })
    at = match.index + url.length
  }
  pushText(segments, text.slice(at))
}

/**
 * A message's text with its links apart, those to a ticket on the chat's Jira
 * site marked as tickets: a written `[label](url)`, where the link is trusted
 * over its label, and a bare address in the text. With no site it reads as
 * `splitTextLinks` does. Pure.
 */
export function splitTicketLinks(text: string, site: TicketSite | undefined): TicketLinkSegment[] {
  const segments: TicketLinkSegment[] = []
  for (const part of splitTextLinks(text)) {
    if (part.type === 'link') {
      const ticket = ticketLinkOf(part.url, site)
      segments.push(ticket ? { type: 'ticket', ...ticket } : part)
    } else if (site) pushBareTickets(segments, part.value, site)
    else pushText(segments, part.value)
  }
  return segments
}

/**
 * The Jira site a chat's links are held to, by the rule the backend reads a
 * ticket's preview through: a project chat's effective binding (its own, else
 * its main group's), else a group chat's group's. `undefined` with no binding, a
 * binding to something other than Jira, or anything not loaded yet. Pure.
 */
export function chatTicketSite(input: ChatTicketSiteInput): TicketSite | undefined {
  const { projectId, groupId, projects = [], groups = [], connections = [] } = input
  const bindingOf = (id: string | null | undefined) =>
    groups.find((group) => group.id === id)?.ticketConnection
  let binding: { connectionId: string; projectKeys?: string[] } | undefined
  if (projectId) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return undefined
    const own = readTicketConnection(
      (project.metadata as { ticketConnection?: unknown } | undefined)?.ticketConnection,
    )
    if (own === 'none') return undefined
    binding = own ?? bindingOf(project.mainGroupId)
  } else if (groupId) binding = bindingOf(groupId)
  if (!binding) return undefined
  const connection = connections.find(({ id }) => id === binding.connectionId)
  return connection?.provider === 'jira'
    ? ticketSiteOf(connection.baseUrl, binding.projectKeys)
    : undefined
}
