import { useUsageBreakdown } from '../../headless/hooks/useUsageBreakdown'
import {
  USAGE_CURRENT_TITLE,
  USAGE_FOOTNOTES,
  USAGE_LEDGER_TITLE,
  USAGE_SOURCES_TITLE,
  USAGE_TABLE_COLUMNS,
} from '../../headless/utils/usageBreakdownConstants'
import type {
  UsageModalCostAggregate,
  UsageModalMessage,
  UsageModalModelPrice,
  UsageTableRow,
} from '../../headless/utils/usageBreakdownTypes'
import { Modal } from '../primitives/Modal'

export type UsageModalProps = {
  isOpen: boolean
  onClose: () => void
  messages: UsageModalMessage[]
  chatKey?: string
  getPrice: (provider: string, model: string) => Promise<UsageModalModelPrice | undefined>
  getCost?: (chatKey: string) => Promise<UsageModalCostAggregate | undefined>
}

const COLUMN_WIDTH = '112px'

function UsageTable({ rows }: { rows: UsageTableRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border-subtle)]">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            {USAGE_TABLE_COLUMNS.map((c) => (
              <col key={c.cell} style={{ width: COLUMN_WIDTH }} />
            ))}
          </colgroup>
          <thead className="bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            <tr>
              {USAGE_TABLE_COLUMNS.map((c) => (
                <th
                  key={c.cell}
                  className="px-2 py-2 text-center align-top whitespace-normal break-words"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                className={`border-t border-[var(--border-subtle)] tabular-nums ${r.total ? 'font-semibold' : ''}`}
              >
                {USAGE_TABLE_COLUMNS.map((c) => (
                  <td
                    key={c.cell}
                    className={`px-2 py-2 align-top ${c.cell === 'label' ? 'whitespace-normal break-words text-[var(--text-primary)]' : ''}`}
                  >
                    {r[c.cell]}
                    {c.cell === 'label' && r.notReportedBy ? (
                      <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                        {r.notReportedBy}
                      </div>
                    ) : null}
                    {c.cell === 'cachedRead' && r.cacheRatio ? <div>{r.cacheRatio}</div> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * What a chat, story or project has spent: the durable cost ledger per model
 * and per executor, and the messages on screen. Every table keeps charged,
 * included (a plan covered them) and unpriced (no known price) tokens apart,
 * with their value at list price — marked when it covers only part — and names
 * the tool behind any count a CLI never reported instead of showing it as 0.
 * The rows come from the headless `useUsageBreakdown`, shared with the native peer.
 */
export function UsageModal({
  isOpen,
  onClose,
  messages,
  chatKey,
  getPrice,
  getCost,
}: UsageModalProps) {
  const { ledger, sources, current } = useUsageBreakdown({
    isOpen,
    messages,
    chatKey,
    getPrice,
    getCost,
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Usage" size="xl" contentClassName="!p-0">
      <div className="bg-[var(--surface-base)] text-sm text-[var(--text-secondary)]">
        <div className="space-y-6">
          {ledger ? (
            <div className="space-y-2">
              <div className="px-4 pt-4 text-[12px] text-[var(--text-secondary)]">
                {USAGE_LEDGER_TITLE}
              </div>
              <div className="px-4">
                <UsageTable rows={ledger} />
              </div>
              {sources ? (
                <div className="px-4">
                  <div className="mb-1 text-[12px] text-[var(--text-secondary)]">
                    {USAGE_SOURCES_TITLE}
                  </div>
                  <UsageTable rows={sources} />
                </div>
              ) : null}
            </div>
          ) : null}

          {current ? (
            <div className="space-y-2">
              <div className="px-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                  <div className="text-[12px] tracking-wide text-[var(--text-secondary)]">
                    {USAGE_CURRENT_TITLE}
                  </div>
                  <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                </div>
              </div>
              <div className="px-4 pb-4">
                <UsageTable rows={current} />
              </div>
            </div>
          ) : null}

          <div className="space-y-1 px-4 pb-4 text-[11px] text-[var(--text-secondary)] opacity-80">
            {USAGE_FOOTNOTES.map((note) => (
              <div key={note}>{note}</div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default UsageModal
