import { useState } from 'react'
import type { ProcessRunManagerView } from '../../../headless'

export type RunManagerChipProps = {
  view: ProcessRunManagerView
  /** Switch the manager on or off; absent once the run has ended, when it only shows it. */
  onSwitch?: (enabled: boolean) => Promise<boolean>
}

/** Whether the run's agent manager is on, in its head — and, while it runs, the switch. */
export function RunManagerChip({ view, onSwitch }: RunManagerChipProps) {
  const [saving, setSaving] = useState(false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={view.enabled}
      disabled={!onSwitch || saving}
      onClick={() => {
        if (!onSwitch) return
        setSaving(true)
        void onSwitch(!view.enabled).finally(() => setSaving(false))
      }}
      aria-label={view.switchLabel}
      title={view.switchDetail}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-(--border-subtle) px-2 text-[11px] text-(--text-secondary) enabled:hover:bg-(--surface-hover)"
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{
          background: view.enabled ? 'var(--status-done-fg)' : 'var(--status-empty-fg)',
        }}
      />
      {view.switchLabel}
    </button>
  )
}
