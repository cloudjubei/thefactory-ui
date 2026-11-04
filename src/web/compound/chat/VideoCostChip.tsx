import { VIDEO_ATTACHMENT_TEXT, videoCostLabel, type VideoCostView } from '../../../headless'
import CostChip from '../chips/CostChip'

export type VideoCostChipProps = {
  cost: VideoCostView
  /** Only the reading cost, where the row is short; the details still give both. */
  compact?: boolean
}

/**
 * What a video costs an agent, as the app's cost chip. It counts tokens rather
 * than dollars: no model is known when a video is attached.
 */
export default function VideoCostChip({ cost, compact = false }: VideoCostChipProps) {
  return (
    <CostChip
      label={videoCostLabel(cost, compact)}
      details={
        <div className="flex w-[280px] max-w-full flex-col gap-1 text-xs text-(--text-primary)">
          <div className="font-semibold">{VIDEO_ATTACHMENT_TEXT.costTitle}</div>
          <div className="tabular-nums">{cost.read}</div>
          <div className="tabular-nums">{cost.closer}</div>
          <div className="text-(--text-secondary)">{VIDEO_ATTACHMENT_TEXT.costNote}</div>
        </div>
      }
    />
  )
}
