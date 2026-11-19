import type { ReactNode } from 'react'

export type RemoteBrowserBesideProps = {
  /** The browser: `RemoteBrowserView`. */
  browser: ReactNode
  /**
   * The chat beside it. Wide, its whole column: header, thread, staged notes and composer. On a
   * phone, what stays under the page: the staged notes and the composer.
   */
  chat: ReactNode
  /** A phone: the page takes the screen and the chat folds to a sheet under it. */
  compact?: boolean
  /** The folded chat's name, on the sheet. */
  chatTitle?: string
  /** Beside the name: `3 messages`. */
  chatMeta?: string
  className?: string
}

/**
 * A browser beside a chat, as the project App sits: the page takes the main area and the chat
 * keeps a column at its side. On a phone the page takes the screen and the chat folds to its
 * composer in a sheet at the bottom.
 */
export default function RemoteBrowserBeside({
  browser,
  chat,
  compact = false,
  chatTitle,
  chatMeta,
  className,
}: RemoteBrowserBesideProps) {
  if (compact)
    return (
      <div className={`flex h-full min-h-0 flex-col bg-(--surface-base) ${className ?? ''}`}>
        <div className="flex min-h-0 flex-1 flex-col">{browser}</div>
        <div className="shrink-0 rounded-t-2xl border-t border-(--border-subtle) bg-(--surface-raised) shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
          <div className="flex justify-center px-3.5 pt-2 pb-0.5">
            <span aria-hidden className="block h-1 w-9 rounded-sm bg-(--border-default)" />
          </div>
          {chatTitle ? (
            <div className="flex items-center gap-2 px-3.5 pt-0.5 text-xs text-(--text-secondary)">
              <b className="font-semibold text-(--text-primary)">{chatTitle}</b>
              {chatMeta ? <span>· {chatMeta}</span> : null}
            </div>
          ) : null}
          {chat}
        </div>
      </div>
    )
  return (
    <div className={`flex h-full min-h-0 bg-(--surface-base) ${className ?? ''}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{browser}</div>
      <div className="flex w-[400px] max-w-[45%] shrink-0 flex-col border-l border-(--border-subtle) bg-(--surface-base)">
        {chat}
      </div>
    </div>
  )
}
