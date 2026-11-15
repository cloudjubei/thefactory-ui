import type { SignoffCarriedView } from '../../../../headless'

/**
 * Beside the build to try at a sign-off: "Try these" — the points no proving
 * step showed, carried on by a person, each group with what was shown — and
 * the targets left out of the proof, with where they already failed.
 * Native peer: `native/compound/process/signoff/SignoffCarriedCard`.
 */
export default function SignoffCarriedCard({ view }: { view: SignoffCarriedView }) {
  const { tryThese, leftOut } = view
  return (
    <section
      aria-label={tryThese?.title ?? leftOut?.title}
      className="flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4"
    >
      {tryThese ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-(--text-primary)">
              {tryThese.title}
            </span>
            <span className="text-[12px] text-(--status-working-soft-fg)">{tryThese.note}</span>
          </div>
          {tryThese.groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-[12.5px] leading-snug text-(--text-primary)">
                {group.points.map((point) => (
                  <li key={point} className="[overflow-wrap:anywhere]">
                    {point}
                  </li>
                ))}
              </ul>
              {group.shown ? (
                <span className="text-[11.5px] text-(--text-muted)">{group.shown}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {leftOut ? (
        <div
          className={`flex flex-col gap-1.5 ${tryThese ? 'border-t border-(--border-subtle) pt-3' : ''}`}
        >
          <span className="text-[13px] font-semibold text-(--text-primary)">{leftOut.title}</span>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {leftOut.rows.map((row) => (
              <li key={row.key} className="flex flex-col gap-0.5">
                <span className="font-mono text-[12px] text-(--text-primary) [overflow-wrap:anywhere]">
                  {row.target}
                </span>
                <span className="text-[11.5px] text-(--text-secondary)">{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
