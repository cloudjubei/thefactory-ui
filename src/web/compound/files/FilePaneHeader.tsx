import type { ReactNode } from 'react'

import { useIncomingFileToast } from '../../../headless/hooks/useIncomingFileToast'
import {
  PENDING_FILE_CHANGE_LABEL,
  type PendingFileChange,
  type PendingFileChangeActions,
} from '../../../headless/utils/pendingFileChange'
import { IconWarningTriangle } from '../../icons/IconWarningTriangle'
import { useToast } from '../../primitives/Toast'
import { FileInfoButton, type FileInfoData } from './FileInfoButton'
import { PendingFileChangeCallout } from './PendingFileChangeCallout'

export type FilePaneHeaderProps = {
  /** Basename (e.g. `Foo.tsx`). Falls back to last `/`-segment of `path`. */
  name?: string
  /** Project-relative path. Shown as a `title=` hint on the name. */
  path?: string
  /** Size in bytes; rendered as a `· <human-size>` suffix on the name. */
  size?: number | null
  /**
   * When provided, renders a small "i" button to the left of the name that
   * shows a callout with structured file metadata on hover / click.
   */
  info?: FileInfoData
  /** Right-side action slot (icon buttons such as copy / save / rename / delete). */
  actions?: ReactNode
  /** Pending disk change for the dirty editor, if any. */
  pendingChange?: PendingFileChange['kind'] | PendingFileChange
  pendingChangeActions?: PendingFileChangeActions
  /** A small line over the name: where the file is from, in a popup. */
  caption?: string
  /** After the actions, set apart from them: a popup's own buttons. */
  trailing?: ReactNode
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  const gb = mb / 1024
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`
}

export function FilePaneHeader({
  name,
  path,
  size,
  info,
  actions,
  caption,
  trailing,
  pendingChange,
  pendingChangeActions,
}: FilePaneHeaderProps) {
  const { toast } = useToast()
  const pendingKind = typeof pendingChange === 'string' ? pendingChange : pendingChange?.kind
  useIncomingFileToast(path, pendingKind, toast)
  const pendingColor = {
    clean: 'var(--status-done-soft-fg)',
    conflict: 'var(--status-review-soft-fg)',
    deleted: 'var(--status-stuck-soft-fg)',
  }
  const resolvedName = name ?? (path ? path.split('/').pop() : undefined) ?? ''
  return (
    <header
      className="flex items-center justify-between gap-3 px-4 py-1 border-b shrink-0"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-base)',
        height: 44,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {info && <FileInfoButton info={info} />}
        <div className="flex min-w-0 flex-col">
          {caption && (
            <span className="truncate text-[10px] font-semibold uppercase leading-tight tracking-wide text-(--text-secondary)">
              {caption}
            </span>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <code className="text-xs truncate font-medium" title={path ?? resolvedName}>
              {resolvedName}
            </code>
            {typeof size === 'number' && (
              <span className="text-xs text-(--text-muted) shrink-0">· {humanSize(size)}</span>
            )}
          </div>
        </div>
      </div>
      {typeof pendingChange === 'object' ? (
        <PendingFileChangeCallout
          key={path}
          change={pendingChange}
          color={pendingColor[pendingChange.kind]}
          actions={pendingChangeActions}
        />
      ) : pendingChange ? (
        <span className="shrink-0" role="img" aria-label={PENDING_FILE_CHANGE_LABEL[pendingChange]}>
          <IconWarningTriangle className="size-5" color={pendingColor[pendingChange]} />
        </span>
      ) : null}
      {(actions || trailing || pendingChange) && (
        <div className="flex items-center gap-1 shrink-0 h-full">
          {actions}
          {trailing && <div className="flex items-center gap-1 pl-2">{trailing}</div>}
        </div>
      )}
    </header>
  )
}

export default FilePaneHeader
