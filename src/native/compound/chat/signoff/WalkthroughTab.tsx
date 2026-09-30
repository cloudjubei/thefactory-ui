import { Text, View } from 'react-native'

import { formatBytes, type EvidenceTile } from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type WalkthroughTabProps = {
  recordings: readonly EvidenceTile[]
}

function Recording({ tile }: { tile: EvidenceTile }) {
  const { theme } = useNativeTheme()
  const size = formatBytes(tile.ref.bytes)
  return (
    <View
      style={{
        gap: 8,
        padding: 10,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {tile.caption}
      </Text>
      <View
        style={{
          height: 210,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingHorizontal: 16,
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: theme.border.default,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
        }}
      >
        <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
          {`Recording · ${tile.ref.mediaType}${size ? ` · ${size}` : ''}`}
        </Text>
        <Text style={{ fontSize: 11, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
          Filed as evidence on this run. This app cannot play it yet — open the run on the web or
          desktop client to watch it.
        </Text>
      </View>
    </View>
  )
}

/**
 * The verifier's screen recordings — proof of the PATH through the app, not
 * just its screens. Without a video component in this package the recording is
 * named, sized and located rather than played; its bytes are not fetched, so
 * a long capture never lands on the phone's heap for nothing.
 */
export default function WalkthroughTab({ recordings }: WalkthroughTabProps) {
  return (
    <View style={{ gap: 8 }}>
      {recordings.map((tile) => (
        <Recording key={tile.ref.id} tile={tile} />
      ))}
    </View>
  )
}
