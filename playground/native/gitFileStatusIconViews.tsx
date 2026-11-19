import { Text, View } from 'react-native'
import GitFileStatusIcon from '../../src/native/compound/git/GitFileStatusIcon'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import type { NativeView } from './views'

const STATES = [
  ['A', 'Added'],
  ['M', 'Modified'],
  ['D', 'Deleted'],
  ['R', 'Renamed'],
] as const

function FileStatusIcons() {
  const { theme } = useNativeTheme()
  return (
    <View style={{ padding: 16, gap: 24, backgroundColor: theme.surface.raised }}>
      {([16, 24] as const).map((size) => (
        <View key={size} style={{ gap: 12 }}>
          <Text style={{ color: theme.text.secondary }}>{size} px</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            {STATES.map(([status, label]) => (
              <View key={status} style={{ alignItems: 'center', gap: 8 }}>
                <GitFileStatusIcon status={status} size={size} />
                <Text style={{ color: theme.text.primary, fontSize: 12 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

export const GIT_FILE_STATUS_ICON_VIEWS: NativeView[] = [
  {
    id: 'git-file-status-icons',
    title: 'File status icons',
    render: () => <FileStatusIcons />,
  },
]
