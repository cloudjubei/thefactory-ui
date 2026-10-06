import type { ReviewTabId, SignoffReportView } from '../../../../headless'
import Markdown from '../../Markdown'
import NeedsYouSection from './NeedsYouSection'
import ReportTiles from './ReportTiles'
import SignoffSection from './SignoffSection'
import { REVIEW_TONE_TEXT } from './tones'

export type SignoffReportPanelProps = {
  view: SignoffReportView
  /** Switch the evidence card to the tab that holds a proof — instead of repeating it here. */
  onOpenTab?: (tab: ReviewTabId) => void
  /** Leave the tiles out — where the surrounding view already says them. */
  hideTiles?: boolean
}

/**
 * The final report as an overview: four tiles, then Outcome, How it was proven
 * (each line links to the tab with its proof), Decisions made and Needs you.
 * A report that could not be read as sections shows as its markdown.
 */
export default function SignoffReportPanel({
  view,
  onOpenTab,
  hideTiles,
}: SignoffReportPanelProps) {
  return (
    <div className="flex flex-col">
      {hideTiles ? null : <ReportTiles tiles={view.tiles} />}

      {view.outcome ? (
        <SignoffSection title={view.outcome.title} summary={view.outcome.summary} defaultOpen>
          <div className="max-w-[78ch] text-[13px] text-(--text-secondary)">
            <Markdown text={view.outcome.body.detail ?? view.outcome.body.headline} />
          </div>
        </SignoffSection>
      ) : null}

      {view.howProven ? (
        <SignoffSection title={view.howProven.title} summary={view.howProven.summary} defaultOpen>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {view.howProven.body.map((row) => (
              <li
                key={row.key}
                className="flex items-baseline gap-2 text-[13px] text-(--text-secondary)"
              >
                <span className={`shrink-0 font-bold ${REVIEW_TONE_TEXT[row.tone]}`} aria-hidden>
                  {row.mark}
                </span>
                <span>
                  <Markdown text={row.text} inline />
                  {row.tab && row.tabLabel && onOpenTab ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => onOpenTab(row.tab!)}
                        className="badge badge--soft badge--sm badge--review align-middle hover:opacity-80"
                      >
                        {row.tabLabel}
                      </button>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </SignoffSection>
      ) : null}

      {view.decisions ? (
        <SignoffSection title={view.decisions.title} summary={view.decisions.summary}>
          {view.decisions.body.length > 0 ? (
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[13px] text-(--text-secondary)">
              {view.decisions.body.map((d) => (
                <li key={d}>
                  <Markdown text={d} inline />
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[13px] text-(--text-secondary)">No decisions were recorded.</span>
          )}
        </SignoffSection>
      ) : null}

      {view.needsYou ? <NeedsYouSection section={view.needsYou} /> : null}

      {view.fallbackMarkdown ? (
        <div className="markdown-content border-t border-(--border-subtle) pt-3 text-[12.5px] leading-relaxed text-(--text-secondary)">
          <Markdown text={view.fallbackMarkdown} />
        </div>
      ) : null}
    </div>
  )
}
