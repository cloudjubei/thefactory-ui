import { useState } from 'react'
import { Text, View } from 'react-native'
import {
  PENDING_FILE_CHANGE_LABEL,
  pendingFileChangeActions,
  pendingFileChangeSummary,
  type PendingFileChange,
  type PendingFileChangeActions,
} from '../../../headless/utils/pendingFileChange'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconWarningTriangle } from '../../icons/IconWarningTriangle'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'

export function PendingFileChangeCallout({
  change,
  color,
  actions,
}: {
  change: PendingFileChange
  color: string
  actions?: PendingFileChangeActions
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const { headline, overlap, source } = pendingFileChangeSummary(change)
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        accessibilityLabel={PENDING_FILE_CHANGE_LABEL[change.kind]}
        accessibilityState={{ expanded: open }}
        hitSlop={4}
        onPress={() => setOpen(true)}
      >
        <IconWarningTriangle size={20} strokeColor={color} />
      </Button>
      <Modal size="sm" isOpen={open} onClose={() => setOpen(false)} title={headline}>
        <View style={{ gap: 8 }}>
          {overlap && <Text style={{ color: theme.text.secondary }}>{overlap}</Text>}
          {source && <Text style={{ color: theme.text.muted, fontSize: 12 }}>{source}</Text>}
          {pendingFileChangeActions(change).map((action) => {
            const run = actions?.[action.key]
            return (
              <Button
                key={action.key}
                size="sm"
                variant={'primary' in action ? 'primary' : 'secondary'}
                accessibilityHint={'detail' in action ? action.detail : undefined}
                disabled={!run || actions?.disabled}
                onPress={() => {
                  if (!run) return
                  setOpen(false)
                  run()
                }}
              >
                {action.label}
              </Button>
            )
          })}
        </View>
      </Modal>
    </>
  )
}
