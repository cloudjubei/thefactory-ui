import { useRef, useState } from 'react'
import type { AppDeepLink } from './appDeepLink'

import type { ChatAppSelection as AppSelection } from '../api/generated'
/** Structured context passed unchanged to the host's chat send API. */
export type { ChatAppSelection as AppSelection } from '../api/generated'

export type AppElementPick = Pick<AppSelection, 'selector' | 'outerHtml'> & {
  rect?: { x: number; y: number; width: number; height: number }
}

export interface AppSelectionComposerProps {
  appSelections?: AppSelection[]
  onChangeAppSelections?: (selections: AppSelection[]) => void
  /** Opens this chat's App surface. The host owns navigation and chat identity. */
  onShowApp?: () => void
}

/** Ignore malformed notifications rather than forwarding app-controlled HTML to a renderer. */
export function parseAppElementPick(raw: unknown): AppElementPick | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (
    typeof value.selector !== 'string' ||
    !value.selector.trim() ||
    value.selector.length > 4096 ||
    typeof value.outerHtml !== 'string' ||
    !value.outerHtml.trim()
  )
    return null
  const pick: AppElementPick = {
    selector: value.selector,
    outerHtml: value.outerHtml.slice(0, 20_000),
  }
  if (value.rect && typeof value.rect === 'object') {
    const r = value.rect as Record<string, unknown>
    if (
      typeof r.x === 'number' &&
      Number.isFinite(r.x) &&
      typeof r.y === 'number' &&
      Number.isFinite(r.y) &&
      typeof r.width === 'number' &&
      Number.isFinite(r.width) &&
      r.width >= 0 &&
      typeof r.height === 'number' &&
      Number.isFinite(r.height) &&
      r.height >= 0
    )
      pick.rect = { x: r.x, y: r.y, width: r.width, height: r.height }
  }
  return pick
}

/** Mount per launching chat (or key by chat id); no global selection state can leak to another chat. */
export function useAppSelections() {
  const [appSelections, onChangeAppSelections] = useState<AppSelection[]>([])
  const [picking, setPicking] = useState(false)
  const nextId = useRef(0)
  const addPick = (projectId: string, pick: AppElementPick, deepLink?: AppDeepLink | null) => {
    const id = `app-selection-${++nextId.current}`
    onChangeAppSelections((current) => [
      ...current,
      {
        id,
        projectId,
        ...(deepLink ? { view: deepLink.view, params: deepLink.params } : {}),
        selector: pick.selector,
        outerHtml: pick.outerHtml,
        ...(pick.rect ? { rect: { ...pick.rect, space: 'app-viewport' as const } } : {}),
        comment: '',
      },
    ])
  }
  return { appSelections, onChangeAppSelections, picking, setPicking, addPick }
}
