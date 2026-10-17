import { designMediaType } from 'thefactory-tools/utils'
import type { ReferenceDesign } from 'thefactory-tools/types'
import type {
  DesignApp,
  DesignContentRef,
  DesignIndex,
  DesignProposal,
  DesignProposalEntry,
  DesignScreen,
  DesignSource,
  DesignState,
  DesignVersion,
  StorageUsageStanding,
} from '../api'
import type { DesignShown, DesignViewKind } from './designTypes'

/** What the `&` dropdown and the chips need of a project's design. Pure. */
export function referenceDesignOf(index: DesignIndex): ReferenceDesign {
  return {
    apps: index.apps.map((a) => ({ id: a.id, name: a.name })),
    screens: index.screens.map((s) => ({ id: s.id, appId: s.appId, name: s.name })),
    states: index.states.map((s) => ({ id: s.id, screenId: s.screenId, name: s.name })),
  }
}

/** A screen with its app; `undefined` when there is none. Pure. */
export function findDesignScreen(
  index: DesignIndex,
  screenId: string,
): { app: DesignApp; screen: DesignScreen } | undefined {
  const screen = index.screens.find((s) => s.id === screenId)
  const app = screen && index.apps.find((a) => a.id === screen.appId)
  return screen && app ? { app, screen } : undefined
}

/** A state with its screen and app; `undefined` when there is none. Pure. */
export function findDesignState(
  index: DesignIndex,
  stateId: string,
): { app: DesignApp; screen: DesignScreen; state: DesignState } | undefined {
  const state = index.states.find((s) => s.id === stateId)
  const found = state && findDesignScreen(index, state.screenId)
  return state && found ? { ...found, state } : undefined
}

/** A version as a viewer shows it, named by its screen, state, variant and number. Pure. */
export function designShownOfVersion(index: DesignIndex, version: DesignVersion): DesignShown {
  const found = findDesignState(index, version.stateId)
  const where = found ? `${found.screen.name} › ${found.state.name} · ` : ''
  return {
    ref: { versionId: version.id },
    source: version.source,
    ...(version.caseQuery ? { caseQuery: version.caseQuery } : {}),
    name: `${where}${version.variant} · v${version.number}`,
  }
}

/** One image of a proposal as a viewer shows it. Pure. */
export function designShownOfEntry(
  proposal: DesignProposal,
  entry: DesignProposalEntry,
  where?: string,
): DesignShown {
  return {
    ref: { proposalId: proposal.id, entryId: entry.id },
    source: entry.source,
    ...(entry.caseQuery ? { caseQuery: entry.caseQuery } : {}),
    name: `${where ? `${where} · ` : ''}${entry.variant} — ${proposal.title}`,
  }
}

/**
 * Where a version's or an entry's file is served, with a draft case's address
 * after it. Pass a view token (the project's App view grant) for an `<img>` or
 * `<iframe>`, which cannot send the bearer. Pure.
 */
export function designContentUrl(
  apiBaseUrl: string,
  projectId: string,
  ref: DesignContentRef,
  opts: { viewToken?: string; caseQuery?: string } = {},
): string {
  const project = `${apiBaseUrl.replace(/\/+$/, '')}/api/v1/projects/${encodeURIComponent(projectId)}/design`
  const base =
    'versionId' in ref
      ? `${project}/versions/${encodeURIComponent(ref.versionId)}/content`
      : `${project}/proposals/${encodeURIComponent(ref.proposalId)}/entries/${encodeURIComponent(ref.entryId)}/content`
  const params = new URLSearchParams(opts.caseQuery?.replace(/^\?/, '') ?? '')
  if (opts.viewToken) params.set('viewToken', opts.viewToken)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/** A design file's media type; `undefined` for a link. Pure. */
export function designSourceMediaType(source: DesignSource): string | undefined {
  if (source.type === 'link') return undefined
  return source.type === 'blob' ? source.mediaType : designMediaType(source.path)
}

/** How a viewer shows a design file. HTML and SVG go in a sandboxed frame. Pure. */
export function designViewKind(source: DesignSource): DesignViewKind {
  const mediaType = designSourceMediaType(source)
  if (mediaType === undefined) return 'link'
  if (mediaType === 'text/html' || mediaType === 'image/svg+xml') return 'html'
  if (mediaType === 'application/pdf') return 'pdf'
  if (mediaType.startsWith('image/') && mediaType !== 'image/vnd.adobe.photoshop') return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType.startsWith('text/') || mediaType === 'application/json') return 'text'
  return 'file'
}

/** The name of the file a design was made from — a link's own address. Pure. */
export function designSourceFileName(source: DesignSource): string {
  if (source.type === 'blob') return source.originalName
  if (source.type === 'project-file') return source.path.split('/').pop() ?? source.path
  return source.url.replace(/^https?:\/\//, '')
}

/** How far the total is toward the warning threshold — 1 at it, above 1 past it. Pure. */
export function storageUsageFraction(standing: StorageUsageStanding): number {
  return standing.thresholdBytes > 0 ? standing.totalBytes / standing.thresholdBytes : 1
}
