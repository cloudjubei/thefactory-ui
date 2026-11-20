import type { AgentPauseAction, AgentPauseStepView } from '../../../headless'
import { IconCheck, IconPause } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import InlineStopConfirm from '../chips/InlineStopConfirm'

/** The paused step's mark, where its status would be: a pause in "Needs you". */
export function AgentPauseMarker() {
  return (
    <span
      aria-hidden
      className="grid size-[22px] shrink-0 place-items-center rounded-full"
      style={{
        background: 'var(--status-on_hold-bg)',
        color: 'var(--status-on_hold-fg)',
        border: '1.5px solid var(--status-on_hold-bg)',
      }}
    >
      <IconPause className="size-2.5" />
    </span>
  )
}

export type AgentPausePanelProps = {
  view: AgentPauseStepView
  onDecide: (action: AgentPauseAction) => void
}

/**
 * What a step whose agent paused shows under itself: why, with Resume (when
 * its session can be carried on), Retry step and Stop run — Stop asked again
 * in place; what is happening once one is chosen; or, briefly, that the agent
 * came back by itself.
 */
export default function AgentPausePanel({ view, onDecide }: AgentPausePanelProps) {
  if (view.kind === 'working') {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]"
        style={{
          background: 'var(--status-running-soft-bg)',
          border: '1px solid var(--status-running-soft-border)',
          color: 'var(--status-running-soft-fg)',
        }}
      >
        <Spinner size={13} />
        <span>{view.text}</span>
      </div>
    )
  }
  if (view.kind === 'cleared') {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-[12.5px]"
        style={{
          background: 'var(--status-done-soft-bg)',
          border: '1px solid var(--status-done-soft-border)',
          color: 'var(--status-done-soft-fg)',
        }}
      >
        <IconCheck className="size-3" />
        <b className="font-semibold">{view.title}</b>
        <span className="text-(--text-secondary)">{view.text}</span>
      </div>
    )
  }
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg px-3.5 py-3 text-[12.5px]"
      style={{
        background: 'var(--status-on_hold-soft-bg)',
        border: '1px solid var(--status-on_hold-soft-border)',
      }}
    >
      <span
        className="text-[13px] font-semibold"
        style={{ color: 'var(--status-on_hold-soft-fg)' }}
      >
        {view.headline}
      </span>
      <span className="leading-normal text-(--text-secondary)">{view.body}</span>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {view.buttons.map((button, at) => (
          <Button
            key={button.action}
            size="sm"
            variant={at === 0 ? 'primary' : 'secondary'}
            {...(button.title ? { title: button.title } : {})}
            onClick={() => onDecide(button.action)}
          >
            {button.label}
          </Button>
        ))}
        {view.stop ? (
          <span className="ml-1 inline-flex flex-wrap items-center gap-2 whitespace-nowrap text-(--text-secondary)">
            <InlineStopConfirm
              ask={view.stop.ask}
              stop={view.stop.label}
              keep={view.stop.keep}
              label={view.stop.label}
              onStop={() => onDecide('stop')}
            />
          </span>
        ) : null}
      </div>
      {view.error ? (
        <span role="alert" className="text-(--status-stuck-soft-fg)">
          {view.error}
        </span>
      ) : null}
    </div>
  )
}
