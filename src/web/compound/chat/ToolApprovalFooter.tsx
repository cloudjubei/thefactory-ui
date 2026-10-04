import { Switch } from '../../primitives/Switch'

export type ToolApprovalFooterProps = {
  /** How many calls in this batch await a decision. */
  total: number
  /** How many of them are toggled on — approved by Resume; the rest are declined. */
  selectedCount: number
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onResume: () => void
  /** The decisions are still landing. */
  resuming: boolean
}

/**
 * The commit row under a batch of tool calls awaiting approval — the same
 * control for an API turn and a CLI turn: "Toggle all", then one Resume that
 * approves the toggled calls and declines the rest. Resuming with nothing
 * toggled is refused; declining everything is the composer's job.
 */
export default function ToolApprovalFooter({
  total,
  selectedCount,
  allSelected,
  onToggleAll,
  onResume,
  resuming,
}: ToolApprovalFooterProps) {
  const canResume = selectedCount > 0 && !resuming
  return (
    <div className="pt-1 flex items-center justify-between">
      {total > 1 ? (
        <div className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
          <span>Toggle all</span>
          <Switch checked={allSelected} onCheckedChange={(c) => onToggleAll(c)} />
        </div>
      ) : (
        <div />
      )}
      <button
        type="button"
        className={
          canResume
            ? 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium bg-green-600 hover:bg-green-700 text-white'
            : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) cursor-not-allowed opacity-70'
        }
        disabled={!canResume}
        onClick={onResume}
      >
        {resuming ? (
          <>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Resuming…
          </>
        ) : (
          `Resume ${selectedCount}/${total} Tools`
        )}
      </button>
    </div>
  )
}
