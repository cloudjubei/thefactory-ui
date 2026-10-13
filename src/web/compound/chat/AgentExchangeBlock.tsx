import { useState, type ReactNode } from 'react'
import type { ProcessManagerBriefCard } from 'thefactory-tools/types'
import { agentExchangeLine } from '../../../headless/utils/agentExchanges'
import { AGENT_EXCHANGE_HANDLED } from '../../../headless/utils/agentExchangesConstants'
import type { AgentExchange } from '../../../headless/utils/agentExchangesTypes'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'
import { formatFriendlyTimestamp } from '../../../headless/utils/time'
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
  /** The live chip of the run a card reports on, where the person answers it. */
  renderProcessRun?: (processRunId: string) => ReactNode
}

function briefOf(message: ChatMessageLike | undefined): ProcessManagerBriefCard | undefined {
  return message?.managerCard?.kind === 'brief' ? message.managerCard : undefined
}

function timeOf(message: ChatMessageLike | undefined): string | undefined {
  const iso = message?.completedAt ?? message?.startedAt
  return iso ? formatFriendlyTimestamp(iso) : undefined
}

/** One grey "Handled" line for an exchange the agents settled, opening to what each side said. */
function AgentExchangeLineRow({ exchange }: { exchange: AgentExchange }) {
  const [open, setOpen] = useState(false)
  const view = agentExchangeLine(exchange)
  const at = exchange.at ? formatFriendlyTimestamp(exchange.at) : ''
  const canOpen = !!(view.toAgent || view.fromAgent)
  return (
    <div className="rounded-[10px] border border-(--border-subtle) bg-(--surface-overlay)">
      <button
        type="button"
        aria-expanded={canOpen ? open : undefined}
        disabled={!canOpen}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-(--text-secondary)"
      >
        <IconAgent className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <b className="font-semibold text-(--text-primary)">{view.head}</b>
          {view.line ? ` — ${view.line}` : ''}
        </span>
        <span
          className="inline-flex shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold leading-[18px]"
          style={{
            background: 'var(--status-empty-soft-bg)',
            color: 'var(--status-empty-soft-fg)',
            borderColor: 'var(--status-empty-soft-border)',
          }}
        >
          {AGENT_EXCHANGE_HANDLED}
        </span>
        {at ? <span className="font-mono text-[11.5px]">{at}</span> : null}
      </button>
      {open ? (
        <div className="flex flex-col gap-1.5 pr-3 pb-2.5 pl-[37px] text-[12.5px] leading-normal text-(--text-secondary)">
          {view.toAgent ? (
            <div>
              <b className="font-semibold">{view.toAgent.label}:</b> {view.toAgent.text}
            </div>
          ) : null}
          {view.fromAgent ? (
            <div>
              <b className="font-semibold">{view.fromAgent.label}:</b> {view.fromAgent.text}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * An exchange between agents drawn quietly: the manager's brief as its card
 * (with the line where the run stopped), or one "Handled" line for any other
 * hand-off; then each card the host wrote of it — what came of the turn, and
 * an escalation to the person with the run's chip.
 */
export default function AgentExchangeBlock({
  exchange,
  links,
  renderProcessRun,
}: AgentExchangeBlockProps) {
  const brief = briefOf(exchange.handoff)
  return (
    <div className="flex flex-col gap-2">
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
          <div key={`card-${i}`}>
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
          </div>
        )
      })}
    </div>
  )
}
