import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../primitives/Select'

export type ModelQuickSelectOption = {
  id: string
  name: string
  model?: string
}

export type AgentModelQuickSelectProps = {
  /** Currently-active config id; empty string when nothing is picked. */
  value: string
  /** Recent picks rendered above the "Manage…" entry. */
  options: ReadonlyArray<ModelQuickSelectOption>
  /** Caller selects a new config. */
  onPick: (id: string) => void
  /** Opens the settings surface for full LLM management. Also the fallback
   *  rendered when `options` is empty. */
  onOpenSettings: () => void
  /** Label used for the empty-state CTA. */
  emptyLabel?: string
  /** Trigger placeholder when `value` is empty. */
  placeholder?: string
  /** Label for the "Manage…" footer entry. */
  manageLabel?: string
  className?: string
  /** Trigger width — defaults to the desktop's 220px. */
  triggerWidth?: number | string
  /** Accessible name for the trigger. */
  ariaLabel?: string
}

const MANAGE_VALUE = '__open_settings'

/**
 * Compact LLM picker used by both the agent-run header and the chat header.
 * Renders the most-recent N configs plus a footer entry that takes the user
 * to a full settings surface. When no configs exist, renders a single
 * "Configure LLM…" button instead.
 *
 * Presentational only — caller wires `onPick` / `onOpenSettings` to its
 * own context / navigator. Library makes no assumption about how recents
 * are stored, ranked, or what "active" means.
 */
export default function AgentModelQuickSelect({
  value,
  options,
  onPick,
  onOpenSettings,
  emptyLabel = 'Configure LLM…',
  placeholder = 'Select Model',
  manageLabel = 'Manage LLM Configurations…',
  className = '',
  triggerWidth = 220,
  ariaLabel = 'Agent Model',
}: AgentModelQuickSelectProps) {
  if (!options || options.length === 0) {
    return (
      <button
        type="button"
        className={`btn-secondary no-drag ${className}`}
        onClick={onOpenSettings}
        title="No LLMs configured. Open Settings to add one."
        aria-label="Configure LLMs"
      >
        {emptyLabel}
      </button>
    )
  }

  return (
    <div className={`no-drag ${className}`}>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === MANAGE_VALUE) {
            onOpenSettings()
            return
          }
          onPick(v)
        }}
      >
        <SelectTrigger
          className="ui-select"
          aria-label={ariaLabel}
          style={{ width: typeof triggerWidth === 'number' ? `${triggerWidth}px` : triggerWidth }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name} {opt.model ? `(${opt.model})` : ''}
            </SelectItem>
          ))}
          <SelectItem value={MANAGE_VALUE}>{manageLabel}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
