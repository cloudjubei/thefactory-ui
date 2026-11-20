import type { ReviewRunWorkingView } from '../../../headless'
import ToneBadge from '../chips/ToneBadge'
import Spinner from '../../primitives/Spinner'
import { MergeSection } from './ColleagueReviewCard'

export type RunWorkingCardProps = {
  view: ReviewRunWorkingView
}

/**
 * A review run's card while it works off the chat, once the person chose:
 * the step it is on with the run's badge, and its round's merge pull request
 * by pull request — the merge drawn as the review card draws an inline one.
 * It only reports; the run's page decides the rest.
 */
export default function RunWorkingCard({ view }: RunWorkingCardProps) {
  return (
    <section
      aria-label={`${view.name} · ${view.step}`}
      aria-busy
      className="flex min-w-0 flex-col gap-2 text-[12.5px]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Spinner size={12} />
        <span className="min-w-0 truncate font-semibold text-(--text-primary)">
          {view.name} · {view.step}
        </span>
        <span className="ml-auto shrink-0">
          <ToneBadge tone={view.badge.tone}>{view.badge.label}</ToneBadge>
        </span>
      </div>
      {view.merge ? <MergeSection merge={view.merge} /> : null}
    </section>
  )
}
