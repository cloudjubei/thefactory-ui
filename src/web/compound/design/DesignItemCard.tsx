import { useState } from 'react'
import {
  DESIGN_TEXT,
  designDeleteSummary,
  designItemAddedByLabel,
  formatFileDate,
} from '../../../headless'
import type { DesignItem } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import Tooltip from '../../primitives/Tooltip'
import { IconChat, IconCheck, IconWorkflow } from '../../icons'
import OverflowMenu from '../OverflowMenu'
import { CommitChip } from '../chips'
import DesignItemThumb from './DesignItemThumb'
import { InlineConfirm, InlineRename } from './DesignInline'

export type DesignItemCardProps = {
  projectId: string
  item: DesignItem
  src: string | undefined
  /** The screen's latest built version. */
  current?: boolean
  onOpen: () => void
  onDiscuss: () => void
  onRename: (name: string) => Promise<boolean>
  onDelete: () => Promise<boolean>
  /** A draft: mark it the approved design, or unmark it. */
  onApprove?: (approved: boolean) => Promise<boolean>
  /** A built version with something to compare it with. */
  onCompare?: () => void
  onOpenRun?: (runId: string) => void
}

function Badge({ tone, children }: { tone: 'done' | 'review'; children: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10.5px] font-semibold"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        borderColor: `var(--status-${tone}-soft-border)`,
        color: `var(--status-${tone}-soft-fg)`,
      }}
    >
      {tone === 'done' ? <IconCheck className="h-3 w-3" /> : null}
      {children}
    </span>
  )
}

/** One draft or built version: its miniature, what it is and where it came from, and what can be done to it. */
export default function DesignItemCard({
  projectId,
  item,
  src,
  current,
  onOpen,
  onDiscuss,
  onRename,
  onDelete,
  onApprove,
  onCompare,
  onOpenRun,
}: DesignItemCardProps) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view')
  const built = item.built
  const runId = item.addedBy.runId
  return (
    <li
      className={[
        'flex flex-col gap-2 rounded-lg border p-2',
        item.approved ? 'border-(--status-done-soft-border)' : 'border-(--border-subtle)',
      ].join(' ')}
      style={{ background: 'var(--surface-raised)' }}
    >
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          className="shrink-0 cursor-zoom-in"
          onClick={onOpen}
          aria-label={`View ${item.name}`}
        >
          <DesignItemThumb item={item} src={src} width={112} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {mode === 'rename' ? (
            <InlineRename
              value={item.name}
              ariaLabel={`Rename ${item.name}`}
              onCancel={() => setMode('view')}
              onSave={async (name) => {
                if (await onRename(name)) setMode('view')
              }}
            />
          ) : (
            <div className="flex min-w-0 items-start gap-1.5">
              <button
                type="button"
                className="min-w-0 truncate text-left text-[13px] font-medium text-(--text-primary) hover:underline"
                onClick={onOpen}
                title={item.name}
              >
                {item.name}
              </button>
              {item.approved ? <Badge tone="done">{DESIGN_TEXT.approved}</Badge> : null}
              {current ? <Badge tone="review">{DESIGN_TEXT.current}</Badge> : null}
              <span className="ml-auto shrink-0">
                <OverflowMenu
                  label={`More for ${item.name}`}
                  items={[
                    { key: 'rename', label: DESIGN_TEXT.rename, onSelect: () => setMode('rename') },
                    {
                      key: 'delete',
                      label: DESIGN_TEXT.delete,
                      destructive: true,
                      onSelect: () => setMode('delete'),
                    },
                  ]}
                />
              </span>
            </div>
          )}
          <div className="text-[11.5px] text-(--text-secondary)">
            {designItemAddedByLabel(item)} · {formatFileDate(item.createdAt)}
          </div>
          {built ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-(--text-secondary)">
              {built.sha ? <CommitChip projectId={projectId} sha={built.sha} /> : null}
              {built.dirty ? (
                <span className="text-(--status-stuck-soft-fg)">uncommitted changes</span>
              ) : null}
              {built.variant ? <span>{built.variant}</span> : null}
              {built.capturedOn ? <span>on {built.capturedOn}</span> : null}
              {runId && onOpenRun ? (
                <Tooltip placement="top" content="Open the run it came from">
                  <button
                    type="button"
                    className="ref-chip ref-chip--reference ref-chip--link"
                    onClick={() => onOpenRun(runId)}
                  >
                    <IconWorkflow className="ref-chip__glyph" />
                    <span className="ref-chip__label">Run</span>
                  </button>
                </Tooltip>
              ) : null}
              <span>adopted {formatFileDate(built.adoptedAt)}</span>
            </div>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-1.5">
            {onApprove ? (
              <Button
                size="sm"
                variant={item.approved ? 'secondary' : 'primary'}
                onClick={() => void onApprove(!item.approved)}
              >
                {item.approved ? DESIGN_TEXT.unapprove : DESIGN_TEXT.approve}
              </Button>
            ) : null}
            {onCompare ? (
              <Button size="sm" variant="secondary" onClick={onCompare}>
                {DESIGN_TEXT.compare}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onDiscuss}>
              <IconChat className="h-3.5 w-3.5" />
              {DESIGN_TEXT.discuss}
            </Button>
          </div>
        </div>
      </div>
      {mode === 'delete' ? (
        <InlineConfirm
          message={designDeleteSummary({ kind: 'item', item })}
          onCancel={() => setMode('view')}
          onConfirm={async () => {
            if (await onDelete()) setMode('view')
          }}
        />
      ) : null}
    </li>
  )
}
