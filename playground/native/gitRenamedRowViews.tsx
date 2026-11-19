import { Text, View } from 'react-native'
import GitFileRow from '../../src/native/compound/git/GitFileRow'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { GIT_RENAMED_ROWS } from '../fixtures/gitRenamedRows'
import type { NativeView } from './views'

const noop = () => {}

function StagedRenames({ width }: { width: number }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ width, maxWidth: '100%', backgroundColor: theme.surface.raised }}>
      <Text style={{ padding: 8, fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
        Staged files
      </Text>
      {GIT_RENAMED_ROWS.map((file) => (
        <GitFileRow key={file.path} file={file} checked onToggle={noop} onReset={noop} />
      ))}
    </View>
  )
}

export const GIT_RENAMED_ROW_VIEWS: NativeView[] = [
  {
    id: 'git-renamed-rows',
    title: 'Renamed files',
    render: (address) => <StagedRenames width={address.get('state') === 'narrow' ? 320 : 640} />,
  },
]
