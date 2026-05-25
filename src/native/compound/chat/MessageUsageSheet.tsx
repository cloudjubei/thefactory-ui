import { Text, View } from 'react-native'
import BottomSheet from '../../primitives/BottomSheet'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface MessageUsageSheetProps {
  isOpen: boolean
  onClose: () => void
  message?: ChatMessageLike | null
}

// Mirrors web's `USD = new Intl.NumberFormat(...)` in `MessageRow.tsx` —
// always 4 decimal places, currency-formatted, en-US locale. Centralising
// the formatter here keeps mobile + web rendering the same cost string
// regardless of magnitude.
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})
function fmtUSD(n?: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return USD.format(n)
}
function fmtTokens(n?: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString()
}
function fmtDurationMs(ms?: number): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  return `${m}m ${rem.toFixed(0)}s`
}

/**
 * Per-message usage bottom sheet — the touch analogue of web's
 * hover-revealed usage tooltip. Tapping the `$` chip on an assistant
 * message opens this sheet with the full cost / token breakdown for that
 * single message.
 */
export default function MessageUsageSheet({ isOpen, onClose, message }: MessageUsageSheetProps) {
  const { theme } = useNativeTheme()
  const usage = message?.usage
  const rawModel = usage?.model ?? message?.model
  const provider = typeof rawModel === 'object' ? rawModel?.provider : undefined
  const model = typeof rawModel === 'string' ? rawModel : rawModel?.model
  const modelLabel = provider && model ? `${provider} · ${model}` : (model ?? '—')
  const cost = typeof usage?.cost === 'number' ? usage.cost : undefined
  const promptTokens = usage?.promptTokens
  const completionTokens = usage?.completionTokens
  const cachedTokens = usage?.cachedReadInputTokens
  const totalTokens =
    (promptTokens ?? 0) + (completionTokens ?? 0) + (cachedTokens ?? 0) || undefined
  const durationMs = message?.durationMs

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Message usage">
      <View
        style={{
          paddingHorizontal: nativeSpace[4],
          paddingBottom: nativeSpace[5],
          gap: nativeSpace[3],
        }}
      >
        <Row label="Model" value={modelLabel} />
        <Row label="Cost" value={fmtUSD(cost)} mono />
        <View
          style={{
            paddingTop: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            gap: nativeSpace[2],
          }}
        >
          <Row label="Total tokens" value={fmtTokens(totalTokens)} mono />
          <Row label="Prompt" value={fmtTokens(promptTokens)} mono />
          <Row label="Completion" value={fmtTokens(completionTokens)} mono />
          <Row label="Cached read" value={fmtTokens(cachedTokens)} mono />
        </View>
        {durationMs ? (
          <View
            style={{
              paddingTop: nativeSpace[2],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            <Row label="Duration" value={fmtDurationMs(durationMs)} mono />
          </View>
        ) : null}
      </View>
    </BottomSheet>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.text.primary,
          fontFamily: mono ? 'Menlo' : undefined,
          fontVariant: mono ? (['tabular-nums'] as ['tabular-nums']) : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  )
}

