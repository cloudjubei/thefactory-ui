import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  SUPERSEDED_FILINGS_LABEL,
  SUPERSEDED_FILINGS_NOTE,
  supersededFilingsSummary,
  type EvidenceTile,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronDown } from '../../icons'
import Markdown from '../Markdown'

export type SupersededFilingsProps = {
  filings: readonly EvidenceTile[]
  /** Start open. The product starts closed; a showcase state opens it. */
  defaultOpen?: boolean
}

/**
 * Filings a later try replaced. Closed, they are one labelled row under the
 * current filings. Open, each stays labelled and its text can be read.
 */
export default function SupersededFilings({
  filings,
  defaultOpen = false,
}: SupersededFilingsProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  if (filings.length === 0) return null
  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={SUPERSEDED_FILINGS_LABEL}
        onPress={() => setOpen((value) => !value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {SUPERSEDED_FILINGS_LABEL}
        </Text>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>
          {supersededFilingsSummary(filings)}
        </Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <IconChevronDown size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open ? (
        <View
          style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.border.subtle, padding: 12 }}
        >
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{SUPERSEDED_FILINGS_NOTE}</Text>
          {filings.map((filing) => (
            <View
              key={filing.ref.id}
              style={{
                gap: 6,
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.raised,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: theme.text.muted,
                  }}
                >
                  {SUPERSEDED_FILINGS_LABEL}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
                >
                  {filing.caption}
                </Text>
              </View>
              {filing.text ? <Markdown text={filing.text} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
