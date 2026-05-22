import { useMemo } from 'react'
import { ScrollView, Text } from 'react-native'
import { Modal } from '../../primitives/Modal'
import Code from '../Code'
import { nativeLightTheme } from '../../../tokens/native'

export interface ChatDynamicContextModalProps {
  isOpen: boolean
  onClose: () => void
  /** The chat's persisted `dynamicContext` blob — formatted as JSON. */
  dynamicContext?: unknown
}

/**
 * Native peer of web's `ChatDynamicContextModal`. Dumps the chat's
 * `dynamicContext` blob as formatted JSON for inspection.
 */
export default function ChatDynamicContextModal({
  isOpen,
  onClose,
  dynamicContext,
}: ChatDynamicContextModalProps) {
  const formatted = useMemo(() => {
    if (dynamicContext == null) return undefined
    try {
      return JSON.stringify(dynamicContext, null, 2)
    } catch {
      return String(dynamicContext)
    }
  }, [dynamicContext])

  if (!isOpen) return null

  return (
    <Modal isOpen onClose={onClose} title="Dynamic context" size="lg">
      {formatted ? (
        <ScrollView style={{ maxHeight: 420 }}>
          <Code language="json" code={formatted} />
        </ScrollView>
      ) : (
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>
          No dynamic context available on this chat.
        </Text>
      )}
    </Modal>
  )
}
