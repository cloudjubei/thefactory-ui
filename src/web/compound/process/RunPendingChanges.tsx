import { useState } from 'react'

import { RUN_PENDING_CHANGE_REMOVE_LABEL, runPendingChangesView } from '../../../headless'
import type { ProcessRun } from '../../../headless'
import { IconClose, IconPlay } from '../../icons'
import { Button } from '../../primitives/Button'
import DependencyBullet from '../stories/DependencyBullet'

export type RunPendingChangesProps = {
  run: ProcessRun
  onStart: (changeIds: readonly string[]) => Promise<boolean>
  onRemove: (changeId: string) => Promise<boolean>
}

/**
 * The changes approved on a run that have not started: each feature with what
 * happens to it, or the step to run again, a ✕ to take one off, and the one button that starts exactly
 * these — at the sign-off — in a single pass.
 */
export default function RunPendingChanges({ run, onStart, onRemove }: RunPendingChangesProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const view = runPendingChangesView(run)
  if (!view) return null
  const act = (key: string, work: () => Promise<boolean>) => {
    setBusy(key)
    void work().finally(() => setBusy(null))
  }

  return (
    <section className="mx-3 mt-3 flex flex-col gap-2 rounded-lg border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold text-(--text-primary)">
        <span>{view.headline}:</span>
        {view.items.map((item, i) => (
          <span key={item.id} className="inline-flex items-center gap-1 font-normal">
            {i > 0 ? <span className="text-(--text-muted)">·</span> : null}
            {run.storyId && item.featureId ? (
              <DependencyBullet dependency={`${run.storyId}.${item.featureId}`} interactive />
            ) : (
              <span>{item.name}</span>
            )}
            {item.kindWord ? (
              <span className="text-(--text-secondary)">{item.kindWord}</span>
            ) : null}
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {view.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-[12px] text-(--text-secondary)">
            <span className="min-w-0 flex-1">
              <span className="font-medium text-(--text-primary)">{item.name}</span> —{' '}
              {item.summary}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={RUN_PENDING_CHANGE_REMOVE_LABEL}
              title={RUN_PENDING_CHANGE_REMOVE_LABEL}
              loading={busy === item.id}
              disabled={busy !== null}
              onClick={() => act(item.id, () => onRemove(item.id))}
            >
              <IconClose className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1 text-[11.5px] text-(--text-muted)">{view.hint}</span>
        <Button
          size="sm"
          disabled={!view.canStart || busy !== null}
          loading={busy === 'start'}
          onClick={() => act('start', () => onStart(view.changeIds))}
        >
          <IconPlay className="h-3.5 w-3.5" />
          {view.startLabel}
        </Button>
      </div>
    </section>
  )
}
