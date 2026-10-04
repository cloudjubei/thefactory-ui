import {
  FEATURE_PROCESS_EXTEND_NOTE,
  FEATURE_PROCESS_FIX_NOTE,
  FEATURE_PROCESS_QUESTION,
  featureProcessOptions,
} from '../../../headless'

export type FeatureProcessChooserProps = {
  /** The way chosen so far — the story process's own until the person picks. */
  choice: string | undefined
  /** The new features join an open run, which works them its own way: nothing to choose. */
  joinsOpenRun?: boolean
  busy?: boolean
  onChoose: (processId: string) => void
}

/**
 * How the story's features are worked: a developer then a separate verifier,
 * or one agent that implements and proves its own change. The person's choice,
 * carried on the launch decision. Native peer:
 * `native/compound/chat/FeatureProcessChooser`.
 */
export default function FeatureProcessChooser({
  choice,
  joinsOpenRun = false,
  busy = false,
  onChoose,
}: FeatureProcessChooserProps) {
  return (
    <div
      role="radiogroup"
      aria-label={FEATURE_PROCESS_QUESTION}
      className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {FEATURE_PROCESS_QUESTION}
      </span>
      {joinsOpenRun ? (
        <span className="text-[11.5px] text-(--text-secondary)">{FEATURE_PROCESS_EXTEND_NOTE}</span>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {featureProcessOptions().map((option) => {
              const picked = choice === option.processId
              return (
                <button
                  key={option.processId}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  disabled={busy}
                  onClick={() => onChoose(option.processId)}
                  className={`flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50 ${
                    picked
                      ? 'border-(--accent-primary) bg-(--accent-primary)/10'
                      : 'border-(--border-default) bg-(--surface-raised) enabled:hover:border-(--accent-primary)'
                  }`}
                >
                  <span className="text-[12.5px] font-semibold text-(--text-primary)">
                    {option.label}
                  </span>
                  <span className="text-[11.5px] leading-snug text-(--text-secondary)">
                    {option.detail}
                  </span>
                </button>
              )
            })}
          </div>
          <span className="text-[10.5px] text-(--text-muted)">{FEATURE_PROCESS_FIX_NOTE}</span>
        </>
      )}
    </div>
  )
}
