import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import Tooltip from '../../primitives/Tooltip'
import {
  extFromTypeOrName,
  formatBytes,
  formatFileDate,
  isTextLikeExt,
} from '../../../headless/utils/path'
import { iconForExt } from './FileTypeIcon'

// Library-shape file metadata. The domain `FileMeta` from thefactory-tools
// reduces to (a superset of) this; consumers map their own shape to UikitFileMeta.
// Only `name` is required — the rest are display affordances.
export type UikitFileMeta = {
  name: string
  // Path relative to the project root; passed back to onReadPreview.
  relativePath?: string
  // Absolute path; passed back to onNavigate.
  absolutePath?: string
  // Mime/extension hint (e.g. 'json', 'image/png'). Falls back to name extension.
  type?: string | null
  size?: number | null
  // Last-modified timestamp; number, ISO string, or Date.
  mtime?: number | string | Date | null
}

export interface FileDisplayProps {
  file: UikitFileMeta
  density?: 'normal' | 'compact'
  interactive?: boolean
  leadingVisual?: ReactNode
  trailing?: ReactNode
  showMeta?: boolean
  ariaLabel?: string
  // Custom click handler. Wins over `onNavigate` when both are provided.
  // The event is whatever fired activation — `MouseEvent` for clicks,
  // `KeyboardEvent` when activated via Enter/Space.
  onClick?: (file: UikitFileMeta, event: MouseEvent | KeyboardEvent) => void
  // Open-on-click. Library doesn't know about routing — the consumer wires it.
  // Called only when `interactive` is true and `onClick` is not provided.
  onNavigate?: (file: UikitFileMeta) => void
  className?: string
  // Hover-to-show a preview tooltip. When `onReadPreview` is also provided the
  // preview shows file contents; otherwise it's metadata-only.
  showPreviewOnHover?: boolean
  previewPlacement?: 'top' | 'bottom' | 'left' | 'right'
  previewDelayMs?: number
  // Async loader for the preview tooltip body. Receives `file.relativePath` —
  // returns a string snippet to render, or `null` if no preview is available.
  onReadPreview?: (relativePath: string) => Promise<string | null>
}

function defaultIconFor(file: UikitFileMeta): ReactNode {
  return (
    <span className="fd-icon" aria-hidden>
      {iconForExt(extFromTypeOrName(file.type, file.name))}
    </span>
  )
}

function isTextLike(file: UikitFileMeta): boolean {
  return isTextLikeExt(extFromTypeOrName(file.type ?? undefined, file.name))
}

const MAX_PREVIEW_CHARS = 1200

