import { Text, View } from 'react-native'

import type { CodeReviewTone } from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { reviewToneVariant } from './tones'

/** A small soft status pill in a review tone — bold for a verdict. */
export default function Pill({
  tone,
  label,
  bold = false,
}: {
  tone: CodeReviewTone
  label: string
  bold?: boolean
}) {
  const { status } = useNativeTheme()
  const v = reviewToneVariant(tone, status)
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: bold ? v.bg : v.softBorder,
        backgroundColor: bold ? v.bg : v.softBg,
        paddingHorizontal: bold ? 10 : 7,
        paddingVertical: bold ? 3 : 1,
      }}
    >
      <Text style={{ fontSize: bold ? 12 : 11, fontWeight: '600', color: bold ? v.fg : v.softFg }}>
        {label}
      </Text>
    </View>
  )
}
