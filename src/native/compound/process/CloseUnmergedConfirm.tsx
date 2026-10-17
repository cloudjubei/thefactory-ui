import { Text, View } from 'react-native'

import { PROCESS_CLOSE_UNMERGED_CONFIRM_COPY } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export type CloseUnmergedConfirmProps = {
  onConfirm: () => void
  onCancel: () => void
}

/** "Close without merging?" — what closing a run does, asked before it does it. */
export default function CloseUnmergedConfirm({ onConfirm, onCancel }: CloseUnmergedConfirmProps) {
  const { theme } = useNativeTheme()
  return (
    <Modal isOpen onClose={onCancel} title={PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.title}>
      <View style={{ gap: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.body}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button size="sm" variant="ghost" onPress={onCancel}>
            {PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.cancel}
          </Button>
          <Button size="sm" variant="danger" onPress={onConfirm}>
            {PROCESS_CLOSE_UNMERGED_CONFIRM_COPY.confirm}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
