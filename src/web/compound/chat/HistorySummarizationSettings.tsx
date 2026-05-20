import { Switch } from '../../primitives/Switch'

export type HistorySummarization = {
  enabled: boolean
  keepLastTurns?: number
  maxOpsInSummary?: number
}

export type HistorySummarizationSettingsProps = {
  historySummarization?: HistorySummarization
  persistSettings: (patch: { historySummarization?: HistorySummarization }) => Promise<void> | void
}

/**
 * History-summarization sub-control for the `ChatSettingsDropdown`'s
 * `extraContent` slot. Mirrors `overseer-local`'s component 1:1.
 */
export default function HistorySummarizationSettings({
  historySummarization,
  persistSettings,
}: HistorySummarizationSettingsProps) {
  const enabled = !!historySummarization?.enabled
  const keepLastTurns = historySummarization?.keepLastTurns ?? 4
  const maxOpsInSummary = historySummarization?.maxOpsInSummary ?? 30

  const patchSummarization = (patch: Partial<HistorySummarization>) => {
    const current: HistorySummarization = historySummarization ?? { enabled: false }
    void persistSettings({ historySummarization: { ...current, ...patch } })
  }

  return (
    <div className="space-y-3 pt-2 border-t border-(--border-subtle)">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-(--text-secondary)">History Summarization</span>
          <span className="text-[10px] text-(--text-tertiary)">
            Summarize older messages to reduce token usage while preserving context
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => patchSummarization({ enabled: !!checked })}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pl-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium text-(--text-secondary)"
                htmlFor="keepLastTurns"
              >
                Keep last turns:
                <span className="pl-4 text-[14px] text-(--text-secondary)">{keepLastTurns}</span>
              </label>
            </div>
            <input
              id="keepLastTurns"
              type="range"
              min={1}
              max={20}
              step={1}
              value={keepLastTurns}
              onChange={(e) => patchSummarization({ keepLastTurns: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-(--text-tertiary)">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium text-(--text-secondary)"
                htmlFor="maxOpsInSummary"
              >
                Max ops in summary:
                <span className="pl-4 text-[14px] text-(--text-secondary)">{maxOpsInSummary}</span>
              </label>
            </div>
            <input
              id="maxOpsInSummary"
              type="range"
              min={5}
              max={100}
              step={5}
              value={maxOpsInSummary}
              onChange={(e) => patchSummarization({ maxOpsInSummary: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-(--text-tertiary)">
              <span>5</span>
              <span>100</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
