import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  SIBLING_FALLBACK_PENDING_LABEL,
  useSiblingFallbackNotice,
  type SiblingFallbackView,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type SiblingFallbackNoticeProps = {
  view: SiblingFallbackView
  /** Set once a newer checks attempt ran: the notice is history, said so in one line. */
  superseded?: string
  /** Leave out the host's sentence where the surrounding line already says it. */
  hideMessage?: boolean
}

/** Native peer of web's `SiblingFallbackNotice`. */
export default function SiblingFallbackNotice({
  view,
  superseded,
  hideMessage = false,
}: SiblingFallbackNoticeProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const tone = status[superseded ? 'empty' : view.tone]
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={view.title}
      style={{
        gap: 6,
        borderWidth: 1,
        borderColor: tone.softBorder,
        backgroundColor: tone.softBg,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: tone.softFg }}>{view.title}</Text>
      {superseded ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{superseded}</Text>
      ) : null}
      {hideMessage ? null : (
        <Text style={{ fontSize: 12.5, color: theme.text.primary }}>{view.message}</Text>
      )}
      {view.chips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {view.chips.map((chip) => (
            <View
              key={chip.path}
              accessibilityLabel={`${chip.name} ${chip.live}${chip.pending ? `, ${SIBLING_FALLBACK_PENDING_LABEL}` : ''}, stable ${chip.stable}`}
              style={{
                flexDirection: 'row',
                gap: 4,
                borderWidth: 1,
                borderColor: theme.border.strong,
                borderRadius: 999,
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.primary }}>
                {chip.name}
              </Text>
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                {`${chip.live}${chip.pending ? ` · ${SIBLING_FALLBACK_PENDING_LABEL}` : ''} → ${chip.stable}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {view.failures ? (
        <View style={{ gap: 2 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {`${open ? '▾' : '▸'} ${view.failures.label} (${view.failures.lines.length})`}
            </Text>
          </Pressable>
          {open
            ? view.failures.lines.map((line) => (
                <Text
                  key={line}
                  style={{ fontSize: 11.5, fontFamily: 'Menlo', color: theme.text.primary }}
                >
                  {line}
                </Text>
              ))
            : null}
        </View>
      ) : null}
      {view.notReplaced.map((line) => (
        <Text key={line} style={{ fontSize: 12, color: theme.text.secondary }}>
          {line}
        </Text>
      ))}
    </View>
  )
}

/** Native peer of web's `RunSiblingFallbackNotice`. */
export function RunSiblingFallbackNotice({ runId, entryId }: { runId: string; entryId: string }) {
  const notice = useSiblingFallbackNotice(runId, entryId)
  if (notice.state === 'unknown') return null
  return (
    <SiblingFallbackNotice
      view={notice.view}
      {...(notice.state === 'superseded' ? { superseded: notice.line } : {})}
    />
  )
}
