import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../tokens/native'
// Spacing/radii tokens are integer-keyed objects (e.g. `nativeSpace[3]`), not callables.
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'
import { FEATURE_REQUEST_OPEN_FULL_LABEL } from '../../headless/utils/featureRequestViewConstants'
import { canSettleFeatureRequest } from '../../headless/utils/featureRequestView'
import type {
  FeatureRequestLinkView,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
} from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'
import { FeatureRequestSettleActions, FeatureRequestSettledNote } from './FeatureRequestSettle'
import { FeatureRequestStartAgain } from './FeatureRequestStartAgain'
import WorkLaunchChooser from './WorkLaunchChooser'
import { workLaunchOptions } from '../../headless/utils/workLaunchView'
import type { WorkLaunchMode } from 'thefactory-tools/types'

/** The cross-project feature-request lifecycle states (mirrors `FeatureRequestStatus`). */
export type FeatureRequestCardStatus =
  | 'pending'
  | 'rejected'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'handed_over'

/** Minimal shape this card renders — hosts pass the matching subset of the live `FeatureRequest`. */
export interface FeatureRequestCardData {
  id: string
  title?: string
  /** The receiving project (B). */
  targetProjectId: string
  /** The sending project (A). */
  fromProjectId?: string
  status: FeatureRequestCardStatus
  /** A → B → A deadlock detected at emit (D.5) — surfaced as a warning, never blocking. */
  cycleDetected?: boolean
  /** While its work and another request's wait on each other: who is in it and which side decides first — `featureRequestWaitCycleWarning`. */
  waitCycleWarning?: string
  /** The review branch B put the work on, once in review / completed. */
  reviewBranch?: string
  /** The request's summary (or, on an older request, its description). */
  summary?: string
  /** Its filled parts and their counts, e.g. "Done when 5 · Rules 3". */
  countsLine?: string
  /** Why B rejected it, when it said why. */
  rejectionReason?: string
  /** Why its work waits, while it is `blocked` — e.g. "2 of 3 features are blocked: …". */
  statusReason?: string
  /** What delivered it, or where its work was handed over, once settled elsewhere. */
  settled?: FeatureRequestSettledView
  /** The requests whose work this one took over. */
  takenOver?: FeatureRequestLinkView[]
}

const STATUS_LABEL: Record<FeatureRequestCardStatus, string> = {
  pending: 'Pending',
  rejected: 'Rejected',
  accepted: 'Accepted',
  in_progress: 'In progress',
  in_review: 'In review',
  blocked: 'Blocked',
  completed: 'Completed',
  failed: 'Failed',
  handed_over: 'Handed over',
}

/** Pill colour per status — amber (waiting) · blue (working) · violet (review) · green · red. */
const STATUS_COLOR: Record<FeatureRequestCardStatus, string> = {
  pending: '#d97706',
  accepted: '#2563eb',
  in_progress: '#2563eb',
  in_review: '#7c3aed',
  blocked: '#d97706',
  completed: '#16a34a',
  failed: '#dc2626',
  rejected: '#dc2626',
  handed_over: '#64748b',
}

export interface FeatureRequestCardProps {
  request: FeatureRequestCardData
  /**
   * Accept the request (shown only while `pending`), its work carried out the way the person
   * chose on the card. Host owns the backend call.
   */
  onAccept?: (mode: WorkLaunchMode) => void
  /** How work last started in the target project — offered first. */
  defaultMode?: WorkLaunchMode
  /** Reject the request (shown only while `pending`). */
  onReject?: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
  /** Open the whole request. Renders a link when provided. */
  onOpenFull?: () => void
  /** Mark the request delivered by other work — offered until it is settled, a rejected one included. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story — offered likewise. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  /** Start the work again — offered once it ended blocked or failed. */
  onStartAgain?: (mode: WorkLaunchMode) => void
  /** Open another request, from the links between requests handed over and taken over. */
  onOpenRequest?: (requestId: string) => void
  /** Opens a settle form at once, for a fixed showcase state. */
  initialSettleMode?: FeatureRequestSettleMode
  /** Extra slot rendered in the footer. */
  footer?: ReactNode
}

