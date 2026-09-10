export type WorkBarProps = {
  /** What is running — "Verifying on a device", "Capturing screens". */
  label: string
}

/**
 * Takes the decision bar's place while an agent is producing evidence. Replaced,
 * not disabled: a greyed-out Approve still reads as a thing you could click; a
 * bar that has become something else reads as a state you are in.
 */
export default function WorkBar({ label }: WorkBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-3 py-2">
      <span className="badge badge--soft badge--working badge--sm">
        <span className="badge__dot badge__dot--hollow" />
        Agent working
      </span>
      <span className="text-[12px] font-semibold text-(--text-primary)">{label}</span>
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent text-(--status-working-soft-fg)" />
      <span className="basis-full text-[11.5px] text-(--text-secondary)">
        Keep reading — tabs, evidence and the comparison still work.{' '}
        <b className="text-(--text-primary)">Sign-off comes back when this finishes.</b>
      </span>
    </div>
  )
}
