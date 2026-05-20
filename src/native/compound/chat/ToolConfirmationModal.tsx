import { ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../../tokens/native'

export interface ToolConfirmationModalProps {
  isOpen: boolean
  /** Cancel / dismiss — equivalent to "reject". */
  onClose: () => void
  /** Tool name (e.g. `git_commit`, `bash`). */
  toolName: string
  /** Optional one-line description. */
  toolDescription?: string
  /** Pretty-printed JSON args. */
  argsJson: string
  /** Optional warning (e.g. "this tool writes files"). */
  warning?: string
  onApprove: () => void
  onReject: () => void
  /** Suppress the "Always allow" button when the tool is one-off. */
  showAlwaysAllow?: boolean
  onAlwaysAllow?: () => void
}

/**
 * Native peer of
 * [web's `ToolConfirmationModal`](../../../web/compound/chat/ToolConfirmationModal.tsx).
 * Shows the pending tool call with its args, a Reject + Approve action,
 * and an optional "Always allow" affordance that the host wires to its
 * tool-trust store.
 */
export default function ToolConfirmationModal({
  isOpen,
  onClose,
  toolName,
  toolDescription,
  argsJson,
  warning,
  onApprove,
  onReject,
  showAlwaysAllow = false,
  onAlwaysAllow,
}: ToolConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tool call requires approval"
      size="lg"
      footer={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: nativeSpace[2],
            flexWrap: 'wrap',
          }}
        >
          <Button variant="ghost" onPress={onReject}>
            Reject
          </Button>
          {showAlwaysAllow && onAlwaysAllow && (
            <Button variant="secondary" onPress={onAlwaysAllow}>
              Always allow
            </Button>
          )}
          <Button onPress={onApprove}>Approve</Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <View>
          <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>Tool</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: nativeLightTheme.text.primary,
              marginTop: 2,
            }}
          >
            {toolName}
          </Text>
          {toolDescription ? (
            <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary, marginTop: 4 }}>
              {toolDescription}
            </Text>
          ) : null}
        </View>

        {warning ? (
          <View
            style={{
              padding: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor: '#fef3c7',
              borderWidth: 1,
              borderColor: '#fde68a',
            }}
          >
            <Text style={{ fontSize: 12, color: '#78350f' }}>{warning}</Text>
          </View>
        ) : null}

        <View>
          <Text style={{ fontSize: 13, color: nativeLightTheme.text.muted }}>Args</Text>
          <ScrollView
            style={{
              maxHeight: 280,
              marginTop: 4,
              padding: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor: nativeLightTheme.surface.muted,
            }}
          >
            <Text
              selectable
              style={{
                fontFamily: 'Courier',
                fontSize: 12,
                color: nativeLightTheme.text.primary,
              }}
            >
              {argsJson}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
