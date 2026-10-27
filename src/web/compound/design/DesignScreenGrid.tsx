import { useState } from 'react'
import { currentDesignVersion, designScreenGrid } from 'thefactory-tools/utils'
import {
  DESIGN_CELL_STATUS_LABELS,
  DESIGN_TEXT,
  designShownOfEntry,
  designShownOfVersion,
  designVariantName,
  formatDateShort,
  type DesignShown,
} from '../../../headless'
import type { DesignCell, DesignIndex, DesignScreen } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import { IconChat } from '../../icons'
import DesignFileThumb from './DesignFileThumb'
import DesignPill, { CELL_TONES } from './DesignPill'

/** A cell of the grid: a state (by id, or by the name a proposal gives a new one) in a variant. */
export type DesignCellRef = { stateId?: string; stateName?: string; variant: string }

export type DesignScreenGridProps = {
  index: DesignIndex
  screen: DesignScreen
  appName: string
  selected: DesignCellRef | undefined
  onSelect: (cell: DesignCellRef) => void
  srcOf: (shown: DesignShown) => string | undefined
  onOpen: (shown: DesignShown) => void
  onCompare: (current: DesignShown, proposed: DesignShown) => void
  /** Accept one waiting cell of a proposal. */
  onAccept: (proposalId: string, entryId: string) => void
  onDiscuss: (ref: { screenId: string; stateId?: string }) => void
  /** For a component: the screens that show it. */
  usedIn?: string[]
}

function sameCell(a: DesignCellRef | undefined, b: DesignCellRef): boolean {
  if (!a || a.variant !== b.variant) return false
  return a.stateId ? a.stateId === b.stateId : !!a.stateName && a.stateName === b.stateName
}

/** What a cell shows: the look waiting on it, else its current version. */
function cellShown(index: DesignIndex, cell: DesignCell, where: string): DesignShown | undefined {
  const waiting = cell.waiting[0]
  if (waiting) {
    const proposal = index.proposals.find((p) => p.id === waiting.proposalId)
    const entry = proposal?.entries.find((e) => e.id === waiting.entryId)
    if (proposal && entry) return designShownOfEntry(proposal, entry, where)
  }
  return cell.current ? designShownOfVersion(index, cell.current) : undefined
}

/**
 * One screen (or component) as states × variants: each cell the state's look in
 * that variant — current, or what waits to replace it — with its status. A
 * cell selected shows beside the grid with what can be done to it and its
 * history.
 */
