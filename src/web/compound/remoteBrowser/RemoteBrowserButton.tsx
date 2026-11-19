import { REMOTE_BROWSER_TEXT } from '../../../headless'
import { IconGlobe } from '../../icons'
import { DotBadge } from '../../primitives/DotBadge'

export type RemoteBrowserButtonProps = {
  /** The browser shows beside the chat. */
  open: boolean
  onToggle: () => void
  /** The chat's agent has a browser open: a dot says so until it shows. */
  agentShares?: boolean
}

/**
 * Where a chat opens its browser: an icon button for the chat header's controls, pressed while
 * the browser shows beside the chat.
 */
export default function RemoteBrowserButton({
  open,
  onToggle,
  agentShares = false,
}: RemoteBrowserButtonProps) {
  return (
    <button
      type="button"
      aria-label={REMOTE_BROWSER_TEXT.openLabel}
      aria-pressed={open}
      title={REMOTE_BROWSER_TEXT.openLabel}
      onClick={onToggle}
      className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-(--text-secondary) hover:bg-(--surface-hover) ${
        open
          ? 'border-(--accent-primary) bg-(--accent-soft-bg)'
          : 'border-(--border-default) bg-(--surface-raised)'
      }`}
    >
      <IconGlobe className="size-4" />
      {agentShares && !open ? (
        <DotBadge
          className="absolute -right-1 -top-1 h-2 w-2"
          colorClass="bg-(--status-running-bg)"
          title={REMOTE_BROWSER_TEXT.agentDrives}
        />
      ) : null}
    </button>
  )
}
