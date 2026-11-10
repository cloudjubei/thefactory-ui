import { useState, type SyntheticEvent } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { filePreviewTarget, ownFileDescription } from '../../../headless/utils/filePreview'
import type { FilePreviewTarget } from '../../../headless/utils/filePreviewTypes'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'
import FilePreviewDialogConnected from './FilePreviewDialogConnected'

export type ProjectFileChipProps = {
  file: UikitFileMeta
  /** The project the file is in; the one on screen when left out. */
  projectId?: string
  /** Reads the start of the file for its hover card. */
  onReadPreview?: (relativePath: string) => Promise<string | null>
  /** Leaves the popup for the file in the Files screen; the app's own when left out. */
  onOpenInFiles?: (link: ResourceLink) => void
}

/**
 * A file of the project on screen, as the chip a message or a document shows
 * for it: its name, a card on hover with the start of the file, and a Preview
 * there that opens the whole file in the popup any file reference opens.
 */
export default function ProjectFileChip({
  file,
  projectId,
  onReadPreview,
  onOpenInFiles,
}: ProjectFileChipProps) {
  const activeProjectId = useProjectsOptional()?.activeProjectId
  const rendering = useReferenceRendering()
  const [previewing, setPreviewing] = useState<FilePreviewTarget | null>(null)
  const [previews, setPreviews] = useState(0)
  const description = ownFileDescription(projectId ?? activeProjectId, file.relativePath)
  const target = description ? filePreviewTarget(description) : undefined
  const open = onOpenInFiles ?? rendering?.onOpen
  const closePreview = () => {
    setPreviewing(null)
    setPreviews((n) => n + 1)
  }
  return (
    <>
      <FileDisplay
        key={previews}
        file={file}
        density="compact"
        interactive={false}
        showPreviewOnHover={previewing === null}
        showMeta={false}
        {...(onReadPreview ? { onReadPreview } : {})}
        {...(target ? { onPreview: () => setPreviewing(target) } : {})}
      />
      {previewing ? (
        <span
          className="contents"
          onClick={keepInside}
          onMouseDown={keepInside}
          onKeyDown={keepInside}
        >
          <FilePreviewDialogConnected
            target={previewing}
            onClose={closePreview}
            {...(open ? { onOpenInFiles: open } : {})}
          />
        </span>
      ) : null}
    </>
  )
}

/** The popup is a portal: what happens in it stays out of the message the chip sits in. */
function keepInside(e: SyntheticEvent) {
  e.stopPropagation()
}
