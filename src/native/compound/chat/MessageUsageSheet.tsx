import { useMemo } from 'react'
import { Text, View } from 'react-native'
import BottomSheet from '../../primitives/BottomSheet'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'
import { costDetailsView, messageUsageCost } from '../../../headless/utils/costDetails'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CostDetailsBody from '../chips/CostDetailsBody'

export interface MessageUsageSheetProps {
  isOpen: boolean
  onClose: () => void
  message?: ChatMessageLike | null
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
 * Per-message usage bottom sheet — the touch analogue of web's hover-revealed
 * usage tooltip. Tapping the `$` chip on an assistant message opens the same
 * cost details every cost chip opens, so a CLI turn covered by a subscription
 * reads as included — not as `$0.0000`, and never as a missing price.
 */
export default function MessageUsageSheet({ isOpen, onClose, message }: MessageUsageSheetProps) {
  const { theme } = useNativeTheme()
  const usage = message?.usage
  const view = useMemo(
    () => (usage ? costDetailsView(messageUsageCost(usage, message?.model)) : undefined),
    [usage, message?.model],
  )
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
        {view ? <CostDetailsBody view={view} /> : null}
        {durationMs ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingTop: nativeSpace[2],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Duration</Text>
            <Text
              style={{ fontSize: 13, color: theme.text.primary, fontVariant: ['tabular-nums'] }}
            >
              {fmtDurationMs(durationMs)}
            </Text>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  )
}
