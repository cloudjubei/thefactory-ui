import { Pressable, Text, View } from 'react-native'

import {
  NEEDS_YOU_DISCUSS_LABEL,
  NEEDS_YOU_FINE_LABEL,
  runNeedsYouView,
  useRunNeedsYou,
  type NeedsYouCardsView,
  type ReportSectionView,
  type RunNeedsYouActions,
} from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconChat, IconCheck } from '../../../icons'
import { nativeRadii } from '../../../../tokens/native'
import Markdown from '../../Markdown'
import SignoffSection from './SignoffSection'

export type NeedsYouSectionProps = {
  section: ReportSectionView<string[]>
}

/**
 * Native peer of web's `NeedsYouSection`: at a run's sign-off the report's
 * "Needs you" items are cards to discuss or settle, with how many decisions
 * are left; anywhere else, the report's plain list.
 */
export default function NeedsYouSection({ section }: NeedsYouSectionProps) {
  const { theme } = useNativeTheme()
  const actions = useRunNeedsYou()
  const body = { fontSize: 13, color: theme.text.secondary } as const
  if (actions) {
    const view = runNeedsYouView(section.body, actions.resolutions)
    return (
      <SignoffSection
        title={section.title}
        summary={view.summary}
        defaultOpen={section.open}
        attention={view.attention}
      >
        <NeedsYouCards view={view} actions={actions} />
      </SignoffSection>
    )
  }
  return (
    <SignoffSection
      title={section.title}
      summary={section.summary}
      defaultOpen={section.open}
      attention={section.attention}
    >
      {section.body.length > 0 ? (
        <View style={{ gap: 6 }}>
          {section.body.map((d) => (
            <View key={d} style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={body}>•</Text>
              <View style={{ flex: 1 }}>
                <Markdown text={d} inline textStyle={body} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={body}>Nothing is left for you.</Text>
      )}
    </SignoffSection>
  )
}

function NeedsYouCards({
  view,
  actions,
}: {
  view: NeedsYouCardsView
  actions: RunNeedsYouActions
}) {
  const { theme, status } = useNativeTheme()
  if (view.cards.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>Nothing is left for you.</Text>
    )
  }
  return (
    <View style={{ gap: 8 }}>
      {view.cards.map((card) => (
        <View
          key={card.id}
          style={{
            gap: 8,
            padding: 10,
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: card.open ? status.working.softBorder : theme.border.subtle,
            backgroundColor: card.open ? status.working.softBg : theme.surface.base,
            opacity: card.open ? 1 : 0.8,
          }}
        >
          <View style={{ gap: 2 }}>
            <Markdown
              text={card.title}
              inline
              textStyle={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}
            />
            {card.body ? (
              <Markdown
                text={card.body}
                inline
                textStyle={{ fontSize: 12.5, color: theme.text.secondary }}
              />
            ) : null}
            {card.outcome ? (
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accent.primary }}>
                {card.outcome}
              </Text>
            ) : null}
          </View>
          {card.open ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => actions.onDiscuss(card)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 32,
                  paddingHorizontal: 10,
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: theme.accent.primary,
                  backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
                })}
              >
                <IconChat size={14} color={theme.accent.primary} />
                <Text style={{ fontSize: 13, color: theme.accent.primary }}>
                  {NEEDS_YOU_DISCUSS_LABEL}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={NEEDS_YOU_FINE_LABEL}
                onPress={() => actions.onResolve(card)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: nativeRadii[2],
                  borderWidth: 1,
                  borderColor: theme.border.default,
                  backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
                })}
              >
                <IconCheck size={14} color={theme.text.secondary} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}
