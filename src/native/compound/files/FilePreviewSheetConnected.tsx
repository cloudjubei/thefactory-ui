import type { ResourceLink } from 'thefactory-tools/types'
import { useFilePreview } from '../../../headless/hooks/useFilePreview'
import type { FilePreviewTarget } from '../../../headless/utils/filePreviewTypes'
import FilePreviewSheet from './FilePreviewSheet'

export type FilePreviewSheetConnectedProps = {
  /** The file to preview; `null` keeps the sheet closed. */
  target: FilePreviewTarget | null
  onClose: () => void
  onOpenInFiles?: (link: ResourceLink) => void
  /** Copies the file's text, in place of the app's clipboard. */
  onCopy?: (text: string) => void | Promise<unknown>
}

/**
 * {@link FilePreviewSheet} on the backend: the file read from the project its
 * link names — any project, not only the one on screen.
 */
export default function FilePreviewSheetConnected({
  target,
  onClose,
  onOpenInFiles,
  onCopy,
}: FilePreviewSheetConnectedProps) {
  const preview = useFilePreview(target)
  return (
    <FilePreviewSheet
      state={preview.state}
      onClose={onClose}
      onRetry={preview.reload}
      {...(onOpenInFiles ? { onOpenInFiles } : {})}
      {...(onCopy ? { onCopy } : {})}
    />
  )
}
