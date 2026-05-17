import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import WarningChip from './WarningChip'

export type ContextFileChipProps = {
  /** Resolved file metadata. Hosts wire this from their FilesContext —
   * the chip itself stays decoupled from any data source. When the file
   * isn't known (e.g. it was deleted), pass a minimal `{name, relativePath}`
   * and the chip still renders the path. */
  file: UikitFileMeta
  /** Optional remove handler — when provided, surfaces an `×` button. */
  onRemove?: () => void
  /** When true, overlays a small `WarningChip` (e.g. "file attached but
   * not referenced in the surrounding text"). */
  warn?: boolean
}

/**
 * Inline "this story / feature references this file" pill. Wraps the
 * `FileDisplay` primitive with a remove affordance + warning overlay.
 * Renderer-agnostic: hosts resolve the `file` shape themselves so the
 * chip works against any FilesContext implementation (web's Hey-API
 * `FileMeta`, desktop's `thefactory-tools.FileMeta`, RN's …).
 */
export default function ContextFileChip({ file, onRemove, warn }: ContextFileChipProps) {
  return (
    <div className="inline-flex relative">
      {warn ? (
        <div className="absolute -top-1 -left-1 z-10">
          <WarningChip
            title="File not referenced in text"
            tooltip="File not referenced in title/description/rejection"
          />
        </div>
      ) : null}
      <FileDisplay
        file={file}
        density="normal"
        showPreviewOnHover
        interactive={false}
        trailing={
          onRemove ? (
            <button
              type="button"
              className="text-xs px-1 text-(--text-secondary) hover:text-(--text-primary)"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              title="Remove file"
              aria-label="Remove file"
            >
              ✕
            </button>
          ) : undefined
        }
      />
    </div>
  )
}
