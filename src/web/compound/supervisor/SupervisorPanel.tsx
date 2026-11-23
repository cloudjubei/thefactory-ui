import type { UseSupervisor } from '../../../headless/hooks/useSupervisor'
import { SUPERVISOR_PANEL_COPY } from '../../../headless/utils/supervisorPanelConstants'
import type {
  SupervisorAnswerView,
  SupervisorAskView,
} from '../../../headless/utils/supervisorPanelTypes'
import { formatDateTime } from '../../../headless/utils/time'
import { ManagerOutcomeCardView, type ManagerCardLinks } from '../chat/ManagerCards'
import { Switch } from '../../primitives/Switch'

export type SupervisorPanelProps = {
  supervisor: Pick<UseSupervisor, 'view' | 'loading' | 'error' | 'setEnabled'>
  /** Open a run's page. */
  onOpenRun?: (runId: string, projectId: string) => void
  /** Open the supervisor's chat. */
  onOpenChat?: () => void
  /** Answer a handed-over stop with one of its ready answers; without it the answers only show. */
  onAnswer?: (ask: SupervisorAskView, answer: SupervisorAnswerView) => void
  links?: ManagerCardLinks
}

const CAPTION = 'text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)'

function AskCard({
  ask,
  onOpenRun,
  onAnswer,
}: {
  ask: SupervisorAskView
  onOpenRun?: SupervisorPanelProps['onOpenRun']
  onAnswer?: SupervisorPanelProps['onAnswer']
}) {
  return (
    <div
      onClick={() => onOpenRun?.(ask.runId, ask.projectId)}
      className={`flex flex-col gap-2 rounded-xl border bg-(--surface-raised) px-3.5 py-3 ${onOpenRun ? 'cursor-pointer hover:bg-(--surface-hover)' : ''}`}
      style={{ borderColor: 'var(--status-on_hold-soft-border)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-semibold text-(--text-primary)">{ask.title}</span>
        <span className="text-[12px] text-(--text-secondary)">
          {ask.projectId} · {ask.where}
        </span>
      </div>
      <div className="text-[13px] text-(--text-primary)">{ask.question}</div>
      <div className="flex flex-col gap-1.5" onClick={(e) => onAnswer && e.stopPropagation()}>
        {ask.answers.map((answer) => {
          const body = (
            <>
              <span className="font-medium">{answer.label}</span>
              {answer.recommended ? (
                <span
                  className="rounded-full border px-1.5 text-[10.5px] font-semibold"
                  style={{
                    background: 'var(--status-done-soft-bg)',
                    color: 'var(--status-done-soft-fg)',
                    borderColor: 'var(--status-done-soft-border)',
                  }}
                >
                  {SUPERVISOR_PANEL_COPY.recommended}
                </span>
              ) : null}
              {answer.note ? (
                <span className="text-(--text-secondary)">— {answer.note}</span>
              ) : null}
            </>
          )
          return onAnswer ? (
            <button
              key={`${answer.choice}:${answer.label}`}
              type="button"
              onClick={() => onAnswer(ask, answer)}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-(--border-subtle) px-2.5 py-1.5 text-left text-[13px] text-(--text-primary) hover:bg-(--surface-hover)"
            >
              {body}
            </button>
          ) : (
            <div
              key={`${answer.choice}:${answer.label}`}
              className="flex flex-wrap items-center gap-2 text-[13px] text-(--text-primary)"
            >
              {body}
            </div>
          )
        })}
      </div>
      {ask.toolAsks > 0 ? (
        <div className="text-[12px] text-(--text-secondary)">
          {SUPERVISOR_PANEL_COPY.toolAsks(ask.toolAsks)}
        </div>
      ) : null}
    </div>
  )
}

/**
 * A scope's supervisor: its switch, what it asks the person with each stop's
 * answers ready, and what it did, on the per-run manager's own "Handled" cards.
 * An ask opens its run on click. Native peer: `native/compound/supervisor/SupervisorPanel`.
 */
export default function SupervisorPanel({
  supervisor,
  onOpenRun,
  onOpenChat,
  onAnswer,
  links = {},
}: SupervisorPanelProps) {
  const view = supervisor.view
  return (
    <section className="flex flex-col gap-3" aria-label={SUPERVISOR_PANEL_COPY.title}>
      <div className="flex flex-wrap items-center gap-3">
        <Switch
          checked={view?.enabled ?? false}
          disabled={!view}
          onCheckedChange={(next) => supervisor.setEnabled(next)}
          label={SUPERVISOR_PANEL_COPY.switchLabel}
        />
        {onOpenChat ? (
          <button
            type="button"
            onClick={onOpenChat}
            className="ml-auto text-[12.5px] text-(--accent-primary) hover:underline"
          >
            {SUPERVISOR_PANEL_COPY.openChat}
          </button>
        ) : null}
      </div>
      {view ? (
        <div className="flex flex-col gap-0.5 text-[12.5px] text-(--text-secondary)">
          <span>{view.switchDetail}</span>
          {view.fallbackLine ? <span>{view.fallbackLine}</span> : null}
        </div>
      ) : null}
      {supervisor.error ? (
        <div className="text-[12px] text-(--status-stuck-fg)">{supervisor.error}</div>
      ) : null}
      {view ? (
        <>
          <div className="flex flex-col gap-2">
            <h3 className={CAPTION}>{SUPERVISOR_PANEL_COPY.asks}</h3>
            {view.asks.length === 0 ? (
              <div className="text-[13px] text-(--text-secondary)">
                {SUPERVISOR_PANEL_COPY.noAsks}
              </div>
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
          </div>
          <div className="flex flex-col gap-2">
            <h3 className={CAPTION}>{SUPERVISOR_PANEL_COPY.actions}</h3>
            {view.actions.length === 0 ? (
              <div className="text-[13px] text-(--text-secondary)">
                {SUPERVISOR_PANEL_COPY.noActions}
              </div>
            ) : (
              view.actions.map((action) => (
                <div
                  key={action.id}
                  onClick={() =>
                    action.runId && action.projectId
                      ? onOpenRun?.(action.runId, action.projectId)
                      : undefined
                  }
                  className={action.runId && onOpenRun ? 'cursor-pointer' : ''}
                >
                  <ManagerOutcomeCardView
                    card={action.card}
                    standing={action.standing}
                    at={formatDateTime(new Date(action.at))}
                    links={links}
                  />
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
