import { View } from 'react-native'
import { REMOTE_BROWSER_TEXT } from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconGlobe } from '../../icons'
import IconButton from '../../primitives/IconButton'

export type RemoteBrowserButtonProps = {
  open: boolean
  onToggle: () => void
  /** The chat's agent has a browser open: a dot says so until it shows. */
  agentShares?: boolean
}

/** Native peer of web's `RemoteBrowserButton`: where a chat opens its browser. */
export default function RemoteBrowserButton({
  open,
  onToggle,
  agentShares = false,
}: RemoteBrowserButtonProps) {
  const { theme, status } = useNativeTheme()
  return (
    <View>
      <IconButton
        accessibilityLabel={REMOTE_BROWSER_TEXT.openLabel}
        onPress={onToggle}
        style={open ? { backgroundColor: theme.accent.softBg } : undefined}
      >
        <IconGlobe />
      </IconButton>
      {agentShares && !open ? (
        <View
          accessibilityLabel={REMOTE_BROWSER_TEXT.agentDrives}
          style={{
            position: 'absolute',
            right: 2,
            top: 2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: status.running.bg,
          }}
        />
      ) : null}
    </View>
  )
}
