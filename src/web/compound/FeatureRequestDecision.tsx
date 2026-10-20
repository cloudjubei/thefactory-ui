import { useState } from 'react'
import type { FeatureRequest, WorkLaunchMode } from 'thefactory-tools/types'
import { workLaunchOptions } from '../../headless/utils/workLaunchView'
import { Button } from '../primitives/Button'
import { Textarea } from '../primitives/Textarea'
import { IconCheckCircle, IconXCircle } from '../icons'
import {
  canSettleFeatureRequest,
  canStartFeatureRequestAgain,
  canStartFeatureRequestWork,
  featureRequestAcceptHint,
  featureRequestPhase,
  featureRequestRejectedLine,
  featureRequestRejectPrompt,
  featureRequestSettledLine,
  featureRequestStatusView,
  featureRequestTakenOverLinks,
} from '../../headless/utils/featureRequestView'
import { FEATURE_REQUEST_OPEN_FULL_LABEL } from '../../headless/utils/featureRequestViewConstants'
import type { FeatureRequestSettleMode } from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'
import { FeatureRequestSettleActions, FeatureRequestSettledNote } from './FeatureRequestSettle'
import { FeatureRequestStartAgain } from './FeatureRequestStartAgain'
import { FeatureRequestStartWork } from './FeatureRequestStartWork'
import WorkLaunchChooser from './WorkLaunchChooser'

export type FeatureRequestDecisionProps = {
  request: FeatureRequest
  /** The asking project's name. */
  fromLabel: string
  /** Accept the request, its work carried out the way the person chose. The host owns the call. */
  onAccept: (mode: WorkLaunchMode) => void
  /** How work last started in the request's project — offered first. */
  defaultMode?: WorkLaunchMode
  /** Start the work of a request accepted for a process run whose launch card was left unconfirmed. */
  onStartWork?: (mode: WorkLaunchMode) => void
  /** Opens the choice of how to start the work at once, for a fixed showcase state. */
  initialChoosing?: boolean
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
  /** Mark the request delivered by other work — offered while it can still be settled. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story — offered likewise. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  /** Start the work again, the way chosen — offered once it ended blocked or failed. */
  onStartAgain?: (mode: WorkLaunchMode) => void
  /** Another request's title, for the links between requests handed over and taken over. */
  requestTitle?: (requestId: string) => string | undefined
  /** Open another request, from those links. */
  onOpenRequest?: (requestId: string) => void
  /** Opens a settle form at once, for a fixed showcase state. */
  initialSettleMode?: FeatureRequestSettleMode
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
  defaultMode,
  initialChoosing,
}: Pick<
  FeatureRequestDecisionProps,
  'fromLabel' | 'onAccept' | 'onReject' | 'busy' | 'onOpenFull' | 'defaultMode' | 'initialChoosing'
>) {
  const [choosing, setChoosing] = useState(initialChoosing === true)
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
        <Button size="sm" variant="primary" onClick={() => setChoosing(true)} disabled={busy}>
          Accept &amp; start work
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)} disabled={busy}>
          Reject…
        </Button>
        <OpenFull onOpenFull={onOpenFull} />
      </div>
      {choosing ? (
        <WorkLaunchChooser
          options={workLaunchOptions({ workLaunchMode: defaultMode })}
          onChoose={onAccept}
          onCancel={() => setChoosing(false)}
          busy={busy}
        />
      ) : null}
      <div className="text-[12px] leading-normal text-(--text-secondary)">
        {featureRequestAcceptHint(fromLabel)}
      </div>
    </>
  )
}

/**
 * What the person does with a request, or what became of it: Accept & start work / Reject… (with
 * an optional reason, confirmed in place) while it waits; the story it was placed on and how the
 * work stands once accepted; who was told once rejected; where its work went once handed over.
 * Mark as delivered… and Hand over… stay offered until it is settled — a rejected request
 * included. Purely presentational.
 */
export default function FeatureRequestDecision(props: FeatureRequestDecisionProps) {
  const { request, fromLabel, error, placedOn, onOpenFull, busy } = props
  const status = featureRequestStatusView(request.status)
  const titleOf = props.requestTitle ?? (() => undefined)
  const settled = featureRequestSettledLine(request, titleOf)
  const takenOver = featureRequestTakenOverLinks(request, titleOf)
  const phase = featureRequestPhase(request)
  return (
    <>
      {phase === 'settled' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
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
      ) : phase === 'pending' ? (
        <Pending {...props} />
      ) : phase === 'accepted' ? (
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
      {props.onStartWork && canStartFeatureRequestWork(request) ? (
        <FeatureRequestStartWork
          onStartWork={props.onStartWork}
          {...(props.defaultMode ? { defaultMode: props.defaultMode } : {})}
          {...(busy !== undefined ? { busy } : {})}
        />
      ) : null}
      {props.onStartAgain && canStartFeatureRequestAgain(request) ? (
        <FeatureRequestStartAgain
          failed={request.status === 'failed'}
          onStartAgain={props.onStartAgain}
          {...(request.handling?.work ? { lastMode: request.handling.work.mode } : {})}
          busy={busy}
        />
      ) : null}
      <FeatureRequestSettledNote
        settled={settled}
        takenOver={takenOver}
        onOpenRequest={props.onOpenRequest}
      />
      {canSettleFeatureRequest(request) ? (
        <FeatureRequestSettleActions
          fromLabel={fromLabel}
          onMarkDelivered={props.onMarkDelivered}
          onHandOver={props.onHandOver}
          busy={busy}
          initialMode={props.initialSettleMode}
        />
      ) : null}
      {error ? <div className="text-[12px] text-(--status-stuck-fg)">{error}</div> : null}
    </>
  )
}
