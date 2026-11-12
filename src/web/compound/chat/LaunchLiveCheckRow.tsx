import {
  LIVE_CHECK_COPY,
  type LaunchLiveCheckView,
  type LiveCheckChoice,
  type LiveCheckDraft,
} from '../../../headless'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Switch } from '../../primitives/Switch'
import LiveCheckNoteLink from './LiveCheckNoteLink'

export type LaunchLiveCheckRowProps = {
  view: LaunchLiveCheckView
  onChange: (change: Partial<LiveCheckDraft>) => void
  /** Names the feature the row is for, where the card lists several (a group launch). */
  title?: string
  /** The project whose logins note the secret hint opens. */
  projectId?: string
  busy?: boolean
}

/**
 * The launch card's "Live check" for one feature: Off, Required or Ask me,
 * starting from what the agent advises, with "Before and after" while one is
 * on and the advice under it. Offered only where the preview offers it.
 * Native peer: `native/compound/chat/LaunchLiveCheckRow`.
 */
export default function LaunchLiveCheckRow({
  view,
  onChange,
  title,
  projectId,
  busy = false,
}: LaunchLiveCheckRowProps) {
  const name = title ? `${LIVE_CHECK_COPY.title}: ${title}` : LIVE_CHECK_COPY.title
  return (
    <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {LIVE_CHECK_COPY.title}
        {title ? (
          <span className="ml-1 font-normal normal-case tracking-normal text-(--text-secondary)">
            · {title}
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <SegmentedControl
          size="sm"
          ariaLabel={name}
          value={view.choice}
          onChange={(next) => onChange({ choice: next as LiveCheckChoice })}
          options={view.options.map(({ value, label }) => ({ value, label }))}
        />
        {view.showsBeforeAndAfter ? (
          <Switch
            checked={view.beforeAndAfter}
            onCheckedChange={(beforeAndAfter) => onChange({ beforeAndAfter })}
            label={LIVE_CHECK_COPY.beforeAndAfter}
            ariaLabel={`${LIVE_CHECK_COPY.beforeAndAfter}: ${name}`}
            disabled={busy}
          />
        ) : null}
      </div>
      <span className="text-[11.5px] text-(--text-secondary)">{view.line}</span>
      <span className="text-[11px] text-(--text-muted)">{view.advice}</span>
      {view.secretHint ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded bg-(--status-review-soft-bg) px-2 py-1">
          <span role="note" className="text-[11px] text-(--status-review-soft-fg)">
            {view.secretHint}
          </span>
          {projectId ? <LiveCheckNoteLink projectId={projectId} /> : null}
        </div>
      ) : null}
    </fieldset>
  )
}
