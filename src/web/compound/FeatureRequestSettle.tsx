import { useState } from 'react'
import { Button } from '../primitives/Button'
import { Input } from '../primitives/Input'
import { Textarea } from '../primitives/Textarea'
import {
  featureRequestSettleFormReady,
  featureRequestSettleHint,
} from '../../headless/utils/featureRequestView'
import { FEATURE_REQUEST_SETTLE_WORDS as WORDS } from '../../headless/utils/featureRequestViewConstants'
import type {
  FeatureRequestLinkView,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
} from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'

export type FeatureRequestSettleActionsProps = {
  /** The asking project's name — its chat is told. */
  fromLabel: string
  /** Mark the request delivered by other work. Offers the action when given. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story. Offers the action when given. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  busy?: boolean
  /** Opens a form at once, for a fixed showcase state. */
  initialMode?: FeatureRequestSettleMode
}

function SettleForm({
  mode,
  fromLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  mode: FeatureRequestSettleMode
  fromLabel: string
  busy?: boolean
  onCancel: () => void
  onSubmit: (values: { projectId: string; ref: string; note: string }) => void
}) {
  const [projectId, setProjectId] = useState('')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const ready = featureRequestSettleFormReady(mode, { projectId, ref })
  const handOver = mode === 'handed-over'
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-(--border-subtle) bg-(--surface-muted) p-3">
      {handOver ? (
        <label className="flex flex-col gap-1.5 text-[13px] text-(--text-primary)">
          {WORDS.handOverProject}
          <Input size="sm" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-[13px] text-(--text-primary)">
        {handOver ? WORDS.handOverRef : WORDS.deliveredRef}
        <Input
          size="sm"
          value={ref}
          placeholder={handOver ? WORDS.handOverRefPlaceholder : WORDS.deliveredRefPlaceholder}
          onChange={(e) => setRef(e.target.value)}
        />
      </label>
      <Textarea
        rows={2}
        value={note}
        placeholder={WORDS.notePlaceholder}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[12px] text-(--text-secondary)">
          {featureRequestSettleHint(fromLabel)}
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          {WORDS.cancel}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onSubmit({ projectId, ref, note })}
          disabled={busy || !ready}
        >
          {handOver ? WORDS.confirmHandOver : WORDS.confirmDelivered}
        </Button>
      </div>
    </div>
  )
}

/**
 * Mark as delivered… / Hand over… for a request whose work was done, or moved, outside its own
 * run — each opening its form in place. Renders nothing when the host offers neither.
 */
export function FeatureRequestSettleActions({
  fromLabel,
  onMarkDelivered,
  onHandOver,
  busy,
  initialMode,
}: FeatureRequestSettleActionsProps) {
  const [mode, setMode] = useState<FeatureRequestSettleMode | undefined>(initialMode)
  if (!onMarkDelivered && !onHandOver) return null
  if (mode) {
    return (
      <SettleForm
        mode={mode}
        fromLabel={fromLabel}
        busy={busy}
        onCancel={() => setMode(undefined)}
        onSubmit={({ projectId, ref, note }) =>
          mode === 'delivered'
            ? onMarkDelivered?.({ ref, note })
            : onHandOver?.({ projectId, ref, note })
        }
      />
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onMarkDelivered ? (
        <Button size="sm" variant="ghost" onClick={() => setMode('delivered')} disabled={busy}>
          {WORDS.markDelivered}…
        </Button>
      ) : null}
      {onHandOver ? (
        <Button size="sm" variant="ghost" onClick={() => setMode('handed-over')} disabled={busy}>
          {WORDS.handOver}…
        </Button>
      ) : null}
    </div>
  )
}

function RequestLink({
  link,
  onOpenRequest,
}: {
  link: FeatureRequestLinkView
  onOpenRequest?: (requestId: string) => void
}) {
  return (
    <button
      type="button"
      disabled={!onOpenRequest}
      onClick={() => onOpenRequest?.(link.requestId)}
      className="rounded-lg border border-(--border-subtle) px-2 py-0.5 text-(--text-primary) enabled:hover:bg-(--surface-hover)"
    >
      {link.label}
    </button>
  )
}

/**
 * Where a request's work went, or came from: what delivered it, the request it was handed over
 * to, and the requests it took over — each linked when the host can open requests.
 */
export function FeatureRequestSettledNote({
  settled,
  takenOver,
  onOpenRequest,
}: {
  settled?: FeatureRequestSettledView
  takenOver?: FeatureRequestLinkView[]
  onOpenRequest?: (requestId: string) => void
}) {
  if (!settled && !takenOver?.length) return null
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-(--text-secondary)">
      {settled ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-(--text-primary)">{settled.text}</span>
          {settled.link ? <RequestLink link={settled.link} onOpenRequest={onOpenRequest} /> : null}
        </div>
      ) : null}
      {settled?.note ? <span className="italic">“{settled.note}”</span> : null}
      {takenOver?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>{WORDS.takesOver}</span>
          {takenOver.map((link) => (
            <RequestLink key={link.requestId} link={link} onOpenRequest={onOpenRequest} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
