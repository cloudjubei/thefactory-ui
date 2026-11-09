import { useState, type ReactNode } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  JOURNEY_DAYS_COPY,
  useReviewEvidenceImage,
  type EvidenceTile,
  type JourneyDayView,
  type JourneyStepView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight } from '../../icons'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import type { SaveFileHandler } from '../chat/signoff'
import CostChip from '../chips/CostChip'
import ToneBadge from '../chips/ToneBadge'

export type JourneyStepDaysProps = {
  projectId: string
  view: JourneyStepView
  onSaveFile?: SaveFileHandler
}

function useText() {
  const { theme } = useNativeTheme()
  return {
    heading: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: theme.text.muted,
    },
    line: { fontSize: 13, lineHeight: 19, color: theme.text.primary },
    muted: { fontSize: 12, color: theme.text.secondary },
    arrow: { color: theme.text.muted },
  }
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  const text = useText()
  return (
    <View style={{ gap: 4 }}>
      <Text style={text.heading}>{title}</Text>
      {children}
    </View>
  )
}

function Goals({ goals }: { goals: readonly string[] }) {
  const text = useText()
  return (
    <View style={{ gap: 2 }}>
      {goals.map((goal, at) => (
        <Text key={`${at}-${goal}`} style={text.line}>
          {goal}
        </Text>
      ))}
    </View>
  )
}

function DayBody({ day }: { day: JourneyDayView }) {
  const { theme } = useNativeTheme()
  const text = useText()
  return (
    <View
      style={{
        gap: nativeSpace[4],
        paddingHorizontal: nativeSpace[4],
        paddingBottom: nativeSpace[4],
      }}
    >
      {day.offered.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.offered}>
          <Goals goals={day.offered} />
        </Part>
      ) : null}
      {day.removed.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.removed}>
          {day.removed.map((one) => (
            <View key={one.key} style={{ gap: 2 }}>
              <Text style={text.line}>{one.goal}</Text>
              {one.reason ? <Text style={text.muted}>{one.reason}</Text> : null}
            </View>
          ))}
        </Part>
      ) : null}
      {day.replaced.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.replaced}>
          {day.replaced.map((one) => (
            <View key={one.key} style={{ gap: 2 }}>
              <Text style={text.line}>
                {one.from}
                <Text style={text.arrow}>{'  →  '}</Text>
                {one.to}
              </Text>
              {one.reason ? <Text style={text.muted}>{one.reason}</Text> : null}
            </View>
          ))}
        </Part>
      ) : null}
      {day.accepted.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.accepted}>
          <Goals goals={day.accepted} />
        </Part>
      ) : null}
      {day.statuses.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.statuses}>
          {day.statuses.map((one) => (
            <View key={one.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[text.line, { flex: 1 }]}>{one.goal}</Text>
              <ToneBadge tone={one.status.tone} label={one.status.label} />
            </View>
          ))}
        </Part>
      ) : null}
      {day.journal ? (
        <Part title={JOURNEY_DAYS_COPY.journal}>
          <Text style={text.line}>{day.journal}</Text>
        </Part>
      ) : null}
      {day.probes.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.probe}>
          {day.probes.map((one) => (
            <View key={one.key} style={{ gap: 2 }}>
              <Text style={text.muted}>{one.question}</Text>
              <Text style={text.line}>{one.choice ?? JOURNEY_DAYS_COPY.noPick}</Text>
              {one.note ? <Text style={text.muted}>{one.note}</Text> : null}
            </View>
          ))}
        </Part>
      ) : null}
      {day.cards.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.cards}>
          {day.cards.map((one) => (
            <Text key={one.key} style={text.line}>
              {one.card}
              <Text style={text.arrow}>{'  →  '}</Text>
              {one.reaction ?? JOURNEY_DAYS_COPY.noPick}
            </Text>
          ))}
        </Part>
      ) : null}
      {day.takeOvers.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.takeOversHeading}>
          {day.takeOvers.map((one) => (
            <View
              key={one.key}
              style={{
                gap: 4,
                paddingHorizontal: nativeSpace[3],
                paddingVertical: nativeSpace[2],
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.muted,
              }}
            >
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
              >
                <Text style={[text.line, { flex: 1, fontWeight: '500' }]}>{one.goal}</Text>
                <ToneBadge tone={one.badge.tone} label={one.badge.label} />
              </View>
              <Text style={text.muted}>
                {JOURNEY_DAYS_COPY.saw}: {one.saw}
              </Text>
              {one.turns || one.cost ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {one.turns ? <Text style={text.muted}>{one.turns}</Text> : null}
                  {one.cost ? <CostChip label={one.cost} /> : null}
                </View>
              ) : null}
            </View>
          ))}
        </Part>
      ) : null}
      {day.decisions.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.decisionsHeading}>
          {day.decisions.map((one) => (
            <View key={one.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text numberOfLines={1} style={[text.line, { flex: 1 }]}>
                {one.label}
              </Text>
              {one.model ? <Text style={text.muted}>{one.model}</Text> : null}
              {one.cost ? <CostChip label={one.cost} /> : null}
              <ToneBadge tone={one.badge.tone} label={one.badge.label} />
            </View>
          ))}
        </Part>
      ) : null}
    </View>
  )
}

