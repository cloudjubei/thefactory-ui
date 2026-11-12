import { View } from 'react-native'
import FileTree, { type FileTreeEntry } from '../../src/native/compound/files/FileTree'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { FILE_TREE_FILES_ONLY, FILE_TREE_WITH_EMPTY_FOLDERS } from '../scenes/fileTreeFixtures'
import type { NativeView } from './views'

const noop = () => undefined

function Tree({ files }: { files: FileTreeEntry[] }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        maxWidth: 384,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        padding: 8,
      }}
    >
      <FileTree files={files} defaultExpandedDepth={2} onSelectFile={noop} />
    </View>
  )
}

/** `?state=empty-folders` (default) or `?state=files-only` — same fixtures as the web scene. */
function FileTreePanel({ state }: { state: string | null }) {
  const files = state === 'files-only' ? FILE_TREE_FILES_ONLY : FILE_TREE_WITH_EMPTY_FOLDERS
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      <Tree files={files} />
    </View>
  )
}

export const FILE_TREE_VIEWS: readonly NativeView[] = [
  {
    id: 'file-tree',
    title: 'Files tree (?state=empty-folders|files-only)',
    render: (address) => <FileTreePanel state={address.get('state')} />,
  },
]
