import { useCallback, useMemo, type ReactNode } from 'react'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import { useReferences, type References } from '../../headless/hooks/useReferences'
import { useReferenceRendering } from '../../headless/contexts/ReferenceRenderingContext'
import { useFiles } from '../../headless/contexts/FilesContext'
import ReferenceChip from '../compound/chips/ReferenceChip'
import NeedsYouReferenceChip from '../compound/chips/NeedsYouReferenceChip'
import RunReferenceChip from '../compound/chips/RunReferenceChip'
import {
  referencedNeedsYouItem,
  referencedRunId,
  storyChipLabel,
} from '../../headless/utils/referenceTargets'
import DesignReferenceChip from '../compound/design/DesignReferenceChip'
import EvidenceReferenceChip from '../compound/chips/EvidenceReferenceChip'
import type { UikitFileMeta } from '../compound/files/FileDisplay'
import ProjectFileChip from '../compound/files/ProjectFileChip'

/**
 * Native peer of web's `useReferenceRenderer`: each thing a chat's messages
 * point at as a {@link ReferenceChip} that opens it — a process run as a live
 * {@link RunReferenceChip}, one of its "Needs you" items as a live
 * {@link NeedsYouReferenceChip}, a cited evidence item as a live
 * {@link EvidenceReferenceChip} that opens it in place — a design screen or item
 * as a {@link DesignReferenceChip}, whose long press shows its miniature. A
 * file the project has (`onResolveFile`) is a {@link ProjectFileChip}, whose
 * sheet opens it in Files or previews it; a file it does not have reads as
 * code, and a reference that resolves to nothing reads as text.
 */
export function useReferenceRenderer({
  references,
  onResolveFile,
  onOpen,
  typed = true,
}: {
  references: References
  onResolveFile?: (path: string) => UikitFileMeta | null
  onOpen?: (link: ResourceLink) => void
  /** `false` chips only what was sent (ids), never a `#12` written for something else. */
  typed?: boolean
}): (target: ReferenceTarget) => ReactNode | undefined {
  const { describe, describeLink } = references
  const storyLabel = useCallback(
    (projectId: string, storyId: string) => storyChipLabel(describe, projectId, storyId),
    [describe],
  )
  return useCallback(
    (target: ReferenceTarget) => {
      if (target.type === 'typed' && !typed) return undefined
      if (
        target.type === 'reference' &&
        target.reference.kind === 'file' &&
        !target.reference.projectId &&
        !target.reference.path.endsWith('/')
      ) {
        const meta = onResolveFile?.(target.reference.path) ?? null
        if (!meta) return undefined
        return <ProjectFileChip file={meta} {...(onOpen ? { onOpenInFiles: onOpen } : {})} />
      }
      const description = target.type === 'link' ? describeLink(target.link) : describe(target)
      const item = referencedNeedsYouItem(target)
      if (description && item) {
        return (
          <NeedsYouReferenceChip
            runId={item.runId}
            needsYouItemId={item.needsYouItemId}
            description={description}
            {...(onOpen ? { onOpen } : {})}
          />
        )
      }
      const runId = referencedRunId(target)
      if (description && runId) {
        return (
          <RunReferenceChip
            runId={runId}
            description={description}
            storyLabel={storyLabel}
            {...(onOpen ? { onOpen } : {})}
          />
        )
      }
      if (description?.link?.kind === 'evidence') {
        return <EvidenceReferenceChip link={description.link} {...(onOpen ? { onOpen } : {})} />
      }
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
    [describe, describeLink, onResolveFile, onOpen, typed, storyLabel],
  )
}

/**
 * {@link useReferenceRenderer} for a surface outside a chat — a story page, a
 * note, a markdown file — with references resolved in the project, and a
 * file chip for a file the project has. Also
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
  const { files } = useFiles()
  const byPath = useMemo(() => {
    const map = new Map<string, UikitFileMeta>()
    for (const f of files) if (f.relativePath) map.set(f.relativePath, f)
    return map
  }, [files])
  const onResolveFile = useCallback((path: string) => byPath.get(path) ?? null, [byPath])
  const renderReference = useReferenceRenderer({
    references,
    onResolveFile,
    typed,
    ...(open ? { onOpen: open } : {}),
  })
  return { references, renderReference }
}
