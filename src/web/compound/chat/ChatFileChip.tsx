import { attachmentDisplayName } from 'thefactory-tools/utils'
import { useChatFileChipLook } from '../../../headless/contexts/ChatFileChipLookContext'
import { chatFileKind, chatFileStem } from '../../../headless/utils/chatFileChip'
import type { ChatFileChipLook } from '../../../headless/utils/chatFileChipTypes'
import { extFromTypeOrName } from '../../../headless/utils/path'
import { iconForExt } from '../files/FileTypeIcon'

export type ChatFileChipProps = {
  path: string
  /** Opens the file; without it the chip is only a label. */
  onOpen?: () => void
}

const BASE =
  'inline-flex min-w-0 self-start items-center border border-(--border-subtle) bg-(--surface-raised) text-(--text-primary) text-left transition-colors'

const ACTIVE =
  'cursor-pointer hover:border-(--border-default) hover:bg-(--surface-hover) active:bg-(--surface-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-primary)'

const SHAPE: Record<ChatFileChipLook, string> = {
  pill: 'h-7 max-w-[260px] gap-1.5 rounded-full pl-2 pr-3 text-xs',
  labelled: 'h-8 max-w-[300px] gap-2 rounded-full pl-2 pr-3 text-xs',
  tile: 'w-[232px] gap-2.5 rounded-(--radius-4) p-2 pr-3',
}

/**
 * A file on a message, as a chip: its type's icon and its name, the name cut
 * short to fit and whole on hover. `pill` is one line, `labelled` puts the
 * type in place of the extension, `tile` is a small card with the type under
 * the name.
 */
export default function ChatFileChip({ path, onOpen }: ChatFileChipProps) {
  const look = useChatFileChipLook()
  const name = attachmentDisplayName(path)
  const kind = chatFileKind(path)
  const ext = extFromTypeOrName(undefined, name)
  const className = [BASE, SHAPE[look], onOpen ? ACTIVE : ''].filter(Boolean).join(' ')

  const body =
    look === 'tile' ? (
      <>
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-3) bg-(--surface-muted)"
        >
          {iconForExt(ext, 24)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium leading-tight">{name}</span>
          <span className="truncate text-[11px] leading-tight text-(--text-muted)">
            {kind.long}
          </span>
        </span>
      </>
    ) : (
      <>
        <span aria-hidden className="flex shrink-0">
          {iconForExt(ext, look === 'labelled' ? 18 : 16)}
        </span>
        <span className="truncate leading-none">
          {look === 'labelled' ? chatFileStem(name) : name}
        </span>
        {look === 'labelled' ? (
          <>
            <span aria-hidden className="h-3 w-px shrink-0 bg-(--border-default)" />
            <span className="shrink-0 leading-none text-(--text-muted)">{kind.short}</span>
          </>
        ) : null}
      </>
    )

  if (!onOpen) {
    return (
      <span className={className} title={name}>
        {body}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      title={name}
      aria-label={`Open ${name}`}
      onClick={onOpen}
    >
      {body}
    </button>
  )
}
