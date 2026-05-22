import { useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export interface ImageViewerProps {
  /** Raw-bytes URL for the image. */
  uri: string
  /** Auth / other headers forwarded to the image request. */
  headers?: Record<string, string>
}

/**
 * Native peer of web's image preview. RN's `Image` fetches the URL directly
 * (with the auth `headers`), so no blob round-trip is needed. The image is
 * contained within the available space.
 */
export default function ImageViewer({ uri, headers }: ImageViewerProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: nativeSpace[4],
        backgroundColor: nativeLightTheme.surface.muted,
      }}
    >
      {state === 'loading' ? <ActivityIndicator /> : null}
      {state === 'error' ? (
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>
          Could not load image.
        </Text>
      ) : null}
      <Image
        source={{ uri, headers }}
        resizeMode="contain"
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        style={{
          width: '100%',
          height: '100%',
          opacity: state === 'ready' ? 1 : 0,
          position: state === 'ready' ? 'relative' : 'absolute',
        }}
      />
    </View>
  )
}
