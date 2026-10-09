import { useCallback, useMemo, type ReactNode } from 'react'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import { useReferences, type References } from '../../headless/hooks/useReferences'
import { useReferenceRendering } from '../../headless/contexts/ReferenceRenderingContext'
import { useFiles } from '../../headless/contexts/FilesContext'
import ReferenceChip from '../compound/chips/ReferenceChip'
import DesignReferenceChip from '../compound/design/DesignReferenceChip'
import FileDisplay, { type UikitFileMeta } from '../compound/files/FileDisplay'

/**
 * The chip a chat shows for each thing its messages point at: a project file
 * the project has, with its preview on hover; any other reference or in-app
 * link as a {@link ReferenceChip} that opens it. `undefined` — so the token
 * reads as text or code — for a file the project does not have, or a
 * reference that resolves to nothing.
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
  return useCallback(
    (target: ReferenceTarget) => {
      if (target.type === 'typed' && !typed) return undefined
      if (
        target.type === 'reference' &&
        target.reference.kind === 'file' &&
        !target.reference.projectId
      ) {
        const meta = onResolveFile?.(target.reference.path) ?? null
        if (!meta) return undefined
        return (
          <span className="inline-block align-middle">
            <FileDisplay
              file={meta}
              density="compact"
              interactive={false}
              showPreviewOnHover
              showMeta={false}
            />
          </span>
        )
      }
      const description = target.type === 'link' ? describeLink(target.link) : describe(target)
      if (!description) return undefined
      if (description.link?.kind === 'design') {
        return (
          <DesignReferenceChip
            description={description}
            link={description.link}
            {...(onOpen ? { onOpen } : {})}
          />
        )
      }
      return <ReferenceChip description={description} {...(onOpen ? { onOpen } : {})} />
    },
    [describe, describeLink, onResolveFile, onOpen, typed],
  )
}

/**
 * {@link useReferenceRenderer} for a surface outside a chat — a story page, a
 * note, a markdown file: references resolve in the project, and a file chip
 * shows a file the project has. Also returns the {@link References}, for text
 * written where a chip cannot go (`asText`) and for `#` / `&` dropdowns.
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
