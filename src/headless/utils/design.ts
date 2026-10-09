import { designMediaType } from 'thefactory-tools/utils'
import type { ReferenceDesign } from 'thefactory-tools/types'
import type {
  DesignAppTree,
  DesignItem,
  DesignScreenTree,
  DesignTree,
  StorageUsageStanding,
} from '../api'
import type { DesignItemViewKind } from './designTypes'

/** What the `&` dropdown and the chips need of a project's design. Pure. */
export function referenceDesignOf(tree: DesignTree): ReferenceDesign {
  const screens = tree.apps.flatMap((a) => a.screens)
  return {
    apps: tree.apps.map((a) => ({ id: a.id, name: a.name })),
    screens: screens.map((s) => ({ id: s.id, appId: s.appId, name: s.name })),
    items: screens.flatMap((s) =>
      s.items.map((i) => ({
        id: i.id,
        screenId: i.screenId,
        name: i.name,
        kind: i.kind,
        ...(i.approved ? { approved: true } : {}),
      })),
    ),
  }
}

/** A screen with its app; `undefined` when there is none. Pure. */
export function findDesignScreen(
  tree: DesignTree,
  screenId: string,
): { app: DesignAppTree; screen: DesignScreenTree } | undefined {
  for (const app of tree.apps) {
    const screen = app.screens.find((s) => s.id === screenId)
    if (screen) return { app, screen }
  }
  return undefined
}

/** An item with its screen and app; `undefined` when there is none. Pure. */
export function findDesignItem(
  tree: DesignTree,
  itemId: string,
): { app: DesignAppTree; screen: DesignScreenTree; item: DesignItem } | undefined {
  for (const app of tree.apps) {
    for (const screen of app.screens) {
      const item = screen.items.find((i) => i.id === itemId)
      if (item) return { app, screen, item }
    }
  }
  return undefined
}

/** A screen's drafts in the order added, and its built versions newest first. Pure. */
export function designScreenItems(screen: DesignScreenTree): {
  designs: DesignItem[]
  built: DesignItem[]
} {
  return {
    designs: screen.items.filter((i) => i.kind === 'design'),
    built: screen.items.filter((i) => i.kind === 'built').sort((a, b) => b.createdAt - a.createdAt),
  }
}

/** The screen's approved design, when one draft is marked. Pure. */
export function approvedDesignItem(screen: DesignScreenTree): DesignItem | undefined {
  return screen.items.find((i) => i.kind === 'design' && i.approved === true)
}

/**
 * Where an item's file is served. Pass a view token (the project's App view
 * grant) for an `<img>` or `<iframe>`, which cannot send the bearer. Pure.
 */
export function designItemContentUrl(
  apiBaseUrl: string,
  projectId: string,
  itemId: string,
  viewToken?: string,
): string {
  const base = `${apiBaseUrl.replace(/\/+$/, '')}/api/v1/projects/${encodeURIComponent(projectId)}/design/items/${encodeURIComponent(itemId)}/content`
  return viewToken ? `${base}?viewToken=${encodeURIComponent(viewToken)}` : base
}

/** An item's media type; `undefined` for a link. Pure. */
export function designItemMediaType(item: DesignItem): string | undefined {
  const { source } = item
  if (source.type === 'link') return undefined
  return source.type === 'blob' ? source.mediaType : designMediaType(source.path)
}

/** How a viewer shows an item. HTML and SVG go in a sandboxed frame. Pure. */
export function designItemViewKind(item: DesignItem): DesignItemViewKind {
  const mediaType = designItemMediaType(item)
  if (mediaType === undefined) return 'link'
  if (mediaType === 'text/html' || mediaType === 'image/svg+xml') return 'html'
  if (mediaType === 'application/pdf') return 'pdf'
  if (mediaType.startsWith('image/') && mediaType !== 'image/vnd.adobe.photoshop') return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType.startsWith('text/') || mediaType === 'application/json') return 'text'
  return 'file'
}

/** How far the total is toward the warning threshold — 1 at it, above 1 past it. Pure. */
export function storageUsageFraction(standing: StorageUsageStanding): number {
  return standing.thresholdBytes > 0 ? standing.totalBytes / standing.thresholdBytes : 1
}
