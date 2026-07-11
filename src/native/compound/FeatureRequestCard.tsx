import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../tokens/native'
// Spacing/radii tokens are integer-keyed objects (e.g. `nativeSpace[3]`), not callables.
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'

/** The seven cross-project feature-request lifecycle states (mirrors `FeatureRequestStatus`). */
export type FeatureRequestCardStatus =
  | 'pending'
  | 'rejected'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'failed'

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
  /** The review branch B landed the work on, once in review / completed. */
  reviewBranch?: string
}

const STATUS_LABEL: Record<FeatureRequestCardStatus, string> = {
  pending: 'Pending',
  rejected: 'Rejected',
  accepted: 'Accepted',
  in_progress: 'In progress',
  in_review: 'In review',
  completed: 'Completed',
  failed: 'Failed',
}

/** Pill colour per status — amber (waiting) · blue (working) · violet (review) · green · red. */
const STATUS_COLOR: Record<FeatureRequestCardStatus, string> = {
  pending: '#d97706',
  accepted: '#2563eb',
  in_progress: '#2563eb',
  in_review: '#7c3aed',
  completed: '#16a34a',
  failed: '#dc2626',
  rejected: '#dc2626',
}

export interface FeatureRequestCardProps {
  request: FeatureRequestCardData
  /** Accept the request (shown only while `pending`). Host owns the backend call. */
  onAccept?: () => void
  /** Reject the request (shown only while `pending`). */
  onReject?: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
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
  onReject,
  busy,
  footer,
}: FeatureRequestCardProps) {
  const { theme } = useNativeTheme()
  const { title, targetProjectId, fromProjectId, status, cycleDetected, reviewBranch } = request
  const canDecide = status === 'pending' && (onAccept || onReject)
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

      {cycleDetected ? (
        <Text style={{ fontSize: 11, color: '#d97706' }}>
          ⚠ {targetProjectId} is already waiting on {fromProjectId ?? 'this project'} — this may
          deadlock.
        </Text>
      ) : null}

      {reviewBranch ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary, ...mono }}>{reviewBranch}</Text>
      ) : null}

      {(canDecide || footer) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
          {canDecide ? (
            <>
              {onAccept ? (
                <Button size="sm" variant="primary" onPress={onAccept} disabled={busy}>
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
          {footer}
        </View>
      )}
    </View>
  )
}
