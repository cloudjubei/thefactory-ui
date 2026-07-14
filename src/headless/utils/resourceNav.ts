import type { ChatContext, ResourceLink } from 'thefactory-tools/types'

/**
 * A client-agnostic navigation intent derived from a {@link ResourceLink}. The `path` variant covers
 * targets whose in-app route is identical across web/desktop/mobile (project, story, feature, app tab);
 * the `chat` variant hands the client the {@link ChatContext} to build its own chat URL (web encodes
 * the full key into one segment, mobile uses relative path segments — see the per-client
 * `navigateToResource`).
 */
export type ResourceNav = { type: 'path'; path: string } | { type: 'chat'; context: ChatContext }

/** Map a {@link ResourceLink} to its {@link ResourceNav}. Pure — no routing side effects. */
export function resolveResourceNav(link: ResourceLink): ResourceNav {
  switch (link.kind) {
    case 'project':
      return { type: 'path', path: `/projects/${enc(link.projectId)}` }
    case 'story':
      return { type: 'path', path: `/projects/${enc(link.projectId)}/stories/${enc(link.storyId)}` }
    case 'feature':
      // No standalone feature route; a feature link lands on its story page.
      return { type: 'path', path: `/projects/${enc(link.projectId)}/stories/${enc(link.storyId)}` }
    case 'app': {
      const query = buildQuery(link.view, link.params)
      const base = `/projects/${enc(link.projectId)}/app`
      return { type: 'path', path: query ? `${base}?${query}` : base }
    }
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
