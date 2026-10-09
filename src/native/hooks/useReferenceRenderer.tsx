import { useCallback, type ReactNode } from 'react'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import { useReferences, type References } from '../../headless/hooks/useReferences'
import { useReferenceRendering } from '../../headless/contexts/ReferenceRenderingContext'
import ReferenceChip from '../compound/chips/ReferenceChip'
import DesignReferenceChip from '../compound/design/DesignReferenceChip'

/**
 * Native peer of web's `useReferenceRenderer`: each thing a chat's messages
 * point at as a {@link ReferenceChip} that opens it — a design screen or item
 * as a {@link DesignReferenceChip}, whose long press shows its miniature. A
 * file is left to the caller's file resolver (`RichText`'s `onResolveFile`),
 * so here it reads as code; a reference that resolves to nothing reads as text.
 */
export function useReferenceRenderer({
  references,
  onOpen,
  typed = true,
}: {
  references: References
  onOpen?: (link: ResourceLink) => void
  /** `false` chips only what was sent (ids), never a `#12` written for something else. */
  typed?: boolean
}): (target: ReferenceTarget) => ReactNode | undefined {
  const { describe, describeLink } = references
  return useCallback(
    (target: ReferenceTarget) => {
      if (target.type === 'typed' && !typed) return undefined
      if (
        target.type === 'reference' &&
        target.reference.kind === 'file' &&
        !target.reference.projectId
      )
        return undefined
      const description = target.type === 'link' ? describeLink(target.link) : describe(target)
      if (description?.kind === 'design' && description.link?.kind === 'design') {
        return (
          <DesignReferenceChip
            description={description}
            link={description.link}
            {...(onOpen ? { onOpen } : {})}
          />
        )
      }
      return description ? (
        <ReferenceChip description={description} {...(onOpen ? { onOpen } : {})} />
      ) : undefined
    },
    [describe, describeLink, onOpen, typed],
  )
}

/**
 * {@link useReferenceRenderer} for a surface outside a chat — a story page, a
 * note, a markdown file — with references resolved in the project. Also
 * returns the {@link References}, for `asText` and the `#` / `&` dropdowns.
 */
export function useProjectReferenceRenderer({
  projectId,
  groupId,
  onOpen,
  typed = true,
}: {
  projectId: string | null | undefined
  /** A group's page, outside any project: references resolve across its projects. */
  groupId?: string | null
  onOpen?: (link: ResourceLink) => void
  typed?: boolean
}): {
  references: References
  renderReference: (target: ReferenceTarget) => ReactNode | undefined
} {
  const references = useReferences({
    scope: projectId ? { projectId } : groupId ? { groupId } : undefined,
  })
  const rendering = useReferenceRendering()
  const open = onOpen ?? rendering?.onOpen
  const renderReference = useReferenceRenderer({
    references,
    typed,
    ...(open ? { onOpen: open } : {}),
  })
  return { references, renderReference }
}
