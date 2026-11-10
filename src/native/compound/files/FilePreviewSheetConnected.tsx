import type { ResourceLink } from 'thefactory-tools/types'
import { useFilePreview } from '../../../headless/hooks/useFilePreview'
import type { FilePreviewMode, FilePreviewTarget } from '../../../headless/utils/filePreviewTypes'
import FilePreviewSheet from './FilePreviewSheet'

export type FilePreviewSheetConnectedProps = {
  /** The file to preview; `null` keeps the sheet closed. */
  target: FilePreviewTarget | null
  onClose: () => void
  mode?: FilePreviewMode
  onOpenInFiles?: (link: ResourceLink) => void
  /** The app's clipboard; without it the text stays selectable. */
  onCopy?: (text: string) => void | Promise<unknown>
}

/**
 * {@link FilePreviewSheet} on the backend: the file read from the project its
 * link names — any project, not only the one on screen — and, in edit mode,
 * saved, renamed and deleted there.
 */
export default function FilePreviewSheetConnected({
  target,
  onClose,
  mode,
  onOpenInFiles,
  onCopy,
}: FilePreviewSheetConnectedProps) {
  const preview = useFilePreview(target)
  return (
    <FilePreviewSheet
      state={preview.state}
      onClose={onClose}
      onRetry={preview.reload}
      onWrite={preview.write}
      onRename={preview.rename}
      onDelete={preview.remove}
      {...(mode ? { mode } : {})}
      {...(onOpenInFiles ? { onOpenInFiles } : {})}
      {...(onCopy ? { onCopy } : {})}
    />
  )
}
