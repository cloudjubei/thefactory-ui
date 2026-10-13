import { useProcessParkStanding } from '../../../headless/hooks/useProcessParkStanding'
import type { ParkClosure } from '../../../headless/utils/processParkStandingTypes'
import { IconCheck, IconChevronRight } from '../../icons'

/**
 * How something raised on a park was closed — "Handled — you allowed it on web
 * · 19:20", or superseded by what came after — as a quiet line, or as the
 * banner heading a card that has become history.
 */
export default function ParkClosureLine({
  closure,
  banner = false,
}: {
  closure: ParkClosure
  banner?: boolean
}) {
  const tone = closure.tone === 'handled' ? 'done' : 'empty'
  const Icon = closure.tone === 'handled' ? IconCheck : IconChevronRight
  return (
    <div
      className={
        banner
          ? 'flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold'
          : 'flex items-center gap-1.5 self-start rounded-md border px-2 py-1 text-[12px] font-medium'
      }
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        ...(banner ? {} : { borderColor: `var(--status-${tone}-soft-border)` }),
      }}
    >
      <Icon className={banner ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
      <span className="min-w-0">{closure.line}</span>
    </div>
  )
}

/**
 * The closing line of a message that told the person a run waits on them,
 * read live off the run: nothing while it still waits there (or is not read),
 * how the park was answered once it does not.
 */
export function RunParkClosure({ runId, parkedAt }: { runId: string; parkedAt: number }) {
  const standing = useProcessParkStanding(runId, parkedAt)
  return standing.state === 'closed' ? <ParkClosureLine closure={standing.closure} /> : null
}
