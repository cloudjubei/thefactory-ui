import { Image, View } from 'react-native'
import { designSourceFileName, designViewKind, type DesignShown } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconExternalLink } from '../../icons'
import FileTypeIcon from '../files/FileTypeIcon'
import { DESIGN_THUMB_ASPECT, DESIGN_THUMB_FRAME } from './designNativeConstants'
import { useDesignHost } from './DesignHostContext'

export type DesignFileThumbProps = {
  shown: DesignShown
  /** The file with a view token; `undefined` while the token is minted. */
  src: string | undefined
  /** Box width; the height follows at 4:3. */
  width?: number
}

/**
 * Native peer of web's `DesignFileThumb`: a design file in miniature — an
 * image, a page drawn small and still through the host's web view, else the
 * icon of its type.
 */
export default function DesignFileThumb({ shown, src, width = 96 }: DesignFileThumbProps) {
  const { theme } = useNativeTheme()
  const { renderPage } = useDesignHost()
  const kind = designViewKind(shown.source)
  const height = Math.round(width * DESIGN_THUMB_ASPECT)
  const box = {
    width,
    height,
    overflow: 'hidden' as const,
    borderRadius: nativeRadii[2],
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.surface.muted,
  }
  if (src && kind === 'image') {
    return (
      <View style={box}>
        <Image
          source={{ uri: src }}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    )
  }
  if (src && kind === 'html' && renderPage) {
    const scale = width / DESIGN_THUMB_FRAME.width
    return (
      <View style={box} pointerEvents="none">
        <View
          style={{
            width: DESIGN_THUMB_FRAME.width,
            height: height / scale,
            backgroundColor: '#ffffff',
            transformOrigin: 'top left',
            transform: [{ scale }],
          }}
        >
          {renderPage(src, { interactive: false })}
        </View>
      </View>
    )
  }
  return (
    <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
      {kind === 'link' ? (
        <IconExternalLink size={Math.round(width / 4)} color={theme.text.muted} />
      ) : (
        <FileTypeIcon path={designSourceFileName(shown.source)} size={Math.round(width / 3)} />
      )}
    </View>
  )
}
