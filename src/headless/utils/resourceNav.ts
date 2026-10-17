import type { ChatContext, ResourceLink } from 'thefactory-tools/types'
import { FEATURE_LINK_PARAM } from './featureLinkConstants'
import { fileLocationPath } from './fileLocation'
import { NOTE_LINK_PARAM } from './projectNotesConstants'

/**
 * A client-agnostic navigation intent derived from a {@link ResourceLink}. The `path` variant covers
 * targets whose in-app route is identical across web/desktop/mobile (project, story, feature — its
 * story's page opened on it via `?feature=` — app tab, a project's or group's notes, a project's design);
 * the `chat` variant hands the client the {@link ChatContext} to build its own chat URL (web encodes
 * the full key into one segment, mobile uses relative path segments — see the per-client
 * `navigateToResource`); the `process` variant hands it a process to open in its process library,
 * which each client keeps at its own route (a project's Settings › Processes on web and desktop,
 * Settings › Processes on mobile), selected by `?process=<processId>`.
 */
export type ResourceNav =
  | { type: 'path'; path: string }
  | { type: 'chat'; context: ChatContext }
  | { type: 'process'; projectId: string; processId: string }

/** Map a {@link ResourceLink} to its {@link ResourceNav}. Pure — no routing side effects. */
export function resolveResourceNav(link: ResourceLink): ResourceNav {
  switch (link.kind) {
    case 'project':
      return { type: 'path', path: `/projects/${enc(link.projectId)}` }
    case 'story':
      return { type: 'path', path: `/projects/${enc(link.projectId)}/stories/${enc(link.storyId)}` }
    case 'feature':
      return {
        type: 'path',
        path: `/projects/${enc(link.projectId)}/stories/${enc(link.storyId)}?${FEATURE_LINK_PARAM}=${enc(link.featureId)}`,
      }
    case 'app': {
      const query = buildQuery(link.view, link.params)
      const base = `/projects/${enc(link.projectId)}/app`
      return { type: 'path', path: query ? `${base}?${query}` : base }
    }
    case 'note':
      return {
        type: 'path',
        path: `/projects/${enc(link.projectId)}/notes?${NOTE_LINK_PARAM}=${enc(link.noteId)}`,
      }
    case 'groupNote':
      return {
        type: 'path',
        path: `/groups/${enc(link.groupId)}/notes?${NOTE_LINK_PARAM}=${enc(link.noteId)}`,
      }
    case 'file':
      return { type: 'path', path: fileLocationPath(link.projectId, link.path) }
    case 'design': {
      const query = buildQuery(undefined, {
        ...(link.screenId !== undefined ? { screen: link.screenId } : {}),
        ...(link.stateId !== undefined ? { state: link.stateId } : {}),
        ...(link.proposalId !== undefined ? { proposal: link.proposalId } : {}),
      })
      const base = `/projects/${enc(link.projectId)}/design`
      return { type: 'path', path: query ? `${base}?${query}` : base }
    }
    case 'run':
      return {
        type: 'path',
        path: `/projects/${enc(link.projectId)}/process-runs/${enc(link.runId)}`,
      }
    case 'process':
      return { type: 'process', projectId: link.projectId, processId: link.processId }
    case 'chat':
      return { type: 'chat', context: link.context }
  }
}

function enc(segment: string): string {
  return encodeURIComponent(segment)
}

function buildQuery(view: string | undefined, params: Record<string, string> | undefined): string {
  const pairs: string[] = []
  if (view !== undefined) pairs.push(`view=${enc(view)}`)
  for (const [k, v] of Object.entries(params ?? {})) pairs.push(`${enc(k)}=${enc(v)}`)
  return pairs.join('&')
}
