import { useState } from 'react'
import {
  GROUP_TICKET_TAB_SPRINT_LABELS,
  GROUP_TICKET_TAB_SPRINTS,
  GROUP_TICKET_TABS_MAX,
  GROUP_TICKET_TABS_TEXT as TEXT,
  GROUP_TICKETS_TEXT,
  ticketStatusesText,
  useGroupTicketTabsSettings,
  type GroupTicketTabEditorRow,
  type GroupTicketTabsChange,
  type GroupTicketTabsEditorView,
  type GroupTicketTabSprint,
} from '../../../headless'
import { IconArrowDown, IconArrowUp, IconDelete } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import SegmentedControl from '../../primitives/SegmentedControl'
import { SavedField } from './GroupSlackSettings'

export type GroupTicketTabsPanelProps = {
  view: GroupTicketTabsEditorView
  onChange: (change: GroupTicketTabsChange) => void
  onReset: () => void
  onRetry: () => void
  /** Start with this tab opened — for a fixed showcase state. */
  openFirst?: string
  /** Start with Reset to default's confirm open — for a fixed showcase state. */
  confirmingReset?: boolean
}

const MUTED = 'm-0 text-[12.5px] text-(--text-secondary)'
const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'
const ICON_BUTTON =
  'inline-flex size-7 items-center justify-center rounded text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:opacity-40 disabled:hover:bg-transparent'

/**
 * The group's ticket tabs in Settings → Group: each tab's name, statuses,
 * sprint, and what Yours and Others may do on its tickets — added, renamed,
 * moved and deleted here, each change shown at once and saved. Reset to
 * default goes back to the tabs from Jira's status categories.
 */
export function GroupTicketTabsPanel({
  view,
  onChange,
  onReset,
  onRetry,
  openFirst,
  confirmingReset = false,
}: GroupTicketTabsPanelProps) {
  const [open, setOpen] = useState<string | undefined>(openFirst)
  const [confirming, setConfirming] = useState(confirmingReset)
  return (
    <section aria-label={TEXT.heading} className="flex max-w-2xl min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">{TEXT.heading}</h3>
        <p className={MUTED}>{TEXT.intro}</p>
      </div>
      {view.kind === 'loading' ? <p className={MUTED}>{GROUP_TICKETS_TEXT.loading}</p> : null}
      {view.kind === 'failed' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Alert variant="error" className="min-w-0 flex-1">
            {view.error}
          </Alert>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {TEXT.tryAgain}
          </Button>
        </div>
      ) : null}
      {view.kind === 'tabs' ? (
        <>
          {!view.custom ? <p className={MUTED}>{TEXT.defaults}</p> : null}
          {view.error ? <Alert variant="error">{view.error}</Alert> : null}
          <ol className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-0">
            {view.rows.map((row) => (
              <TabRow
                key={row.tab.id}
                row={row}
                open={open === row.tab.id}
                onToggle={() => setOpen(open === row.tab.id ? undefined : row.tab.id)}
                onChange={onChange}
              />
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!view.canAdd}
              title={view.canAdd ? undefined : TEXT.tooMany(GROUP_TICKET_TABS_MAX)}
              onClick={() => onChange({ kind: 'add' })}
            >
              {TEXT.add}
            </Button>
            {view.custom ? (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                {TEXT.reset}
              </Button>
            ) : null}
            {view.saving ? (
              <span className="text-[12px] text-(--text-muted)">{TEXT.saving}</span>
            ) : null}
          </div>
          <ConfirmDialog
            isOpen={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false)
              onReset()
            }}
            title={TEXT.reset}
            description={TEXT.resetConfirm}
            confirmLabel={TEXT.reset}
          />
        </>
      ) : null}
    </section>
  )
}

