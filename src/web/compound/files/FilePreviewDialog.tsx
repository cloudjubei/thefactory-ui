import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import { FILE_PREVIEW_COPY } from '../../../headless/utils/filePreviewConstants'
import { filePreviewCaption, filePreviewSize } from '../../../headless/utils/filePreview'
import type {
  FilePreviewContent,
  FilePreviewState,
  FilePreviewTarget,
} from '../../../headless/utils/filePreviewTypes'
import { REFERENCE_OPEN_LABELS } from '../../../headless/utils/referencePreviewConstants'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import Tooltip from '../../primitives/Tooltip'
import { IconClose } from '../../icons'
import { FilePane } from './FilePane'
import FilePaneHeader from './FilePaneHeader'

export type FilePreviewDialogProps = {
  /** The file as it stands; `null` keeps the dialog closed. */
  state: FilePreviewState | null
  onClose: () => void
  /** Leaves the popup for the file in the Files screen; without it, no such button. */
  onOpenInFiles?: (link: ResourceLink) => void
  /** Reads the file again after a failure. */
  onRetry?: () => void
  /** More buttons in the header, before "Open in Files" and Close — as Save to project. */
  headerActions?: ReactNode
}

const PANEL_CLASS = 'max-w-[min(72rem,calc(100vw-2rem))]! h-[85vh]'

/**
 * A file in a popup, with the Files pane's tools across its top: the file a
 * chip points at, read from its own project. Read only — copy, the source /
 * preview / split switch, its info; editing stays in the Files screen. Opens
 * as a large centred popup; "Open in Files" leaves it for the Files screen.
 */
export default function FilePreviewDialog({
  state,
  onClose,
  onOpenInFiles,
  onRetry,
  headerActions,
}: FilePreviewDialogProps) {
  const target = state?.target
  const openInFiles =
    target && onOpenInFiles
      ? () => {
          onClose()
          onOpenInFiles({ kind: 'file', projectId: target.projectId, path: target.path })
        }
      : undefined
  const caption = target ? filePreviewCaption(target) : undefined
  const trailing = (
    <>
      {headerActions}
      {openInFiles ? (
        <Button size="sm" variant="secondary" onClick={openInFiles}>
          {REFERENCE_OPEN_LABELS.file}
        </Button>
      ) : null}
      <Tooltip content={FILE_PREVIEW_COPY.close}>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={FILE_PREVIEW_COPY.close}>
          <IconClose className="w-4 h-4" />
        </Button>
      </Tooltip>
    </>
  )
  return (
    <Modal
      isOpen={state !== null}
      onClose={onClose}
      size="xl"
      panelClassName={PANEL_CLASS}
      contentClassName="p-0! flex flex-col overflow-hidden!"
      hideHeader
    >
      {state && state.status !== 'ready' ? (
        <FilePaneHeader
          name={state.target.name ?? state.target.path}
          path={state.target.path}
          trailing={trailing}
          {...(caption ? { caption } : {})}
        />
      ) : null}
      {state?.status === 'ready' ? (
        <ReadyPane
          target={state.target}
          content={state}
          trailing={trailing}
          {...(caption ? { caption } : {})}
        />
      ) : state?.status === 'error' ? (
        <div className="flex flex-1 flex-col items-start gap-3 p-4">
          <Alert>
            <span className="font-semibold">{FILE_PREVIEW_COPY.errorTitle}</span> · {state.message}
          </Alert>
          {onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {FILE_PREVIEW_COPY.retry}
            </Button>
          ) : null}
        </div>
      ) : state?.status === 'gone' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
          <span className="text-sm font-semibold text-(--text-primary)">
            {FILE_PREVIEW_COPY.goneTitle}
          </span>
          <span className="text-sm text-(--text-secondary)">{FILE_PREVIEW_COPY.goneBody}</span>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-(--text-secondary)">
          <Spinner size={18} label={FILE_PREVIEW_COPY.loading} />
        </div>
      )}
    </Modal>
  )
}

/** A read file in the Files pane: its bytes as a blob URL for the image and PDF viewers. */
function ReadyPane({
  target,
  content,
  caption,
  trailing,
}: {
  target: FilePreviewTarget
  content: FilePreviewContent
  caption?: string
  trailing: ReactNode
}) {
  const { bytes, mediaType, info } = content
  const [binaryUrl, setBinaryUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!bytes) {
      setBinaryUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: mediaType }))
    setBinaryUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bytes, mediaType])
  const getBinaryUrl = useCallback(async () => binaryUrl ?? '', [binaryUrl])
  const size = filePreviewSize(content)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilePane
        key={target.path}
        filePath={target.path}
        fileName={target.name ?? target.path}
        headerTrailing={trailing}
        {...(caption ? { headerCaption: caption } : {})}
        fileSize={size}
        content={content.text}
        initialPaneView="preview"
        {...(binaryUrl ? { getBinaryUrl } : {})}
        fileInfo={{
          path: target.path,
          ...(info?.absolutePath ? { absolutePath: info.absolutePath } : {}),
          size,
          type: info?.type ?? content.kind,
          ext: info?.ext ?? null,
          mtime: info?.mtime ?? null,
          ctime: info?.ctime ?? null,
        }}
      />
    </div>
  )
}
