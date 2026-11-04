import { VIDEO_ATTACHMENT_TEXT, type VideoAttachmentView, type VideoStep } from '../../../headless'
import { IconCheck } from '../../icons'
import Spinner from '../../primitives/Spinner'

export type VideoDetailsPanelProps = {
  name: string
  view: VideoAttachmentView
}

function StepMark({ step }: { step: VideoStep }) {
  if (step.state === 'done') return <IconCheck className="h-3.5 w-3.5 text-green-600" />
  if (step.state === 'active') return <Spinner size={12} />
  return <span className="h-1.5 w-1.5 rounded-full bg-(--text-muted) opacity-50" />
}

/** How a video stands: what its chip opens, in a popover on web and a sheet on a phone. */
export default function VideoDetailsPanel({ name, view }: VideoDetailsPanelProps) {
  const { facts, steps, state, line, cost, transcript } = view
  return (
    <div className="flex w-[300px] max-w-full flex-col gap-2.5 text-xs text-(--text-secondary)">
      <div className="flex min-w-0 flex-col">
        <div className="truncate text-[13px] font-semibold text-(--text-primary)">{name}</div>
        {facts ? <div className="tabular-nums text-(--text-muted)">{facts}</div> : null}
      </div>
      {steps.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {steps.map((step) => (
            <li
              key={step.label}
              className={`flex items-center gap-2 ${
                step.state === 'active'
                  ? 'font-medium text-(--text-primary)'
                  : step.state === 'todo'
                    ? 'text-(--text-muted)'
                    : ''
              }`}
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <StepMark step={step} />
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
      {state === 'failed' && line ? <div className="text-(--text-primary)">{line}</div> : null}
      {cost ? (
        <div className="flex flex-col gap-0.5 border-t border-(--border-subtle) pt-2 tabular-nums">
          <span className="font-medium text-(--text-primary)">{cost.read}</span>
          <span className="font-medium text-(--text-primary)">{cost.closer}</span>
          <span className="text-(--text-muted)">{VIDEO_ATTACHMENT_TEXT.costNote}</span>
        </div>
      ) : state === 'preparing' ? (
        <div className="border-t border-(--border-subtle) pt-2 text-(--text-muted)">
          {VIDEO_ATTACHMENT_TEXT.costLater}
        </div>
      ) : null}
      {transcript ? <div className="text-(--text-muted)">{transcript.long}</div> : null}
    </div>
  )
}
