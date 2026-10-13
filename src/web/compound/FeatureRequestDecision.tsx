import { useState } from 'react'
import type { FeatureRequest } from 'thefactory-tools/types'
import { Button } from '../primitives/Button'
import { Textarea } from '../primitives/Textarea'
import { IconCheckCircle, IconXCircle } from '../icons'
import {
  featureRequestAcceptHint,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestStatusView,
} from '../../headless/utils/featureRequestView'
import { FEATURE_REQUEST_OPEN_FULL_LABEL } from '../../headless/utils/featureRequestViewConstants'

export type FeatureRequestDecisionProps = {
  request: FeatureRequest
  /** The asking project's name. */
  fromLabel: string
  /** Accept the request — the work starts in the request's chat. The host owns the call. */
  onAccept: () => void
  /** Reject the request, with the reason the person typed (none when blank). */
  onReject: (reason?: string) => void
  /** A decision is on its way — the buttons wait. */
  busy?: boolean
  /** Why the last decision did not go through. */
  error?: string
  /** The story the work was placed on, once accepted; `onOpen` opens it. */
  placedOn?: { label: string; onOpen?: () => void }
  /** Open the whole request — offered beside the decision when given. */
  onOpenFull?: () => void
}

function OpenFull({ onOpenFull }: Pick<FeatureRequestDecisionProps, 'onOpenFull'>) {
  return onOpenFull ? (
    <Button size="sm" variant="ghost" className="ml-auto" onClick={onOpenFull}>
      {FEATURE_REQUEST_OPEN_FULL_LABEL}
    </Button>
  ) : null
}

function Pending({
  fromLabel,
  onAccept,
  onReject,
  busy,
  onOpenFull,
}: Omit<FeatureRequestDecisionProps, 'request' | 'error' | 'placedOn'>) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  if (confirming) {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) p-3">
        <label className="flex flex-col gap-1.5 text-[13px] text-(--status-stuck-soft-fg)">
          {featureRequestRejectPrompt(fromLabel)}
          <Textarea
            rows={2}
            value={reason}
            placeholder="Optional reason"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Keep it
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onReject(reason.trim() || undefined)}
            disabled={busy}
          >
            Reject request
          </Button>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" onClick={onAccept} disabled={busy}>
          Accept &amp; start work
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)} disabled={busy}>
          Reject…
        </Button>
        <OpenFull onOpenFull={onOpenFull} />
      </div>
      <div className="text-[12px] leading-normal text-(--text-secondary)">
        {featureRequestAcceptHint(fromLabel)}
      </div>
    </>
  )
}

/**
 * What the person does with a request, or what became of it: Accept & start work / Reject… (with
 * an optional reason, confirmed in place) while it waits; the story it was placed on and how the
 * work stands once accepted; who was told once rejected. Purely presentational.
 */
export default function FeatureRequestDecision(props: FeatureRequestDecisionProps) {
  const { request, fromLabel, error, placedOn, onOpenFull } = props
  const status = featureRequestStatusView(request.status)
  return (
    <>
      {status.phase === 'pending' ? (
        <Pending {...props} />
      ) : status.phase === 'accepted' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          <IconCheckCircle className="h-4.5 w-4.5 text-(--status-done-fg)" />
          <span className="font-semibold text-(--text-primary)">Accepted</span>
          {placedOn ? (
            <>
              <span className="text-(--text-secondary)">· placed on</span>
              <button
                type="button"
                disabled={!placedOn.onOpen}
                onClick={placedOn.onOpen}
                className="rounded-lg border border-(--border-subtle) px-2 py-0.5 text-(--text-primary) enabled:hover:bg-(--surface-hover)"
              >
                {placedOn.label}
              </button>
            </>
          ) : null}
          <span
            className="rounded-full px-2 text-[11.5px] font-semibold leading-4.5"
            style={{
              background: `var(--status-${status.tone}-soft-bg)`,
              color: `var(--status-${status.tone}-soft-fg)`,
            }}
          >
            {status.label}
          </span>
          <OpenFull onOpenFull={onOpenFull} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-[13px] text-(--text-secondary)">
          <div className="flex flex-wrap items-center gap-2.5">
            <IconXCircle className="h-4.5 w-4.5 text-(--status-stuck-fg)" />
            <span>
              <b className="text-(--text-primary)">Rejected</b> ·{' '}
              {featureRequestRejectedLine(fromLabel)}
            </span>
            <OpenFull onOpenFull={onOpenFull} />
          </div>
          {request.rejectionReason ? (
            <span className="pl-7 italic">“{request.rejectionReason}”</span>
          ) : null}
        </div>
      )}
      {error ? <div className="text-[12px] text-(--status-stuck-fg)">{error}</div> : null}
    </>
  )
}
