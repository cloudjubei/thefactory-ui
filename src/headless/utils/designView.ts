import { formatReference } from 'thefactory-tools/utils'
import type {
  DesignItem,
  DesignScreenTree,
  DesignTree,
  GetProjectStorageUsageResponse,
  ProjectStorageUsage,
  StorageUsageStanding,
} from '../api'
import {
  approvedDesignItem,
  designItemViewKind,
  designScreenItems,
  findDesignItem,
  findDesignScreen,
} from './design'
import { STORAGE_WARNING_TAG, STORAGE_WARNING_TEXT } from './designViewConstants'
import type {
  DesignCompareBaseline,
  DesignDeleteTarget,
  DesignSelection,
  DesignSelectionParams,
  StorageUsageRow,
  StorageWarningNotification,
} from './designViewTypes'
import { formatBytes } from './path'

/**
 * What the Design tab shows for a `?screen=&item=` link: the item's own screen
 * when the item is there, else the named screen, else the first screen there
 * is. Pure.
 */
export function designSelection(tree: DesignTree, params: DesignSelectionParams): DesignSelection {
  const found = params.item ? findDesignItem(tree, params.item) : undefined
  if (found) return { screenId: found.screen.id, itemId: found.item.id }
  if (params.screen && findDesignScreen(tree, params.screen)) return { screenId: params.screen }
  const first = tree.apps.find((a) => a.screens.length > 0)?.screens[0]
  return first ? { screenId: first.id } : {}
}

/** What stands for a screen in a miniature: its approved design, else its latest built version. Pure. */
export function designPreviewItem(screen: DesignScreenTree): DesignItem | undefined {
  return approvedDesignItem(screen) ?? designScreenItems(screen).built[0]
}

/** What a design reference's chip previews: the item it names, or what its screen shows. Pure. */
export function designReferencePreview(
  tree: DesignTree,
  link: { screenId?: string; itemId?: string },
): DesignItem | undefined {
  if (link.itemId) return findDesignItem(tree, link.itemId)?.item
  const found = link.screenId ? findDesignScreen(tree, link.screenId) : undefined
  return found ? designPreviewItem(found.screen) : undefined
}

/**
 * What a built version is compared with: the approved design when it is an
 * image, else the built version before it. Pure.
 */
export function designCompareBaseline(
  screen: DesignScreenTree,
  builtItemId: string,
): DesignCompareBaseline | undefined {
  const { built } = designScreenItems(screen)
  const at = built.findIndex((i) => i.id === builtItemId)
  if (at < 0) return undefined
  const approved = approvedDesignItem(screen)
  if (approved && designItemViewKind(approved) === 'image') {
    return { item: approved, label: 'Approved design' }
  }
  const previous = built[at + 1]
  return previous ? { item: previous, label: 'Previous built version' } : undefined
}

function counted(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** The in-page question before a delete, saying what goes with it. Pure. */
export function designDeleteSummary(target: DesignDeleteTarget): string {
  if (target.kind === 'item') return `Delete “${target.item.name}”?`
  if (target.kind === 'screen') {
    const items = target.screen.items.length
    return items === 0
      ? `Delete “${target.screen.name}”? It has nothing in it.`
      : `Delete “${target.screen.name}”? Its ${counted(items, 'item', 'items')} go with it.`
  }
  const screens = target.app.screens.length
  const items = target.app.screens.reduce((sum, s) => sum + s.items.length, 0)
  if (screens === 0) return `Delete “${target.app.name}”? It has nothing in it.`
  return `Delete “${target.app.name}”? Its ${counted(screens, 'screen', 'screens')} and ${counted(items, 'item', 'items')} go with it.`
}

/** A chat draft with a design reference added at its end, ready to type after. Pure. */
export function designDiscussDraft(
  draft: string,
  ref: { screenId: string; itemId?: string },
): string {
  const token = formatReference({
    kind: 'design',
    screenId: ref.screenId,
    ...(ref.itemId ? { itemId: ref.itemId } : {}),
  })
  const gap = draft === '' || /\s$/.test(draft) ? '' : ' '
  return `${draft}${gap}${token} `
}

/** The name of the file an item was made from — a link's own name. Pure. */
export function designItemFileName(item: DesignItem): string {
  if (item.source.type === 'blob') return item.source.originalName
  if (item.source.type === 'project-file') return item.source.path.split('/').pop() ?? item.name
  return item.name
}

/** Who added an item, as its row says. Pure. */
export function designItemAddedByLabel(item: DesignItem): string {
  switch (item.addedBy.by) {
    case 'person':
      return 'Added by you'
    case 'agent':
      return 'Added by an agent'
    case 'run':
      return 'From a run'
  }
}

function size(bytes: number): string {
  return formatBytes(bytes) ?? '0 B'
}

/** The Design tab's meter: the project's usage, then every project's against the threshold. Pure. */
export function storageUsageSummary(report: GetProjectStorageUsageResponse): string {
  return `${size(report.usage.totalBytes)} · all projects ${size(report.standing.totalBytes)} of ${size(report.standing.thresholdBytes)}`
}

/** A project's usage by store. Pure. */
export function storageUsageBreakdown(usage: ProjectStorageUsage): StorageUsageRow[] {
  return [
    { key: 'design', label: 'Design', bytes: usage.designBytes, size: size(usage.designBytes) },
    {
      key: 'evidence',
      label: 'Run proof',
      bytes: usage.evidenceBytes,
      size: size(usage.evidenceBytes),
    },
    { key: 'ui-test', label: 'UI tests', bytes: usage.uiTestBytes, size: size(usage.uiTestBytes) },
    {
      key: 'mobile-test',
      label: 'Mobile tests',
      bytes: usage.mobileTestBytes,
      size: size(usage.mobileTestBytes),
    },
  ]
}

/** The notification a `storage:usage-warning` posts. Pure. */
export function storageWarningNotification(
  warning: StorageUsageStanding & { projectId?: string },
): StorageWarningNotification {
  return {
    title: `Project files use ${size(warning.totalBytes)} of ${size(warning.thresholdBytes)}`,
    body: STORAGE_WARNING_TEXT.body,
    tag: STORAGE_WARNING_TAG,
  }
}
