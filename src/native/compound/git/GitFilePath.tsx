import { useState } from 'react'
import { Text, View } from 'react-native'
import { gitRenamePath, type GitRenamePathSource } from '../../../headless/utils/gitRenamePath'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Modal } from '../../primitives/Modal'
import { PathDisplay } from '../PathDisplay'

/** Use the row's existing press target for both opening the diff and revealing the full paths. */
export function useGitFilePath(file: GitRenamePathSource) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const rename = gitRenamePath(file)
  return {
    label: rename?.title,
    onLongPress: rename ? () => setOpen(true) : undefined,
    path: rename ? (
      <View style={{ flexDirection: 'row', alignItems: 'baseline', minWidth: 0, gap: 6 }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="head"
          style={{ maxWidth: '45%', fontSize: 12, fontFamily: 'Menlo', color: theme.text.muted }}
        >
          {rename.from}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>→</Text>
        <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <PathDisplay path={file.path} />
        </View>
      </View>
    ) : (
      <PathDisplay path={file.path} />
    ),
    details:
      rename && open ? (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Renamed file" size="sm">
          <Text selectable style={{ fontSize: 13, color: theme.text.primary }}>
            {rename.title}
          </Text>
        </Modal>
      ) : null,
  }
}
