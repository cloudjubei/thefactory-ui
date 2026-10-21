import { Fragment, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  PROCESS_ACCEPTED_UNCHECKED_COUNT,
  PROCESS_ACCEPTED_UNCHECKED_TONE,
  STEPS_STRIP_COPY,
  stepsStripView,
  type StepsStripEntry,
  type StepsStripModel,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'

export interface StepsStripProps {
  model: StepsStripModel
  /** A narrow strip folds always: `✓ N/M`, the current step, `+N`. */
  narrow?: boolean
}

function Dot({ entry }: { entry: StepsStripEntry }) {
  const { status } = useNativeTheme()
  const color = status[entry.tone].bg
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: entry.phase === 'done' ? color : 'transparent',
      }}
    />
  )
}

function AttemptPill({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      numberOfLines={1}
      style={{
        fontSize: 10,
        fontWeight: '600',
        color: theme.text.secondary,
        backgroundColor: theme.surface.muted,
        borderRadius: 999,
        overflow: 'hidden',
        paddingHorizontal: 6,
      }}
    >
      {text}
    </Text>
  )
}

function Step({
  entry,
  emphasis,
  narrow,
}: {
  entry: StepsStripEntry
  emphasis: boolean
  narrow: boolean
}) {
  const { theme, status } = useNativeTheme()
  const tone = status[entry.tone]
  const textColor = emphasis
    ? tone.softFg
    : entry.phase === 'upcoming'
      ? theme.text.muted
      : theme.text.secondary
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: emphasis ? 1 : 2,
        maxWidth: emphasis && !narrow ? 280 : 170,
        minWidth: 0,
        borderRadius: 999,
        ...(emphasis
          ? { backgroundColor: tone.softBg, paddingLeft: 4, paddingRight: 8, paddingVertical: 1 }
          : {}),
      }}
    >
      <Dot entry={entry} />
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: 12,
          fontWeight: emphasis ? '600' : '400',
          color: textColor,
        }}
      >
        {entry.label}
      </Text>
      {emphasis && entry.attempt ? <AttemptPill text={entry.attempt} /> : null}
    </View>
  )
}

/**
 * Native peer of web's `StepsStrip`: the steps, features or done-when criteria
 * on one line, a long list folded into `✓ N done` and `+N more` chips that open
 * the whole list in a sheet.
 */
export default function StepsStrip({ model, narrow = false }: StepsStripProps) {
  const { theme, status } = useNativeTheme()
  const view = useMemo(() => stepsStripView(model.entries, { narrow }), [model.entries, narrow])
  const [open, setOpen] = useState(false)
  if (view.items.length === 0) return null
  const doneTone = (accepted: number) =>
    status[accepted > 0 ? PROCESS_ACCEPTED_UNCHECKED_TONE : 'done']
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: nativeSpace[3],
        paddingVertical: nativeSpace[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Text
        style={{
          marginRight: 4,
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {model.label}
      </Text>
      {view.items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 ? <Text style={{ color: theme.text.muted }}>—</Text> : null}
          {item.kind === 'step' ? (
            <Step entry={item.entry} emphasis={item.emphasis} narrow={narrow} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${item.kind === 'done' && item.acceptedUnchecked > 0 ? `, ${PROCESS_ACCEPTED_UNCHECKED_COUNT(item.acceptedUnchecked)}` : ''} — ${STEPS_STRIP_COPY.openList}`}
              onPress={() => setOpen(true)}
              hitSlop={6}
              style={{
                height: 22,
                paddingHorizontal: 8,
                justifyContent: 'center',
                borderRadius: 999,
                borderWidth: 1,
                ...(item.kind === 'done'
                  ? {
                      backgroundColor: doneTone(item.acceptedUnchecked).softBg,
                      borderColor: doneTone(item.acceptedUnchecked).softBorder,
                    }
                  : { backgroundColor: theme.surface.raised, borderColor: theme.border.default }),
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11.5,
                  fontWeight: '600',
                  color:
                    item.kind === 'done'
                      ? doneTone(item.acceptedUnchecked).softFg
                      : theme.text.secondary,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        </Fragment>
      ))}
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={model.label}>
        <ScrollView contentContainerStyle={{ gap: 2, paddingBottom: nativeSpace[3] }}>
          {model.entries.map((entry) => {
            const current = entry.phase === 'current'
            const tone = status[entry.tone]
            return (
              <View
                key={entry.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: nativeSpace[2],
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: nativeSpace[2],
                  borderRadius: 6,
                  backgroundColor: current ? tone.softBg : 'transparent',
                }}
              >
                <Dot entry={entry} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: current ? '600' : '400',
                      color: current
                        ? tone.softFg
                        : entry.phase === 'upcoming'
                          ? theme.text.muted
                          : theme.text.secondary,
                    }}
                  >
                    {entry.label}
                  </Text>
                  {entry.acceptedUnchecked ? (
                    <Text style={{ fontSize: 11.5, color: tone.softFg }}>
                      {entry.acceptedUnchecked}
                    </Text>
                  ) : null}
                </View>
                {entry.attempt ? <AttemptPill text={entry.attempt} /> : null}
              </View>
            )
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  )
}
