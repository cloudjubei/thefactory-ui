import { Text, View } from 'react-native'
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { FeatureRequestCard, type FeatureRequestCardData } from './FeatureRequestCard'

export interface BackgroundTasksPanelProps {
  /** Every cross-project request, most-recently-updated first (account-global). */
  requests: FeatureRequestCardData[]
  /** Accept a pending request. Host owns the backend call. */
  onAccept?: (id: string) => void
  /** Reject a pending request. */
  onReject?: (id: string) => void
  /** The request currently mid accept/reject — its buttons disable. */
  busyId?: string
  /** Text shown when there are no requests. */
  emptyText?: string
}

/**
 * Native peer of web's `BackgroundTasksPanel` — a stack of cross-project
 * {@link FeatureRequestCard}s (from→to · status · accept/reject), account-global across every
 * project. Pure rendering; the host wraps it in a scroll view / pushed screen and supplies the
 * (already-mapped) rows + accept/reject callbacks.
 */
export function BackgroundTasksPanel({
  requests,
  onAccept,
  onReject,
  busyId,
  emptyText = 'No cross-project requests.',
}: BackgroundTasksPanelProps) {
  const { theme } = useNativeTheme()

  if (requests.length === 0) {
    return (
      <Text
        style={{
          textAlign: 'center',
          paddingVertical: nativeSpace[8],
          fontSize: 12,
          color: theme.text.secondary,
        }}
      >
        {emptyText}
      </Text>
    )
  }

  return (
    <View style={{ gap: nativeSpace[2] }}>
      {requests.map((r) => (
        <FeatureRequestCard
          key={r.id}
          request={r}
          busy={busyId === r.id}
          onAccept={onAccept ? () => onAccept(r.id) : undefined}
          onReject={onReject ? () => onReject(r.id) : undefined}
        />
      ))}
    </View>
  )
}