function TabRow({
  row,
  open,
  onToggle,
  onChange,
}: {
  row: GroupTicketTabEditorRow
  open: boolean
  onToggle: () => void
  onChange: (change: GroupTicketTabsChange) => void
}) {
  const { tab } = row
  const id = tab.id
  return (
    <li className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col items-start rounded px-1.5 py-0.5 text-left hover:bg-(--surface-hover)"
        >
          <span className="text-[13px] font-medium text-(--text-primary)">{tab.name}</span>
          <span className="w-full min-w-0 truncate text-[11.5px] text-(--text-muted)">
            {row.summary}
          </span>
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={!row.canMoveUp}
          aria-label={TEXT.moveUp(tab.name)}
          title={TEXT.moveUp(tab.name)}
          onClick={() => onChange({ kind: 'move', id, by: -1 })}
        >
          <IconArrowUp className="size-4" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={!row.canMoveDown}
          aria-label={TEXT.moveDown(tab.name)}
          title={TEXT.moveDown(tab.name)}
          onClick={() => onChange({ kind: 'move', id, by: 1 })}
        >
          <IconArrowDown className="size-4" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          aria-label={TEXT.remove(tab.name)}
          title={TEXT.remove(tab.name)}
          onClick={() => onChange({ kind: 'remove', id })}
        >
          <IconDelete className="size-4" />
        </button>
      </div>
      {open ? (
        <div className="flex min-w-0 flex-col gap-3 border-t border-(--border-subtle) bg-(--surface-base) px-3 py-3">
          <SavedField
            label={TEXT.name}
            hint=""
            placeholder={tab.name}
            saved={tab.name}
            onSave={(name) => onChange({ kind: 'rename', id, name })}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className={LABEL}>{TEXT.categories}</span>
            <div className="flex flex-wrap gap-1.5">
              {row.categories.map((c) => (
                <Toggle
                  key={c.category}
                  label={c.label}
                  on={c.on}
                  onPress={() => onChange({ kind: 'category', id, category: c.category })}
                />
              ))}
            </div>
          </div>
          <SavedField
            label={TEXT.statuses}
            hint={TEXT.statusesHint}
            placeholder={TEXT.statusesPlaceholder}
            saved={ticketStatusesText(tab.statuses)}
            onSave={(text) => onChange({ kind: 'statuses', id, text })}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className={LABEL}>{TEXT.sprint}</span>
            <SegmentedControl
              size="sm"
              className="self-start"
              ariaLabel={TEXT.sprint}
              value={tab.sprint}
              onChange={(next) =>
                onChange({ kind: 'sprint', id, sprint: next as GroupTicketTabSprint })
              }
              options={GROUP_TICKET_TAB_SPRINTS.map((value) => ({
                value,
                label: GROUP_TICKET_TAB_SPRINT_LABELS[value],
              }))}
            />
          </div>
          {row.sides.map((side) => (
            <div key={side.side} className="flex min-w-0 flex-col gap-1">
              <span className={LABEL}>
                {TEXT.actions} · {side.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {side.actions.map((a) => (
                  <Toggle
                    key={a.action}
                    label={a.label}
                    on={a.on}
                    onPress={() =>
                      onChange({ kind: 'action', id, side: side.side, action: a.action })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  )
}

/** One choice that is on or off, as a pill. */
function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPress}
      className={`rounded-full border px-2.5 py-0.5 text-[12px] ${
        on
          ? 'border-(--accent-primary)/50 bg-(--accent-primary)/12 text-(--text-primary)'
          : 'border-(--border-subtle) text-(--text-muted) hover:text-(--text-primary)'
      }`}
    >
      {label}
    </button>
  )
}

export type GroupTicketTabsSettingsProps = { groupId: string }

/** {@link GroupTicketTabsPanel} on the group's live tabs, placed in Settings → Group. */
export default function GroupTicketTabsSettings({ groupId }: GroupTicketTabsSettingsProps) {
  const tabs = useGroupTicketTabsSettings(groupId)
  return (
    <GroupTicketTabsPanel
      view={tabs.view}
      onChange={tabs.change}
      onReset={tabs.reset}
      onRetry={tabs.retry}
    />
  )
}
