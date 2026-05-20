import { ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export interface UsageModelRow {
  model: string
  /** Total cost for this model, in USD. */
  costUSD: number
  /** Optional token breakdown. */
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
}

export interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
  /** Cost summary, grouped by model. */
  rows: ReadonlyArray<UsageModelRow>
  /** Total across all models. */
  totalCostUSD: number
  title?: string
}

function formatUSD(n: number) {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toFixed(4)}`
}

function formatTokens(n?: number) {
  if (n == null) return '—'
  return n.toLocaleString()
}

/**
 * Native peer of [web's `UsageModal`](../../../web/compound/UsageModal.tsx).
 * Cost + token breakdown per model. Hosts compute the rows via
 * `computeAgentRunUsage` from `thefactory-ui/headless` (or equivalent
 * chat-side accounting).
 */
export default function UsageModal({
  isOpen,
  onClose,
  rows,
  totalCostUSD,
  title = 'Usage & cost',
}: UsageModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button onPress={onClose}>Close</Button>
        </View>
      }
    >
      <ScrollView style={{ maxHeight: 480 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: nativeSpace[2],
            borderBottomWidth: 1,
            borderBottomColor: nativeLightTheme.border.subtle,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600' }}>Total</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: nativeLightTheme.accent.primary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatUSD(totalCostUSD)}
          </Text>
        </View>
        {rows.length === 0 ? (
          <Text
            style={{
              fontSize: 13,
              color: nativeLightTheme.text.muted,
              paddingVertical: nativeSpace[3],
              textAlign: 'center',
            }}
          >
            No usage recorded yet.
          </Text>
        ) : (
          rows.map((row) => (
            <View
              key={row.model}
              style={{
                paddingVertical: nativeSpace[2],
                borderBottomWidth: 1,
                borderBottomColor: nativeLightTheme.border.subtle,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                  {row.model}
                </Text>
                <Text style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>
                  {formatUSD(row.costUSD)}
                </Text>
              </View>
              {(row.inputTokens != null || row.outputTokens != null) && (
                <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted, marginTop: 2 }}>
                  in {formatTokens(row.inputTokens)} · out {formatTokens(row.outputTokens)}
                  {row.cachedTokens != null ? ` · cached ${formatTokens(row.cachedTokens)}` : ''}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Modal>
  )
}
