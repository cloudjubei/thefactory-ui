import { useState } from 'react'
import { Pressable } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { ownFileDescription } from '../../../headless/utils/filePreview'
import type { FilePreviewTarget } from '../../../headless/utils/filePreviewTypes'
import { referencePreview } from '../../../headless/utils/referencePreview'
import ReferencePreviewSheet from '../chips/ReferencePreviewSheet'
import { referenceGlyph } from '../chips/referenceGlyphs'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'
import FilePreviewSheetConnected from './FilePreviewSheetConnected'

export type ProjectFileChipProps = {
  file: UikitFileMeta
  /** The project the file is in; the one on screen when left out. */
  projectId?: string
  /** Leaves for the file in the Files screen; the app's own when left out. */
  onOpenInFiles?: (link: ResourceLink) => void
}

/**
 * Native peer of web's `ProjectFileChip`: a file of the project on screen, as
 * the chip a message shows for it. A tap or a long press opens the sheet any
 * file reference has — "Open in Files" and Preview, which shows the whole
 * file full screen.
 */
export default function ProjectFileChip({ file, projectId, onOpenInFiles }: ProjectFileChipProps) {
  const activeProjectId = useProjectsOptional()?.activeProjectId
  const rendering = useReferenceRendering()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewing, setPreviewing] = useState<FilePreviewTarget | null>(null)
  const description = ownFileDescription(projectId ?? activeProjectId, file.relativePath)
  const open = onOpenInFiles ?? rendering?.onOpen
  const chip = <FileDisplay file={file} density="compact" showMeta={false} />
  if (!description) return chip
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={file.name}
        onPress={() => setSheetOpen(true)}
        onLongPress={() => setSheetOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {chip}
      </Pressable>
      {sheetOpen ? (
        <ReferencePreviewSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          view={referencePreview(description)}
          glyph={referenceGlyph(description)}
          onPreview={setPreviewing}
          {...(open ? { onOpen: open } : {})}
        />
      ) : null}
      {previewing ? (
        <FilePreviewSheetConnected
          target={previewing}
          onClose={() => setPreviewing(null)}
          {...(open ? { onOpenInFiles: open } : {})}
        />
      ) : null}
    </>
  )
}
