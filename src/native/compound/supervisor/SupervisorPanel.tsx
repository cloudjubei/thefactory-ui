import { Pressable, Text, View } from 'react-native'

import type { UseSupervisor } from '../../../headless/hooks/useSupervisor'
import { SUPERVISOR_PANEL_COPY } from '../../../headless/utils/supervisorPanelConstants'
import type {
  SupervisorAnswerView,
  SupervisorAskView,
} from '../../../headless/utils/supervisorPanelTypes'
import { formatDateTime } from '../../../headless/utils/time'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Switch } from '../../primitives/Switch'
import { ManagerOutcomeCardView, type ManagerCardLinks } from '../chat/ManagerCards'

export type SupervisorPanelProps = {
  supervisor: Pick<UseSupervisor, 'view' | 'loading' | 'error' | 'setEnabled'>
  onOpenRun?: (runId: string, projectId: string) => void
  onOpenChat?: () => void
  onAnswer?: (ask: SupervisorAskView, answer: SupervisorAnswerView) => void
  links?: ManagerCardLinks
}

function AskCard({
  ask,
  onOpenRun,
  onAnswer,
}: {
  ask: SupervisorAskView
  onOpenRun?: SupervisorPanelProps['onOpenRun']
  onAnswer?: SupervisorPanelProps['onAnswer']
}) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        borderColor: status.on_hold.softBorder,
        backgroundColor: theme.surface.raised,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Pressable
        accessibilityLabel={`Open ${ask.title}`}
        accessibilityRole="button"
        disabled={!onOpenRun}
        onPress={() => onOpenRun?.(ask.runId, ask.projectId)}
        style={{ gap: 4 }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {ask.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {ask.projectId} · {ask.where}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.primary }}>{ask.question}</Text>
      </Pressable>
      <View style={{ gap: 6 }}>
        {ask.answers.map((answer) => {
          const body = (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
                {answer.label}
              </Text>
              {answer.recommended ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 6,
                    backgroundColor: status.done.softBg,
                    borderColor: status.done.softBorder,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '600', color: status.done.softFg }}>
                    {SUPERVISOR_PANEL_COPY.recommended}
                  </Text>
                </View>
              ) : null}
              {answer.note ? (
                <Text style={{ fontSize: 13, color: theme.text.secondary }}>— {answer.note}</Text>
              ) : null}
            </View>
          )
          const key = `${answer.choice}:${answer.label}`
          return onAnswer ? (
            <Pressable
              key={key}
              accessibilityLabel={answer.label}
              accessibilityRole="button"
              onPress={() => onAnswer(ask, answer)}
              style={{
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              {body}
            </Pressable>
          ) : (
            <View key={key}>{body}</View>
          )
        })}
      </View>
      {ask.toolAsks > 0 ? (
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {SUPERVISOR_PANEL_COPY.toolAsks(ask.toolAsks)}
        </Text>
      ) : null}
    </View>
  )
}

/** Native peer of the web `SupervisorPanel`. */
export default function SupervisorPanel({
  supervisor,
  onOpenRun,
  onOpenChat,
  onAnswer,
  links = {},
}: SupervisorPanelProps) {
  const { theme, status } = useNativeTheme()
  const view = supervisor.view
  const caption = {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: theme.text.secondary,
  }
  const quiet = { fontSize: 13, color: theme.text.secondary }
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Switch
          checked={view?.enabled ?? false}
          disabled={!view}
          onCheckedChange={(next) => supervisor.setEnabled(next)}
          label={SUPERVISOR_PANEL_COPY.switchLabel}
        />
        {onOpenChat ? (
          <Pressable
            accessibilityLabel={SUPERVISOR_PANEL_COPY.openChat}
            accessibilityRole="button"
            onPress={onOpenChat}
            style={{ marginLeft: 'auto' }}
          >
            <Text style={{ fontSize: 13, color: theme.accent.primary }}>
              {SUPERVISOR_PANEL_COPY.openChat}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {view ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.switchDetail}</Text>
          {view.fallbackLine ? (
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>{view.fallbackLine}</Text>
          ) : null}
        </View>
      ) : null}
      {supervisor.error ? (
        <Text style={{ fontSize: 12, color: status.stuck.fg }}>{supervisor.error}</Text>
      ) : null}
      {view ? (
        <>
          <View style={{ gap: 8 }}>
            <Text style={caption}>{SUPERVISOR_PANEL_COPY.asks}</Text>
            {view.asks.length === 0 ? (
              <Text style={quiet}>{SUPERVISOR_PANEL_COPY.noAsks}</Text>
            ) : (
              view.asks.map((ask) => (
                <AskCard
                  key={ask.key}
                  ask={ask}
                  {...(onOpenRun ? { onOpenRun } : {})}
                  {...(onAnswer ? { onAnswer } : {})}
                />
              ))
            )}
          </View>
          <View style={{ gap: 8 }}>
            <Text style={caption}>{SUPERVISOR_PANEL_COPY.actions}</Text>
            {view.actions.length === 0 ? (
              <Text style={quiet}>{SUPERVISOR_PANEL_COPY.noActions}</Text>
            ) : (
              view.actions.map((action) => (
                <ManagerOutcomeCardView
                  key={action.id}
                  card={action.card}
                  standing={action.standing}
                  at={formatDateTime(new Date(action.at))}
                  links={links}
                />
              ))
            )}
          </View>
        </>
      ) : null}
    </View>
  )
}
