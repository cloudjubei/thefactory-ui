import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import { ReferenceRenderingContext } from '../../headless/contexts/ReferenceRenderingContext'
import { useProjectReferenceRenderer } from '../hooks/useReferenceRenderer'

/**
 * Shows what text points at as chips everywhere below it — story and feature
 * cards, story pages, notes, markdown files — resolved in the project in view
 * (or, on a group's page, across the group's projects),
 * opening through `onOpen`. Mounted once by an app; a chat's own renderer still
 * wins inside the chat.
 */
export default function ReferenceRenderingProvider({
  projectId,
  groupId,
  onOpen,
  children,
}: {
  projectId: string | null | undefined
  /** On a group's page, outside any project: references resolve across its projects. */
  groupId?: string | null
  onOpen?: (link: ResourceLink) => void
  children: ReactNode
}) {
  // The app's navigate changes with every route; chips need not re-render for it.
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const open = useCallback((link: ResourceLink) => onOpenRef.current?.(link), [])
  const { references, renderReference } = useProjectReferenceRenderer({
    projectId,
    groupId,
    onOpen: open,
  })
  const value = useMemo(
    () => ({ renderReference, references, onOpen: open }),
    [renderReference, references, open],
  )
  return (
    <ReferenceRenderingContext.Provider value={value}>
      {children}
    </ReferenceRenderingContext.Provider>
  )
}
