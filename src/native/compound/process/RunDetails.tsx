import { useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import {
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  RUN_DETAILS_COPY,
  processCleanupHeadline,
  type ProcessBaseMovedView,
  type ProcessManagerPreReadView,
  type ProcessResumeChoice,
  type UseProcessCleanup,
} from '../../../headless'
import { PROCESS_CLEANUP_COPY } from '../../../headless/utils/processCleanupViewConstants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import { Button } from '../../primitives/Button'
import { ProcessCleanupBody } from './signoff/ProcessCleanupCard'

export type RunDetailsProps = {
  /** The manager's pre-read of the sign-off. */
  preRead?: ProcessManagerPreReadView
  /** What was added to the run after it started, a note each. */
  workAdded: readonly string[]
  /** The run's cleanup list, as `useProcessCleanup` keeps it. */
  cleanup?: UseProcessCleanup
  /** What the run says about its base branch, as `processBaseMovedView` lays it out. */
  base?: ProcessBaseMovedView
  /** Takes the base section's choice — bringing the base in and re-checking. */
  onChooseBase?: (choice: ProcessResumeChoice) => void
  /** Laid over the card's own style — the sign-off places it flush in its column. */
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer of
 * [web's `RunDetails`](../../../web/compound/process/RunDetails.tsx).
 * "More about this run": what matters less than the decision and the report,
 * each folded to one line until opened — its base branch once that moved on,
 * the manager's pre-read, the work added to the run, and its cleanup list.
 * Nothing when there is none of it.
 */
export default function RunDetails({
  preRead,
  workAdded,
  cleanup,
  base,
  onChooseBase,
  style,
}: RunDetailsProps) {
  const { theme } = useNativeTheme()
  const list = cleanup?.list
  const hasCleanup = !!list && (list.items.length > 0 || !!list.report)
  if (!base && !preRead && workAdded.length === 0 && !hasCleanup) return null
  const baseChoice = onChooseBase ? base?.choice : undefined
  const body = { fontSize: 12.5, lineHeight: 18, color: theme.text.secondary } as const
  return (
    <View
      accessibilityLabel={RUN_DETAILS_COPY.title}
      style={[
        {
          marginHorizontal: nativeSpace[3],
          marginTop: nativeSpace[3],
          borderRadius: nativeRadii[4],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[2],
        },
        style,
      ]}
    >
      <Text
        accessibilityRole="header"
        style={{
          paddingVertical: nativeSpace[2],
          fontSize: 14,
          fontWeight: '600',
          color: theme.text.primary,
        }}
      >
        {RUN_DETAILS_COPY.title}
      </Text>
      {base ? (
        <Disclosure title={RUN_DETAILS_COPY.baseBranch} meta={base.headline}>
          {base.meaning ? <Text style={body}>{base.meaning}</Text> : null}
          {base.lastUpdate ? <Text style={body}>{base.lastUpdate}</Text> : null}
          {baseChoice && onChooseBase ? (
            <View style={{ alignSelf: 'flex-start', gap: 2 }}>
              <Button
                size="sm"
                variant={baseChoice.primary ? 'primary' : 'secondary'}
                onPress={() => onChooseBase(baseChoice.choice)}
              >
                {baseChoice.label}
              </Button>
              <Text style={{ fontSize: 11, color: theme.text.secondary }}>{baseChoice.detail}</Text>
            </View>
          ) : null}
        </Disclosure>
      ) : null}
      {preRead ? (
        <Disclosure title={PROCESS_MANAGER_PRE_READ_TITLE} meta={RUN_DETAILS_COPY.preReadMeta}>
          <Text style={body}>{preRead.summary}</Text>
          {preRead.items.map((item) => (
            <View key={item.itemId}>
              <Text style={{ ...body, color: theme.text.primary }}>{item.finding}</Text>
              <Text style={body}>
                {`${PROCESS_MANAGER_RECOMMENDS_LABEL}: ${item.recommendation}`}
              </Text>
            </View>
          ))}
        </Disclosure>
      ) : null}
      {workAdded.length > 0 ? (
        <Disclosure
          title={RUN_DETAILS_COPY.workAdded}
          meta={RUN_DETAILS_COPY.additions(workAdded.length)}
        >
          {workAdded.map((note) => (
            <Text key={note} style={body}>
              {note}
            </Text>
          ))}
        </Disclosure>
      ) : null}
      {hasCleanup && list && cleanup ? (
        <Disclosure title={PROCESS_CLEANUP_COPY.title} meta={processCleanupHeadline(list)}>
          <ProcessCleanupBody cleanup={cleanup} />
        </Disclosure>
      ) : null}
    </View>
  )
}

/** One folded line: its title and a few words of what is inside, opened in place. */
function Disclosure({
  title,
  meta,
  children,
}: {
  title: string
  meta: string
  children: ReactNode
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingVertical: 6,
        }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.muted} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>{title}</Text>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 'auto',
            textAlign: 'right',
            fontSize: 12,
            color: theme.text.muted,
          }}
        >
          {meta}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: nativeSpace[2], paddingBottom: nativeSpace[3], paddingLeft: 22 }}>
          {children}
        </View>
      ) : null}
    </View>
  )
}