export default function DesignScreenGrid({
  index,
  screen,
  appName,
  selected,
  onSelect,
  srcOf,
  onOpen,
  onCompare,
  onAccept,
  onDiscuss,
  usedIn,
}: DesignScreenGridProps) {
  const grid = designScreenGrid(index, screen.id)
  const [hidden, setHidden] = useState<string[]>([])
  const variants = grid.variants.filter((v) => !hidden.includes(v))
  const cells = grid.rows.flatMap((r) => r.cells)
  const approved = cells.filter((c) => c.status === 'approved').length
  const waiting = cells.filter((c) => c.status === 'new' || c.status === 'changed').length
  const row = grid.rows.find((r) =>
    selected?.stateId ? r.stateId === selected.stateId : r.name === selected?.stateName,
  )
  const cell = row?.cells.find((c) => c.variant === selected?.variant)
  const state = row?.stateId ? index.states.find((s) => s.id === row.stateId) : undefined
  const selectedShown = cell ? cellShown(index, cell, `${screen.name} › ${row!.name}`) : undefined
  const history =
    cell && row?.stateId
      ? index.versions
          .filter((v) => v.stateId === row.stateId && v.variant === cell.variant)
          .sort((a, b) => b.number - a.number)
      : []
  const current = cell?.current
  const waitingEntry = cell?.waiting[0]

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="text-[12px] text-(--text-muted)">
          {appName} › {screen.kind === 'component' ? DESIGN_TEXT.components : DESIGN_TEXT.screens}
          {screen.group ? ` › ${screen.group}` : ''}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[17px] font-semibold text-(--text-primary)">{screen.name}</h3>
          <span className="text-[12.5px] text-(--text-secondary)">
            {approved} approved · {waiting} waiting for you
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => onDiscuss({ screenId: screen.id })}
          >
            <IconChat className="h-3.5 w-3.5" />
            {DESIGN_TEXT.discuss}
          </Button>
        </div>
        {screen.description ? (
          <p className="text-[13px] text-(--text-secondary)">{screen.description}</p>
        ) : null}
        {usedIn && usedIn.length > 0 ? (
          <p className="text-[12.5px] text-(--text-secondary)">
            {DESIGN_TEXT.usedIn}: {usedIn.join(', ')}
          </p>
        ) : null}
      </header>

      {grid.variants.length > 1 ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label={DESIGN_TEXT.variants}
        >
          <span className="text-[12px] text-(--text-muted)">{DESIGN_TEXT.variants}</span>
          {grid.variants.map((v) => {
            const on = !hidden.includes(v)
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => setHidden((h) => (on ? [...h, v] : h.filter((x) => x !== v)))}
                className={[
                  'rounded-full border px-2.5 py-0.5 text-[12px]',
                  on
                    ? 'border-(--accent-primary) bg-(--surface-hover) text-(--text-primary)'
                    : 'border-(--border-subtle) text-(--text-muted)',
                ].join(' ')}
              >
                {designVariantName(v)}
              </button>
            )
          })}
        </div>
      ) : null}

      {grid.rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-(--border-default) px-3 py-6 text-center text-[12.5px] text-(--text-muted)">
          {DESIGN_TEXT.noStates}
        </p>
      ) : (
        <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-start">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
                    {DESIGN_TEXT.state}
                  </th>
                  {variants.map((v) => (
                    <th
                      key={v}
                      className="text-left text-[12px] font-medium text-(--text-secondary)"
                    >
                      {designVariantName(v)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((r) => (
                  <tr key={r.stateId ?? `new:${r.name}`}>
                    <td className="max-w-48 align-top">
                      <div className="text-[13px] font-medium text-(--text-primary)">{r.name}</div>
                      {r.description ? (
                        <div className="text-[12px] text-(--text-secondary)">{r.description}</div>
                      ) : null}
                    </td>
                    {r.cells
                      .filter((c) => variants.includes(c.variant))
                      .map((c) => {
                        const ref = {
                          ...(r.stateId ? { stateId: r.stateId } : { stateName: r.name }),
                          variant: c.variant,
                        }
                        const shown = cellShown(index, c, `${screen.name} › ${r.name}`)
                        const on = sameCell(selected, ref)
                        return (
                          <td key={c.variant} className="align-top">
                            <button
                              type="button"
                              aria-pressed={on}
                              aria-label={`${r.name} · ${designVariantName(c.variant)}: ${DESIGN_CELL_STATUS_LABELS[c.status]}`}
                              onClick={() => onSelect(ref)}
                              className={[
                                'flex w-full min-w-36 flex-col gap-1.5 rounded-lg border p-1.5 text-left',
                                on
                                  ? 'border-(--accent-primary) shadow-[0_0_0_2px_var(--accent-primary-soft,transparent)]'
                                  : 'border-(--border-subtle) hover:border-(--border-default)',
                              ].join(' ')}
                            >
                              {shown ? (
                                <DesignFileThumb shown={shown} src={srcOf(shown)} width={144} />
                              ) : (
                                <div
                                  className="flex items-center justify-center rounded-md border border-dashed border-(--border-default) text-[11px] text-(--text-muted)"
                                  style={{ width: 144, height: 108 }}
                                >
                                  —
                                </div>
                              )}
                              <DesignPill tone={CELL_TONES[c.status]}>
                                {DESIGN_CELL_STATUS_LABELS[c.status]}
                              </DesignPill>
                            </button>
                          </td>
                        )
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cell && row ? (
            <aside
              aria-label="Selected state"
              className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-(--border-subtle) p-3 @5xl:w-80"
              style={{ background: 'var(--surface-raised)' }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[14px] font-semibold text-(--text-primary)">
                  {screen.name} › {row.name}
                </span>
                <span className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
                  {designVariantName(cell.variant)}
                  <DesignPill tone={CELL_TONES[cell.status]}>
                    {DESIGN_CELL_STATUS_LABELS[cell.status]}
                  </DesignPill>
                </span>
              </div>
              {selectedShown ? (
                <button type="button" onClick={() => onOpen(selectedShown)} className="self-start">
                  <DesignFileThumb shown={selectedShown} src={srcOf(selectedShown)} width={288} />
                </button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {waitingEntry ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onAccept(waitingEntry.proposalId, waitingEntry.entryId)}
                  >
                    {DESIGN_TEXT.approve}
                  </Button>
                ) : null}
                {waitingEntry && current && selectedShown ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onCompare(designShownOfVersion(index, current), selectedShown)}
                  >
                    {DESIGN_TEXT.compareWithCurrent}
                  </Button>
                ) : null}
                {row.stateId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDiscuss({ screenId: screen.id, stateId: row.stateId! })}
                  >
                    <IconChat className="h-3.5 w-3.5" />
                    {DESIGN_TEXT.discuss}
                  </Button>
                ) : null}
              </div>
              {history.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
                    History
                  </span>
                  <ul className="flex flex-col">
                    {history.map((v) => {
                      const isCurrent =
                        currentDesignVersion(index, v.stateId, v.variant)?.id === v.id
                      return (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => onOpen(designShownOfVersion(index, v))}
                            className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[12.5px] hover:bg-(--surface-hover)"
                          >
                            <span className="font-mono font-semibold">v{v.number}</span>
                            <span className="text-(--text-secondary)">
                              {formatDateShort(new Date(v.createdAt))}
                            </span>
                            <span className="ml-auto">
                              <DesignPill tone={isCurrent ? 'done' : 'empty'}>
                                {isCurrent ? DESIGN_TEXT.current : DESIGN_TEXT.earlier}
                              </DesignPill>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
              {state?.address ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
                    {DESIGN_TEXT.address}
                  </span>
                  <code className="break-all text-[12px] text-(--text-secondary)">
                    {state.address}
                  </code>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      )}
    </div>
  )
}
