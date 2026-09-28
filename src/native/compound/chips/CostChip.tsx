import { useMemo, useState } from 'react'
import { Pressable, Text, View, type StyleProp, type TextStyle } from 'react-native'

import { costDetailsView, type CostSource } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CostDetailsSheet from './CostDetailsSheet'

export interface CostChipProps {
  /** The chip's words: the charge in dollars (`$1.25`, `$0.00`, `$1.50 of $5.00`) — never tokens. */
  label: string
  /** The cost behind the label. The chip opens its details whenever there are any. */
  cost?: CostSource
  /** What the cost is of, heading its details sheet — "Spent against the cap". */
  title?: string
  /** `pill` — the neutral cost chip; `text` — inline text, for a meta line. */
  appearance?: 'pill' | 'text'
  /** The text look for `appearance="text"`, matching the line it sits in. */
  textStyle?: StyleProp<TextStyle>
}

/**
 * A cost, as a chip: the charge in dollars, and the way into everything else.
 * The native peer of the web `CostChip` — a press opens the details in a
 * sheet, the touch analogue of the web popover, so a token count never has to
 * ride on the chip itself.
 */
export default function CostChip({
  label,
  cost,
  title,
  appearance = 'pill',
  textStyle,
}: CostChipProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const view = useMemo(() => costDetailsView(cost), [cost])
  const face =
    appearance === 'pill' ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.overlay,
        }}
      >
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }}
          aria-hidden
        />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '500',
            color: theme.text.secondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {label}
        </Text>
      </View>
    ) : (
      <Text style={[{ fontVariant: ['tabular-nums'] }, textStyle]}>{label}</Text>
    )
  if (!view) return face
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Show cost details`}
      >
        {face}
      </Pressable>
      <CostDetailsSheet isOpen={open} onClose={() => setOpen(false)} view={view} title={title} />
    </>
  )
}
