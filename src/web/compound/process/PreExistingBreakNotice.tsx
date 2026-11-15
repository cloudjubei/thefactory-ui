import type { PreExistingBreakView, ProofPointList } from '../../../headless'

function Group({ list, mono }: { list: ProofPointList; mono: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {list.title}
      </span>
      <ul
        className={`m-0 flex list-none flex-col gap-0.5 p-0 text-[12.5px] text-(--text-primary) ${mono ? 'font-mono text-[12px]' : ''}`}
      >
        {list.items.map((item) => (
          <li key={item} className="[overflow-wrap:anywhere]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A check target already broken before the change, on its stop: the
 * headline, where it fails the same way, the failing files and checks, and
 * its first failing lines. The same for a checks stop and a waiting developer.
 * Native peer: `native/compound/process/PreExistingBreakNotice`.
 */
export default function PreExistingBreakNotice({
  view,
  heading = true,
}: {
  view: PreExistingBreakView
  /** Off where the card's own title already says the headline. */
  heading?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      {heading ? (
        <span className="text-[13.5px] font-semibold text-(--text-primary)">{view.headline}</span>
      ) : null}
      <span className="text-[12.5px] text-(--text-secondary)">{view.base}</span>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {view.files ? <Group list={view.files} mono /> : null}
        <Group list={view.checks} mono={false} />
      </div>
      {view.failing ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {view.failing.title}
          </span>
          <pre className="m-0 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border-l-2 border-(--border-strong) bg-(--surface-base) px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-(--text-primary)">
            {view.failing.text}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
