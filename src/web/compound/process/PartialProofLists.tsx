import type { PartialProofView, ProofPointList } from '../../../headless'

function PointList({ list, muted }: { list: ProofPointList; muted: boolean }) {
  return (
    <ul
      className={`m-0 flex list-disc flex-col gap-0.5 pl-4 text-[12.5px] leading-snug ${muted ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}
    >
      {list.items.map((item) => (
        <li key={item} className="[overflow-wrap:anywhere]">
          {item}
        </li>
      ))}
    </ul>
  )
}

function ListTitle({ text }: { text: string }) {
  return (
    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
      {text}
    </span>
  )
}

/** The points a proof could not show, under a dashed rule that says none of them is proven. */
export function NotShownList({ view }: { view: PartialProofView }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-(--status-working-soft-border) bg-(--surface-base) px-2.5 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <ListTitle text={view.notShown.title} />
        <span className="text-[11.5px] font-medium text-(--status-working-soft-fg)">
          {view.notShown.caveat}
        </span>
      </div>
      <PointList list={view.notShown} muted />
    </div>
  )
}

/** A heading over what a proof did show — the thumbnails, or its list. */
export function ShownTitle({ view }: { view: PartialProofView }) {
  return <ListTitle text={view.shown.title} />
}

/**
 * What a proving step showed and what it could not, as two lists — the shown
 * points count on their own; the not-shown ones are marked as not proven.
 * Native peer: `native/compound/process/PartialProofLists`.
 */
export default function PartialProofLists({ view }: { view: PartialProofView }) {
  return (
    <div className="flex flex-col gap-2">
      {view.shown.items.length > 0 ? (
        <div className="flex flex-col gap-1">
          <ShownTitle view={view} />
          <PointList list={view.shown} muted={false} />
        </div>
      ) : null}
      <NotShownList view={view} />
    </div>
  )
}
