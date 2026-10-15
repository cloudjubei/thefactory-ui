import type { ReactNode } from 'react'

import { RUN_CHAT_OPENING, RUN_CHAT_TITLE } from '../../../headless'
import { BottomSheet } from '../../primitives/BottomSheet'
import { ChatSidebarPanel } from '../ChatSidebarPanel'

export type RunChatDockProps = {
  /** The run's chat is shown. */
  open: boolean
  /** The chat itself, rendered by the host; absent while it is being opened. */
  chat?: ReactNode
  onClose: () => void
  /** Small screens: the chat slides up in a sheet over the run instead of docking beside it. */
  narrow?: boolean
  /** The docked panel's starting width; dragging its edge widens or narrows it from there. */
  initialWidth?: number
  /** The width the person dragged the docked panel to, once they let go. */
  onWidthChange?: (width: number) => void
  /** The run's page. */
  children: ReactNode
}

/**
 * A run's page with its chat beside it — the same docked sidebar a story's
 * chat uses: flush against the page, dragged at its left edge to open wider,
 * and kept at the width it was left at while the page stays open — across a
 * remount too, when the host keeps `onWidthChange` and hands it back. Small
 * screens get the story chat's sheet instead. The page column is the
 * positioning box for anything that slides over the run, so a step's panel
 * opens beside the chat rather than under it.
 */
export default function RunChatDock({
  open,
  chat,
  onClose,
  narrow = false,
  initialWidth,
  onWidthChange,
  children,
}: RunChatDockProps) {
  const body = chat ?? (
    <div className="h-full bg-(--surface-base) p-4 text-[12.5px] text-(--text-secondary)">
      {RUN_CHAT_OPENING}
    </div>
  )
  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      {narrow ? (
        <BottomSheet isOpen={open} onClose={onClose} ariaLabel={RUN_CHAT_TITLE}>
          {body}
        </BottomSheet>
      ) : (
        <ChatSidebarPanel
          isOpen={open}
          collapsed={false}
          defaultCollapsed={false}
          onCollapsedChange={(collapsed) => {
            if (collapsed) onClose()
          }}
          expandedAriaLabel={RUN_CHAT_TITLE}
          {...(initialWidth !== undefined ? { initialWidth } : {})}
          {...(onWidthChange
            ? {
                onWidthChange: (width: number, isFinal: boolean) => {
                  if (isFinal) onWidthChange(width)
                },
              }
            : {})}
        >
          {body}
        </ChatSidebarPanel>
      )}
    </div>
  )
}
