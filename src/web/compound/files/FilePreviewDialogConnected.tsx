import type { ResourceLink } from 'thefactory-tools/types'
import { useFilePreview } from '../../../headless/hooks/useFilePreview'
import type { FilePreviewTarget } from '../../../headless/utils/filePreviewTypes'
import FilePreviewDialog from './FilePreviewDialog'

export type FilePreviewDialogConnectedProps = {
  /** The file to preview; `null` keeps the dialog closed. */
  target: FilePreviewTarget | null
  onClose: () => void
  onOpenInFiles?: (link: ResourceLink) => void
}

/**
 * {@link FilePreviewDialog} on the backend: the file read from the project its
 * link names — any project, not only the one on screen.
 */
export default function FilePreviewDialogConnected({
  target,
  onClose,
  onOpenInFiles,
}: FilePreviewDialogConnectedProps) {
  const preview = useFilePreview(target)
  return (
    <FilePreviewDialog
      state={preview.state}
      onClose={onClose}
      onRetry={preview.reload}
      {...(onOpenInFiles ? { onOpenInFiles } : {})}
    />
  )
}
