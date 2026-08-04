import { Text, View } from 'react-native'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { Button } from '../primitives/Button'

const AMBER = '#d97706'

export interface FeatureRequestIntroPanelProps {
  /** The sending project (A). */
  fromProjectId?: string
  title?: string
  description?: string
  /** A → B → A deadlock flagged at emit (D.5) — surfaced as a warning, never blocking. */
  cycle?: boolean
  /** Accept the request — starts the work run in this same chat. Host owns the call. */
  onAccept: () => void
  /** Decline the request. */
  onReject: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
}

/**
 * Native peer of web's `FeatureRequestIntroPanel` — the centered Accept/Reject call-to-action shown
 * in a receiver-side `FEATURE_REQUEST` chat while it is still `pending` (via
 * `ChatBody.emptyStateContent`). Purely presentational.
 */
export function FeatureRequestIntroPanel({
  fromProjectId,
  title,
  description,
  cycle,
  onAccept,
  onReject,
  busy,
}: FeatureRequestIntroPanelProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        marginTop: nativeSpace[6],
        alignSelf: 'center',
        maxWidth: 560,
        width: '100%',
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        padding: nativeSpace[5],
        gap: nativeSpace[2],
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.secondary,
        }}
      >
        Incoming feature request{fromProjectId ? ` · from ${fromProjectId}` : ''}
      </Text>

      {title ? (
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>{title}</Text>
      ) : null}

      {description ? (
        <Text style={{ fontSize: 13, lineHeight: 19, color: theme.text.secondary }}>
          {description}
        </Text>
      ) : null}

      {cycle ? (
        <Text style={{ fontSize: 12, color: AMBER }}>
          ⚠ This project is already waiting on the requester — accepting may deadlock.
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          marginTop: nativeSpace[2],
        }}
      >
        <Button size="sm" variant="primary" onPress={onAccept} disabled={busy}>
          Accept &amp; start work
        </Button>
        <Button size="sm" variant="ghost" onPress={onReject} disabled={busy}>
          Reject
        </Button>
      </View>
    </View>
  )
}
