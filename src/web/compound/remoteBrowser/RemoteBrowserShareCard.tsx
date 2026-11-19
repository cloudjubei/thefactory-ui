import { REMOTE_BROWSER_TEXT, frameSrc, shortAddress } from '../../../headless'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type RemoteBrowserShareCardProps = {
  url: string
  /** The page's latest frame, as base64; a plain page shows without one. */
  frameData?: string
  /** The agent still drives it. */
  agentDrives?: boolean
  /** Shows it in the browser beside the chat; left out where it already shows there. */
  onOpen?: () => void
}

/**
 * The browser the chat's agent shares, in its message: a still of the page, its address and who
 * drives it.
 */
export default function RemoteBrowserShareCard({
  url,
  frameData,
  agentDrives = true,
  onOpen,
}: RemoteBrowserShareCardProps) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-2">
      <div className="relative h-[46px] w-[72px] shrink-0 overflow-hidden rounded border border-(--border-subtle) bg-(--surface-muted)">
        {frameData ? (
          <img alt="" src={frameSrc(frameData)} className="h-full w-full object-cover object-top" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <b className="max-w-full truncate text-[13px] font-semibold text-(--text-primary)">
          {shortAddress(url)}
        </b>
        {agentDrives ? (
          <ToneBadge tone="running">{REMOTE_BROWSER_TEXT.agentDrives}</ToneBadge>
        ) : null}
      </div>
      {onOpen ? (
        <Button variant="secondary" size="sm" onClick={onOpen}>
          {REMOTE_BROWSER_TEXT.open}
        </Button>
      ) : null}
    </div>
  )
}
