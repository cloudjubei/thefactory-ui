import { processAlreadyDoneLines, type ProcessFeatureDelivery } from '../../../headless'

export type AlreadyDoneNoteProps = {
  /** The features the launch would work that an earlier run already delivered. */
  deliveries: readonly ProcessFeatureDelivery[]
}

/**
 * Before a launch: the features an earlier run already delivered, by the run
 * that did — so they are not worked again unnoticed. Nothing when none were.
 * Native peer: `native/compound/chat/AlreadyDoneNote`.
 */
export default function AlreadyDoneNote({ deliveries }: AlreadyDoneNoteProps) {
  const lines = processAlreadyDoneLines(deliveries)
  if (lines.length === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-md border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-2.5 py-2">
      {lines.map((line) => (
        <span key={line} className="text-[11.5px] font-medium text-(--status-review-soft-fg)">
          {line}
        </span>
      ))}
    </div>
  )
}
