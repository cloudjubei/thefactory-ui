import { useState } from 'react'
import { designTidyPreview } from 'thefactory-tools/utils'
import { DESIGN_TEXT, designTidyMoveView } from '../../../headless'
import type { DesignIndex, DesignTidyPlan } from '../../../headless/api'
import { Button } from '../../primitives/Button'
import DesignPill from './DesignPill'

export type DesignTidyProps = {
  index: DesignIndex
  /** The open plan; `undefined` when there is none. */
  plan: DesignTidyPlan | undefined
  onDecide: (planId: string, moveId: string, decision: 'accept' | 'leave') => Promise<unknown>
  onApply: (planId: string) => Promise<unknown>
  onDismiss: (planId: string) => Promise<unknown>
}

function Counter({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div className="flex flex-col rounded-lg border border-(--border-subtle) px-3 py-2">
      <span className="text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
        {label}
      </span>
      <span className="text-[17px] font-semibold text-(--text-primary)">
        {before} → {after}
      </span>
    </div>
  )
}

/**
 * An agent's tidy-up plan: where each app, screen and version belongs. Each
 * move is accepted or left; applying the accepted ones moves only where images
 * sit, never loses one, and keeps old names as aliases.
 */
export default function DesignTidy({ index, plan, onDecide, onApply, onDismiss }: DesignTidyProps) {
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const act = async (key: string, call: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await call()
    } finally {
      setBusy(undefined)
    }
  }
  if (!plan) {
    return (
      <p className="rounded-md border border-dashed border-(--border-default) px-3 py-8 text-center text-[13px] text-(--text-muted)">
        {DESIGN_TEXT.tidyNone}
      </p>
    )
  }
  const preview = designTidyPreview(index, plan.id)
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-[13px] text-(--text-secondary)">{DESIGN_TEXT.tidyIntro}</p>
      <div className="flex flex-wrap gap-2">
        <Counter label={DESIGN_TEXT.apps} before={preview.appsBefore} after={preview.appsAfter} />
        <Counter
          label={DESIGN_TEXT.screens}
          before={preview.screensBefore}
          after={preview.screensAfter}
        />
        <div className="flex flex-col rounded-lg border border-(--border-subtle) px-3 py-2">
          <span className="text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase">
            Moves accepted
          </span>
          <span className="text-[17px] font-semibold text-(--text-primary)">
            {preview.accepted} of {preview.moves}
          </span>
        </div>
      </div>
      {preview.problem ? (
        <p
          className="rounded-md border px-3 py-2 text-[12.5px]"
          style={{
            background: 'var(--status-stuck-soft-bg)',
            borderColor: 'var(--status-stuck-soft-border)',
          }}
        >
          {preview.problem}
        </p>
      ) : null}
      <ol className="flex flex-col gap-2">
        {plan.moves.map((move) => {
          const view = designTidyMoveView(index, move)
          return (
            <li
              key={move.id}
              className="flex flex-col gap-2 rounded-lg border border-(--border-subtle) p-3"
              style={{
                background: 'var(--surface-raised)',
                opacity: move.decision === 'leave' ? 0.6 : 1,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <DesignPill tone="running">{view.kindLabel}</DesignPill>
                <span className="text-[14px] font-semibold text-(--text-primary)">
                  {move.title}
                </span>
                {move.decision ? (
                  <DesignPill tone={move.decision === 'accept' ? 'done' : 'empty'}>
                    {move.decision === 'accept' ? 'Accepted' : 'Left as is'}
                  </DesignPill>
                ) : null}
                <span className="ml-auto flex gap-1.5">
                  <Button
                    size="sm"
                    variant={move.decision === 'accept' ? 'primary' : 'secondary'}
                    aria-pressed={move.decision === 'accept'}
                    loading={busy === `${move.id}:accept`}
                    onClick={() =>
                      void act(`${move.id}:accept`, () => onDecide(plan.id, move.id, 'accept'))
                    }
                  >
                    {DESIGN_TEXT.tidyAccept}
                  </Button>
                  <Button
                    size="sm"
                    variant={move.decision === 'leave' ? 'primary' : 'ghost'}
                    aria-pressed={move.decision === 'leave'}
                    loading={busy === `${move.id}:leave`}
                    onClick={() =>
                      void act(`${move.id}:leave`, () => onDecide(plan.id, move.id, 'leave'))
                    }
                  >
                    {DESIGN_TEXT.tidyLeave}
                  </Button>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                {view.from.map((f) => (
                  <span
                    key={f}
                    className="rounded border border-(--border-subtle) bg-(--surface-muted) px-1.5 py-0.5"
                  >
                    {f}
                  </span>
                ))}
                <span className="text-(--text-muted)">→</span>
                <span className="rounded border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-1.5 py-0.5 font-medium">
                  {view.to}
                </span>
              </div>
              <span className="text-[12.5px] text-(--text-secondary)">{move.why}</span>
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={preview.accepted === 0 || !!preview.problem}
          loading={busy === 'apply'}
          onClick={() => void act('apply', () => onApply(plan.id))}
        >
          {DESIGN_TEXT.tidyApply(preview.accepted)}
        </Button>
        <Button
          variant="ghost"
          loading={busy === 'dismiss'}
          onClick={() => void act('dismiss', () => onDismiss(plan.id))}
        >
          {DESIGN_TEXT.tidyDismiss}
        </Button>
      </div>
    </div>
  )
}
