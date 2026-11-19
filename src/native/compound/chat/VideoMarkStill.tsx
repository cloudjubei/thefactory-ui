import { Image, View } from 'react-native'

import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconVideo } from '../../icons'

/** The still a mark is shown by, 48 by 28; the video's glyph until the timeline is read. */
export default function VideoMarkStill({ url }: { url: string | undefined }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        width: 48,
        height: 28,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.muted,
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <IconVideo size={14} color={theme.text.muted} />
      )}
    </View>
  )
}
