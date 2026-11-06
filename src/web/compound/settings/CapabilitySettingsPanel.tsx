import type {
  CapabilityBadge,
  CapabilitySettingsRow,
  CapabilitySettingsView,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Switch } from '../../primitives/Switch'

export function CapabilitySettingsBadge({ badge }: { badge: CapabilityBadge }) {
  return (
    <span
      className={`badge badge--soft badge--sm ${badge.on ? 'badge--accent' : 'badge--empty'}`}
      data-testid="capability-settings-badge"
      role="status"
      title={badge.title}
      aria-label={badge.title}
    >
      {badge.label}
    </span>
  )
}

export interface CapabilitySettingsPanelProps {
  view: CapabilitySettingsView
  error: string | null
  busy: boolean
  onToggle: (row: CapabilitySettingsRow, on: boolean) => void
  onInherit: (row: CapabilitySettingsRow) => void
}

function Row({
  row,
  busy,
  onToggle,
  onInherit,
}: {
  row: CapabilitySettingsRow
  busy: boolean
  onToggle: (row: CapabilitySettingsRow, on: boolean) => void
  onInherit: (row: CapabilitySettingsRow) => void
}) {
  return (
    <div
      className="flex items-start justify-between gap-3"
      data-testid={`capability-row-${row.id}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{row.label}</div>
        <p className="text-xs text-(--text-secondary)">{row.detail}</p>
        {row.sourceLabel ? (
          <p className="mt-1 text-xs text-(--text-secondary)">{row.sourceLabel}</p>
        ) : null}
        {row.inheritLabel ? (
          <button
            type="button"
            className="mt-1 text-xs font-medium text-(--accent-primary) hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() => onInherit(row)}
          >
            {row.inheritLabel}
          </button>
        ) : null}
      </div>
      {row.switchable ? (
        <Switch
          checked={row.on}
          disabled={busy || row.disabled}
          ariaLabel={row.label}
          onCheckedChange={(on) => onToggle(row, on)}
        />
      ) : null}
    </div>
  )
}

/**
 * Capability switches and the at-a-glance badge. Presentational: the connected
 * `CapabilitySettings` reads and writes. Native peer:
 * `native/compound/settings/CapabilitySettingsPanel`.
 */
export default function CapabilitySettingsPanel({
  view,
  error,
  busy,
  onToggle,
  onInherit,
}: CapabilitySettingsPanelProps) {
  return (
    <div className="max-w-2xl space-y-6" data-testid="capability-settings">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold">{view.heading}</h2>
          <CapabilitySettingsBadge badge={view.badge} />
        </div>
        <p className="text-sm text-(--text-secondary)">{view.intro}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {view.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{section.heading}</h3>
            {section.note ? (
              <p className="mt-1 text-xs text-(--text-secondary)">{section.note}</p>
            ) : null}
          </div>
          {section.rows.map((item) => (
            <Row key={item.id} row={item} busy={busy} onToggle={onToggle} onInherit={onInherit} />
          ))}
        </section>
      ))}
    </div>
  )
}
