import type { ChatContext } from '../../../headless/api'
import type { ProcessWaitingDelegatedView } from '../../../headless/utils/processWaitingViewTypes'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'

export default function WaitingDelegated({
  view,
  onOpenChat,
}: {
  view: ProcessWaitingDelegatedView
  onOpenChat?: (context: ChatContext) => void
}) {
  const chat = view.chatContext
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md px-3 py-2.5"
      style={{
        background: 'var(--status-running-soft-bg)',
        border: '1px solid var(--status-running-soft-border)',
      }}
    >
      <Spinner size={14} color="var(--status-running-soft-fg)" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div
          className="text-[13px] font-semibold"
          style={{ color: 'var(--status-running-soft-fg)' }}
        >
          {view.heading}
        </div>
        <div className="text-[12px] leading-snug text-(--text-secondary)">{view.detail}</div>
      </div>
      {onOpenChat ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={!chat}
          onClick={() => chat && onOpenChat(chat)}
        >
          {view.openLabel}
        </Button>
      ) : null}
    </div>
  )
}
