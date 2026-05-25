import { useMemo } from 'react'
import { ScrollView, Text } from 'react-native'
import { Modal } from '../../primitives/Modal'
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
        // Match web's `<pre className="whitespace-pre-wrap font-mono">` —
        // plain monospace text on the modal's own background, no `Code`
        // block tint behind it.
        <ScrollView style={{ maxHeight: 420 }}>
          <Text
            selectable
            style={{
              fontFamily: 'Menlo',
              fontSize: 12,
              lineHeight: 20,
              color: nativeLightTheme.text.secondary,
            }}
          >
            {formatted}
          </Text>
        </ScrollView>
      ) : (
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>
          No dynamic context available on this chat.
        </Text>
      )}
    </Modal>
  )
}
