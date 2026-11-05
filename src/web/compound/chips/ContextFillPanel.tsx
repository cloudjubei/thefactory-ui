import {
  CHAT_COMPACT_COPY,
  CHAT_CONTEXT_FILL_COPY,
  type ChatCompactLineView,
  type ChatContextFillLevel,
  type ChatContextFillView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import InlineStopConfirm from './InlineStopConfirm'

export const CONTEXT_FILL_LEVEL_BAR: Record<ChatContextFillLevel, string> = {
  roomy: 'bg-(--accent-primary)',
  filling: 'bg-(--status-working-bg)',
  'nearly-full': 'bg-(--status-stuck-bg)',
}

const LINE_TONE: Record<ChatCompactLineView['tone'], string> = {
  done: 'text-(--text-primary)',
  neutral: 'text-(--text-secondary)',
  failed: 'text-(--status-stuck-soft-fg)',
}

export type ContextFillPanelProps = {
  view: ChatContextFillView
}

/**
 * What the context chip opens: how full the chat's window is, and Compact now.
 * The turn it runs shows as the chat working; Stop here asks first, like every
 * stop. Worded in headless so the native sheet reads the same.
 */
export default function ContextFillPanel({ view }: ContextFillPanelProps) {
  const { compact } = view
  return (
    <div className="flex w-[260px] max-w-full flex-col gap-2 text-xs text-(--text-primary)">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{CHAT_CONTEXT_FILL_COPY.title}</span>
        {view.percent !== undefined ? (
          <span className="shrink-0 font-semibold tabular-nums">
            {CHAT_CONTEXT_FILL_COPY.full(view.label)}
          </span>
        ) : null}
      </div>
      {view.percent !== undefined ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-(--surface-overlay)" aria-hidden>
          <div
            className={`h-full rounded-full ${CONTEXT_FILL_LEVEL_BAR[view.level]}`}
            style={{ width: `${view.percent}%` }}
          />
        </div>
      ) : null}
      <div className="text-(--text-secondary) tabular-nums">{view.tokens}</div>
      {view.note ? <div className="text-(--text-muted)">{view.note}</div> : null}
      {compact ? (
        <div className="flex flex-col gap-1.5 border-t border-(--border-subtle) pt-2">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" disabled={compact.running} onClick={compact.run}>
              {compact.running ? CHAT_COMPACT_COPY.running : CHAT_COMPACT_COPY.action}
            </Button>
            {compact.running ? (
              <span className="flex items-center gap-2 text-(--text-secondary)">
                <InlineStopConfirm
                  ask={CHAT_COMPACT_COPY.stopAsk}
                  stop={CHAT_COMPACT_COPY.stop}
                  keep={CHAT_COMPACT_COPY.keep}
                  label={CHAT_COMPACT_COPY.stopLabel}
                  onStop={compact.stop}
                />
              </span>
            ) : null}
          </div>
          {compact.line ? (
            <div className={LINE_TONE[compact.line.tone]} role="status">
              {compact.line.text}
            </div>
          ) : (
            <div className="text-(--text-muted)">{CHAT_COMPACT_COPY.hint}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
