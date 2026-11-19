import { Image, Text, View } from 'react-native'
import { REMOTE_BROWSER_TEXT, frameSrc, shortAddress } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type RemoteBrowserShareCardProps = {
  url: string
  frameData?: string
  agentDrives?: boolean
  onOpen?: () => void
}

/** Native peer of web's `RemoteBrowserShareCard`: the browser the agent shares, in its message. */
export default function RemoteBrowserShareCard({
  url,
  frameData,
  agentDrives = true,
  onOpen,
}: RemoteBrowserShareCardProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[3],
        padding: nativeSpace[2],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          width: 72,
          height: 46,
          borderRadius: 4,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
        }}
      >
        {frameData ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: frameSrc(frameData) }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}
        >
          {shortAddress(url)}
        </Text>
        {agentDrives ? <ToneBadge tone="running" label={REMOTE_BROWSER_TEXT.agentDrives} /> : null}
      </View>
      {onOpen ? (
        <Button variant="secondary" size="sm" onPress={onOpen}>
          {REMOTE_BROWSER_TEXT.open}
        </Button>
      ) : null}
    </View>
  )
}