function DayRow({
  day,
  first,
  defaultOpen,
}: {
  day: JourneyDayView
  first: boolean
  defaultOpen: boolean
}) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: theme.border.subtle }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={day.title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
              {day.title}
            </Text>
            {day.takeOverBadge ? (
              <ToneBadge tone={day.takeOverBadge.tone} label={day.takeOverBadge.label} />
            ) : null}
          </View>
          <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.secondary }}>
            {day.line}
          </Text>
        </View>
        {day.cost ? <CostChip label={day.cost} /> : null}
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevronRight size={14} color={theme.text.muted} />
        </View>
      </Pressable>
      {open ? <DayBody day={day} /> : null}
    </View>
  )
}

function StoppedAt({ projectId, tile }: { projectId: string; tile: EvidenceTile }) {
  const { theme } = useNativeTheme()
  const { dataUri } = useReviewEvidenceImage(projectId, tile.ref.id, tile.ref.mediaType)
  return (
    <Part title={JOURNEY_DAYS_COPY.stoppedAt}>
      {dataUri ? (
        <Image
          source={{ uri: dataUri }}
          resizeMode="contain"
          accessibilityLabel={tile.caption}
          style={{
            width: '100%',
            aspectRatio: 9 / 16,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        />
      ) : (
        <View
          style={{
            height: 160,
            borderRadius: nativeRadii[2],
            backgroundColor: theme.surface.muted,
          }}
        />
      )}
    </Part>
  )
}

/** Native peer of web's `JourneyStepDays`: the same total, recording and day rows, one under the other. */
export default function JourneyStepDays({ projectId, view, onSaveFile }: JourneyStepDaysProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[4] }}>
      {view.totalLine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12.5, color: theme.text.secondary }}>
            {view.totalLine}
          </Text>
          {view.totalCost ? <CostChip label={view.totalCost} /> : null}
        </View>
      ) : null}
      {view.empty ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.empty}</Text>
      ) : null}
      {view.unread ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.unread}</Text>
      ) : null}
      {view.recording ? (
        <WalkthroughTab
          projectId={projectId}
          recordings={[view.recording]}
          {...(onSaveFile ? { onSaveFile } : {})}
        />
      ) : null}
      {view.stoppedAt ? <StoppedAt projectId={projectId} tile={view.stoppedAt} /> : null}
      {view.days.length > 0 ? (
        <View
          style={{
            overflow: 'hidden',
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          {view.days.map((day, at) => (
            <DayRow
              key={day.day}
              day={day}
              first={at === 0}
              defaultOpen={day.day === view.openDay}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}
