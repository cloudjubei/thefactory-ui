import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { CHAT_CONTEXT_FILL_COPY, type ChatContextFillView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import ContextFillBody from './ContextFillBody'
import { useContextFillColors } from './contextFillColors'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

/** `meter` — a small bar and the share; `ring` — a small ring and the share; `words` — "Context" and the share. */
export type ContextFillChipAppearance = 'meter' | 'ring' | 'words'

export interface ContextFillChipProps {
  /** The fill and Compact now, from `useChatHeaderView`. */
  view: ChatContextFillView
  appearance?: ContextFillChipAppearance
}

function Ring({ view }: { view: ChatContextFillView }) {
  const { theme } = useNativeTheme()
  const colors = useContextFillColors()
  const radius = 5
  const round = 2 * Math.PI * radius
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2.5}
        stroke={theme.border.default}
      />
      <Circle
        cx={7}
        cy={7}
        r={radius}
        fill="none"
        strokeWidth={2.5}
        stroke={colors[view.level]}
        strokeDasharray={`${(round * (view.percent ?? 0)) / 100} ${round}`}
      />
    </Svg>
  )
}

function Meter({ view }: { view: ChatContextFillView }) {
  const { theme } = useNativeTheme()
  const colors = useContextFillColors()
  return (
    <View
      style={{
        width: 24,
        height: 6,
        borderRadius: nativeRadii.round,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${view.percent ?? 0}%`,
          backgroundColor: colors[view.level],
        }}
      />
    </View>
  )
}

/**
 * How full a chat's working context is, as a chip in its header. The native
 * peer of the web `ContextFillChip`: a press opens the fill and Compact now in a
 * sheet, the touch analogue of the web popover.
 */
export default function ContextFillChip({ view, appearance = 'meter' }: ContextFillChipProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const shared = view.percent !== undefined
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={CHAT_CONTEXT_FILL_COPY.chipLabel(view.label)}
      >
        <View
          style={[chipPillStyle(theme), { gap: nativeSpace[2], paddingVertical: nativeSpace[1] }]}
        >
          {appearance === 'meter' && shared ? <Meter view={view} /> : null}
          {appearance === 'ring' && shared ? <Ring view={view} /> : null}
          {appearance === 'words' && shared ? (
            <Text style={[chipPillTextStyle(theme), { color: theme.text.muted }]}>
              {CHAT_CONTEXT_FILL_COPY.title}
            </Text>
          ) : null}
          <Text style={[chipPillTextStyle(theme), { fontVariant: ['tabular-nums'] }]}>
            {view.label}
          </Text>
        </View>
      </Pressable>
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={CHAT_CONTEXT_FILL_COPY.title}
      >
        <View style={{ paddingHorizontal: nativeSpace[4], paddingBottom: nativeSpace[5] }}>
          <ContextFillBody view={view} />
        </View>
      </BottomSheet>
    </>
  )
}
