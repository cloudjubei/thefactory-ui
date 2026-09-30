import {
  PROCESS_INTEGRATION_CANCEL,
  PROCESS_INTEGRATION_CHOOSER_HEAD,
  PROCESS_INTEGRATION_CHOOSER_NOTE,
  processIntegrationChoices,
  type ProcessIntegrationMode,
  type ProcessWorkBranch,
} from '../../../headless'
import { Button } from '../../primitives/Button'

export type IntegrationChooserProps = {
  /** The branch the work is on, and the branch it goes back to. */
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>
  /** The question heading the choices. */
  head?: string
  busy?: boolean
  onChoose: (mode: ProcessIntegrationMode) => void
  onCancel: () => void
}

/**
 * How approved work comes in — merge, merge as one commit, or a pull request —
 * each with the one line that says what it does, in place of the decide row.
 */
export default function IntegrationChooser({
  workBranch,
  head = PROCESS_INTEGRATION_CHOOSER_HEAD,
  busy = false,
  onChoose,
  onCancel,
}: IntegrationChooserProps) {
  return (
    <div role="group" aria-label={head} className="flex w-full flex-col gap-2">
      <span className="text-[12.5px] font-semibold text-(--text-primary)">{head}</span>
      <div className="flex flex-col gap-1.5">
        {processIntegrationChoices(workBranch).map((choice) => (
          <button
            key={choice.mode}
            type="button"
            disabled={busy}
            onClick={() => onChoose(choice.mode)}
            className="flex w-full flex-col items-start gap-0.5 rounded-md border border-(--border-default) bg-(--surface-raised) px-3 py-2 text-left enabled:hover:border-(--accent-primary) enabled:hover:bg-(--accent-primary)/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50"
          >
            <span className="text-[12.5px] font-semibold text-(--text-primary)">
              {choice.label}
            </span>
            <span className="text-[11.5px] leading-snug text-(--text-secondary)">
              {choice.detail}
            </span>
          </button>
        ))}
      </div>
      <span className="text-[11px] text-(--text-muted)">{PROCESS_INTEGRATION_CHOOSER_NOTE}</span>
      <div>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          {PROCESS_INTEGRATION_CANCEL}
        </Button>
      </div>
    </div>
  )
}