/**
 * Presentational cross-project feature-request card (React Native) — pure rendering, no contexts.
 * Native peer of web's `FeatureRequestCard`; the host looks the live record up and owns
 * accept/reject, passing them in as callbacks.
 */
export function FeatureRequestCard({
  request,
  onAccept,
  defaultMode,
  onReject,
  busy,
  onOpenFull,
  onMarkDelivered,
  onHandOver,
  onStartAgain,
  onOpenRequest,
  initialSettleMode,
  footer,
}: FeatureRequestCardProps) {
  const { theme } = useNativeTheme()
  const {
    title,
    targetProjectId,
    fromProjectId,
    status,
    cycleDetected,
    waitCycleWarning,
    reviewBranch,
    summary,
    countsLine,
    rejectionReason,
    statusReason,
    settled,
    takenOver,
  } = request
  const canDecide = status === 'pending' && (onAccept || onReject)
  const [choosing, setChoosing] = useState(false)
  const mono = { fontFamily: nativeFontFamilies.mono }

  return (
    <View
      style={{
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
        gap: nativeSpace[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>Feature request</Text>
        {fromProjectId ? (
          <Text style={{ fontSize: 11, color: theme.text.secondary, ...mono }}>
            {fromProjectId}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: theme.text.muted }}>→</Text>
        <Text style={{ fontSize: 11, color: theme.text.primary, ...mono }}>{targetProjectId}</Text>
        <View style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      {title ? <Text style={{ fontSize: 13, color: theme.text.primary }}>{title}</Text> : null}

      {summary ? (
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, lineHeight: 17, color: theme.text.secondary }}
        >
          {summary}
        </Text>
      ) : null}

      {countsLine ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{countsLine}</Text>
      ) : null}

      {status === 'rejected' && rejectionReason ? (
        <Text style={{ fontSize: 12, fontStyle: 'italic', color: theme.text.secondary }}>
          “{rejectionReason}”
        </Text>
      ) : null}

      {status === 'blocked' && statusReason ? (
        <Text style={{ fontSize: 12, color: '#d97706' }}>{statusReason}</Text>
      ) : null}

      {waitCycleWarning ? (
        <Text style={{ fontSize: 11, color: '#d97706' }}>⚠ {waitCycleWarning}</Text>
      ) : cycleDetected ? (
        <Text style={{ fontSize: 11, color: '#d97706' }}>
          ⚠ {targetProjectId} is already waiting on {fromProjectId ?? 'this project'} — this may
          deadlock.
        </Text>
      ) : null}

      <FeatureRequestSettledNote
        settled={settled}
        takenOver={takenOver}
        onOpenRequest={onOpenRequest}
      />

      {reviewBranch ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary, ...mono }}>{reviewBranch}</Text>
      ) : null}

      {choosing && onAccept && status === 'pending' ? (
        <WorkLaunchChooser
          options={workLaunchOptions({ workLaunchMode: defaultMode })}
          onChoose={onAccept}
          onCancel={() => setChoosing(false)}
          {...(busy !== undefined ? { busy } : {})}
        />
      ) : null}

      {(canDecide || onOpenFull || footer) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
          {canDecide ? (
            <>
              {onAccept ? (
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => setChoosing(true)}
                  disabled={busy}
                >
                  Accept
                </Button>
              ) : null}
              {onReject ? (
                <Button size="sm" variant="ghost" onPress={onReject} disabled={busy}>
                  Reject
                </Button>
              ) : null}
            </>
          ) : null}
          {onOpenFull ? (
            <Button size="sm" variant="link" onPress={onOpenFull}>
              {FEATURE_REQUEST_OPEN_FULL_LABEL}
            </Button>
          ) : null}
          {footer}
        </View>
      )}
      {onStartAgain && (status === 'blocked' || status === 'failed') ? (
        <FeatureRequestStartAgain
          failed={status === 'failed'}
          onStartAgain={onStartAgain}
          busy={busy}
        />
      ) : null}
      {canSettleFeatureRequest({ status }) ? (
        <FeatureRequestSettleActions
          fromLabel={fromProjectId ?? targetProjectId}
          onMarkDelivered={onMarkDelivered}
          onHandOver={onHandOver}
          busy={busy}
          initialMode={initialSettleMode}
        />
      ) : null}
    </View>
  )
}
