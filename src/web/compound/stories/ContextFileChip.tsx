import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import WarningChip from './WarningChip'
import { IconXCircle } from '../../icons'

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
    // On small screens (where mobile parity matters), each chip claims a
    // full row so name + meta have plenty of horizontal space. On `md+` the
    // chips fall back to inline-flex and the parent's `flex-wrap` packs
    // multiple chips per row. The `context-file-chip` class enables the
    // compact `.file-display` overrides in `file-display.css`.
    <div className="context-file-chip relative w-full md:inline-flex md:w-auto">
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
              className="px-1 text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              title="Remove file"
              aria-label="Remove file"
            >
              <IconXCircle className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  )
}
