import { useState } from 'react'
import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native'

import type { ProcessTimeDetailsView } from '../../../headless'
import DurationPill from '../chat/signoff/DurationPill'
import TimeDetailsSheet from './TimeDetailsSheet'

export interface DurationChipProps {
  /** The total, as a duration: `22m 58s`. */
  label: string
  /** Where the time went. A long press opens it whenever there is one. */
  details?: ProcessTimeDetailsView
  /** What the time is of, heading its details sheet. */
  title?: string
  /** `pill` — the blue duration pill; `text` — inline text, for a meta line. */
  appearance?: 'pill' | 'text'
  /** The text look for `appearance="text"`, matching the line it sits in. */
  textStyle?: StyleProp<TextStyle>
}

/**
 * A time worked, as a chip: the total, and the way into where it went. The
 * native peer of the web `DurationChip` — a long press opens the split in a
 * sheet, the touch analogue of the web hover, so a press on the row it sits in
 * still does what it always did.
 */
export default function DurationChip({
  label,
  details,
  title,
  appearance = 'pill',
  textStyle,
}: DurationChipProps) {
  const [open, setOpen] = useState(false)
  const face =
    appearance === 'pill' ? (
      <DurationPill label={label} />
    ) : (
      <Text style={[{ fontVariant: ['tabular-nums'] }, textStyle]}>{label}</Text>
    )
  if (!details) return face
  return (
    <>
      <Pressable
        onLongPress={() => setOpen(true)}
        delayLongPress={300}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Long press for where the time went`}
        accessibilityActions={[{ name: 'longpress', label: 'Show where the time went' }]}
        onAccessibilityAction={() => setOpen(true)}
      >
        {face}
      </Pressable>
      <TimeDetailsSheet isOpen={open} onClose={() => setOpen(false)} view={details} title={title} />
    </>
  )
}
