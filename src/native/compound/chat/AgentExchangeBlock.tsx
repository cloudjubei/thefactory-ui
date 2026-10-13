import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ProcessManagerBriefCard } from 'thefactory-tools/types'
import { agentExchangeLine } from '../../../headless/utils/agentExchanges'
import { AGENT_EXCHANGE_HANDLED } from '../../../headless/utils/agentExchangesConstants'
import type { AgentExchange } from '../../../headless/utils/agentExchangesTypes'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'
import { formatFriendlyTimestamp } from '../../../headless/utils/time'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconAgent } from '../../icons'
import {
  ManagerBriefCardView,
  ManagerCardView,
  ManagerStopLine,
  type ManagerCardLinks,
} from './ManagerCards'

export type AgentExchangeBlockProps = {
  exchange: AgentExchange
  links: ManagerCardLinks
  renderProcessRun?: (processRunId: string) => ReactNode
}

function briefOf(message: ChatMessageLike | undefined): ProcessManagerBriefCard | undefined {
  return message?.managerCard?.kind === 'brief' ? message.managerCard : undefined
}

function timeOf(message: ChatMessageLike): string | undefined {
  const iso = message.completedAt ?? message.startedAt
  return iso ? formatFriendlyTimestamp(iso) : undefined
}

/** Native peer of web's quiet "Handled" line. */
function AgentExchangeLineRow({ exchange }: { exchange: AgentExchange }) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const view = agentExchangeLine(exchange)
  const at = exchange.at ? formatFriendlyTimestamp(exchange.at) : ''
  const canOpen = !!(view.toAgent || view.fromAgent)
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border.subtle,
        borderRadius: nativeRadii[2],
        backgroundColor: theme.surface.muted,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !canOpen }}
        disabled={!canOpen}
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}
      >
        <IconAgent size={14} color={theme.text.secondary} />
        <Text style={{ flex: 1, fontSize: 13, color: theme.text.secondary }}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>{view.head}</Text>
          {view.line ? ` — ${view.line}` : ''}
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: status.empty.softBorder,
            backgroundColor: status.empty.softBg,
            borderRadius: nativeRadii.round,
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{ fontSize: 11, fontWeight: '600', lineHeight: 18, color: status.empty.softFg }}
          >
            {AGENT_EXCHANGE_HANDLED}
          </Text>
        </View>
        {at ? <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{at}</Text> : null}
      </Pressable>
      {open ? (
        <View style={{ paddingLeft: 34, paddingRight: 12, paddingBottom: 10, gap: 6 }}>
          {[view.toAgent, view.fromAgent].map((side) =>
            side ? (
              <Text key={side.label} style={{ fontSize: 12.5, color: theme.text.secondary }}>
                <Text style={{ fontWeight: '600' }}>{`${side.label}: `}</Text>
                {side.text}
              </Text>
            ) : null,
          )}
        </View>
      ) : null}
    </View>
  )
}

/** Native peer of web's `AgentExchangeBlock`. */
export default function AgentExchangeBlock({
  exchange,
  links,
  renderProcessRun,
}: AgentExchangeBlockProps) {
  const brief = briefOf(exchange.handoff)
  return (
    <View style={{ gap: 8 }}>
      {brief ? (
        <>
          <ManagerStopLine card={brief} />
          <ManagerBriefCardView
            card={brief}
            {...(exchange.handoff?.content ? { words: exchange.handoff.content } : {})}
            links={links}
          />
        </>
      ) : exchange.from ? (
        <AgentExchangeLineRow exchange={exchange} />
      ) : null}
      {exchange.cards.map((message, i) => {
        const card = message.managerCard
        if (!card || card.kind === 'brief') return null
        const at = timeOf(message)
        return (
          <View key={`card-${i}`}>
            {card.kind === 'escalation' ? (
              <ManagerCardView
                card={card}
                {...(message.processRunId ? { processRunId: message.processRunId } : {})}
                links={links}
              >
                {message.processRunId && renderProcessRun
                  ? renderProcessRun(message.processRunId)
                  : null}
              </ManagerCardView>
            ) : (
              <ManagerCardView
                card={card}
                {...(message.processRunId ? { processRunId: message.processRunId } : {})}
                {...(at ? { at } : {})}
                {...(exchange.reply?.content ? { reply: exchange.reply.content } : {})}
                links={links}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}