function useFilePreviewContent(
  file: UikitFileMeta,
  onReadPreview: ((relativePath: string) => Promise<string | null>) | undefined,
) {
  const [state, setState] = useState<{
    loading: boolean
    error: string | null
    text: string | null
  }>({ loading: false, error: null, text: null })

  useEffect(() => {
    let cancelled = false
    const relPath = file.relativePath
    if (!relPath || !onReadPreview || !isTextLike(file)) {
      setState({ loading: false, error: null, text: null })
      return
    }
    setState({ loading: true, error: null, text: null })
    onReadPreview(relPath)
      .then((content) => {
        if (cancelled) return
        const snippet = typeof content === 'string' ? content.slice(0, MAX_PREVIEW_CHARS) : null
        setState({ loading: false, error: null, text: snippet })
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e)
          setState({ loading: false, error: message, text: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [file.absolutePath, file.relativePath, file.type, file.name, onReadPreview])

  return state
}

function FilePreviewCard({
  file,
  onReadPreview,
}: {
  file: UikitFileMeta
  onReadPreview?: (relativePath: string) => Promise<string | null>
}) {
  const sizeLabel = formatBytes(file.size ?? null)
  const dateLabel = formatFileDate(file.mtime ?? null)
  const typeLabel = file.type ?? extFromTypeOrName(undefined, file.name) ?? 'unknown'
  const relPath = file.relativePath
  const { loading, error, text } = useFilePreviewContent(file, onReadPreview)

  return (
    <div className="file-preview-card">
      <div className="file-preview-card__header">
        <div className="file-preview-card__title" title={relPath || file.name}>
          {file.name}
        </div>
        <div className="file-preview-card__meta">
          {typeLabel}
          {sizeLabel ? ` • ${sizeLabel}` : ''}
          {dateLabel ? ` • ${dateLabel}` : ''}
        </div>
      </div>
      {relPath && (
        <div className="file-preview-card__path" title={relPath}>
          {relPath}
        </div>
      )}
      <div className="file-preview-card__body">
        {loading && <div className="file-preview-card__loading">Loading preview…</div>}
        {error && <div className="file-preview-card__error">{error}</div>}
        {!loading && !error && text && (
          <pre className="file-preview-card__pre">
            <code>{text}</code>
          </pre>
        )}
        {!loading && !error && !text && (
          <div className="file-preview-card__empty">No preview available</div>
        )}
      </div>
    </div>
  )
}

const SIDE_COL_STYLE: CSSProperties = {
  flex: '0 0 28px',
  width: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function FileDisplay({
  file,
  density = 'normal',
  interactive = false,
  leadingVisual,
  trailing,
  showMeta = true,
  ariaLabel,
  onClick,
  onNavigate,
  className = '',
  showPreviewOnHover = false,
  previewPlacement = 'right',
  previewDelayMs = 300,
  onReadPreview,
}: FileDisplayProps) {
  const sizeLabel = formatBytes(file.size ?? null)
  const dateLabel = formatFileDate(file.mtime ?? null)

  const aria =
    ariaLabel ||
    `${file.name}${sizeLabel ? `, ${sizeLabel}` : ''}${dateLabel ? `, modified ${dateLabel}` : ''}`

  const handleNavigate = (e: MouseEvent) => {
    e.stopPropagation()
    if (!onNavigate) return
    onNavigate(file)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!interactive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onClick) {
        onClick(file, e)
      } else if (onNavigate) {
        onNavigate(file)
      }
    }
  }

  const isCompact = density === 'compact'
  const cls = [
    'file-display',
    isCompact ? 'is-compact' : 'is-normal',
    interactive ? 'is-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const clickHandler = !interactive
    ? undefined
    : onClick
      ? (e: MouseEvent) => onClick(file, e)
      : onNavigate
        ? handleNavigate
        : undefined

  return (
    <Tooltip
      content={<FilePreviewCard file={file} onReadPreview={onReadPreview} />}
      placement={previewPlacement}
      delayMs={previewDelayMs}
      disabled={!showPreviewOnHover}
    >
      {isCompact ? (
        <span className="badge badge--soft badge--ok">{file.name}</span>
      ) : (
        <div
          className={cls}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={aria}
          onKeyDown={handleKeyDown}
          onClick={clickHandler}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
        >
          <div className="fd-leading" style={SIDE_COL_STYLE}>
            {leadingVisual ?? defaultIconFor(file)}
          </div>

          <div className="fd-content" style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div
              className="fd-row fd-row--top"
              style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
            >
              <div
                className="fd-name"
                title={file.absolutePath || file.name}
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </div>
            </div>
            {showMeta && (
              <div className="fd-meta" style={{ color: 'var(--text-muted)' }}>
                {sizeLabel ? <span className="fd-size">{sizeLabel}</span> : null}
                {sizeLabel && dateLabel ? <span className="fd-sep"> • </span> : null}
                {dateLabel ? <span className="fd-date">{dateLabel}</span> : null}
              </div>
            )}
          </div>

          {trailing ? (
            <div className="fd-actions" style={SIDE_COL_STYLE}>
              {trailing}
            </div>
          ) : null}
        </div>
      )}
    </Tooltip>
  )
}
