import { useMemo, useState } from 'react'

import {
  CODE_REVIEW_GROUP_BY_LABEL,
  CODE_REVIEW_GROUP_BY_OPTIONS,
  CODE_REVIEW_HOW_SHOWN_LABEL,
  CODE_REVIEW_SECTION_TITLES,
  CODE_REVIEW_UNPROVEN_CHIPS,
  CODE_REVIEW_WORTH_A_LOOK_LABEL,
  codeReviewFindingGroups,
  codeReviewView,
  fileNameSlug,
  type CodeReviewCriterionRow,
  type CodeReviewFindingGroup,
  type CodeReviewFindingRow,
  type CodeReviewFindingsGroupBy,
  type CodeReviewRecordedVerdict,
  type CodeReviewTile,
  type CodeReviewView,
  type EvidenceTile,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFile,
} from '../../../icons'
import Markdown from '../../Markdown'
import { ReportTab } from '../../chat/signoff'
import { downloadDataUri } from '../../chat/signoff/download'
import SignoffSection from './SignoffSection'
import { REVIEW_TONE_BADGE, REVIEW_TONE_SURFACE, REVIEW_TONE_TEXT } from './tones'

export type CodeReviewPanelProps = {
  /** The newest code review filed for the scope. */
  review: EvidenceTile
  /** The verdict the run's ledger kept for this review — the badge's source when given. */
  verdict?: CodeReviewRecordedVerdict
}

type Filter = CodeReviewTile['key'] | undefined

/**
 * A code review in its four fixed sections — Verdict (highlighted, with tiles
 * that filter the findings), Findings by severity with the nits folded,
 * Acceptance criteria, Evidence. A review that cannot be read as sections is
 * shown as the markdown it was filed as.
 */
export default function CodeReviewPanel({ review, verdict }: CodeReviewPanelProps) {
  const view = useMemo(() => codeReviewView(review, verdict), [review, verdict])
  const [filter, setFilter] = useState<Filter>()
  const [groupBy, setGroupBy] = useState<CodeReviewFindingsGroupBy>('severity')

  if (!view) return <ReportTab reports={[review]} />

  const severity = filter === 'criteria' ? undefined : filter
  const groups = codeReviewFindingGroups(view.findings, groupBy, severity)
  const markdown = view.markdown

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-(--text-secondary)">{review.caption}</span>
        {markdown ? (
          <Button
            variant="secondary"
            size="icon"
            aria-label="Download the review"
            title="Download (.md)"
            onClick={() =>
              downloadDataUri(
                `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`,
                `${fileNameSlug(review.caption, 'code-review')}.md`,
              )
            }
          >
            <IconDownload className="size-4" />
          </Button>
        ) : null}
      </div>

      <section
        aria-label="Verdict"
        className={`flex flex-col gap-3 rounded-lg border p-4 ${REVIEW_TONE_SURFACE[view.verdict.tone]}`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`badge badge--bold ${REVIEW_TONE_BADGE[view.verdict.tone]}`}>
            {view.verdict.key === 'approved' ? <IconCheck className="size-3.5" /> : null}
            {view.verdict.label}
          </span>
          <span className="text-[14.5px] font-semibold text-(--text-primary)">
            <Markdown text={view.headline} inline />
          </span>
        </div>
        {view.detail ? (
          <div className="max-w-[78ch] text-[13px] text-(--text-primary)">
            <Markdown text={view.detail} />
          </div>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2">
          {view.tiles.map((tile) => {
            const active = filter === tile.key
            return (
              <button
                key={tile.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(tile.key === 'criteria' || active ? undefined : tile.key)}
                className={`flex flex-col items-start rounded-md border bg-(--surface-raised) px-2.5 py-2 text-left ${active ? 'border-2 border-(--accent-primary)' : 'border-(--border-subtle)'}`}
              >
                <span
                  className={`text-[20px] font-bold tabular-nums ${REVIEW_TONE_TEXT[tile.tone]}`}
                >
                  {tile.count}
                </span>
                <span className="text-[11.5px] text-(--text-secondary)">{tile.label}</span>
              </button>
            )
          })}
        </div>
        {view.worthALook ? (
          <div className="flex items-start gap-2 text-[12.5px] text-(--text-secondary)">
            <span className="shrink-0 font-semibold">{CODE_REVIEW_WORTH_A_LOOK_LABEL}</span>
            <Markdown text={view.worthALook} inline />
          </div>
        ) : null}
      </section>

      <div>
        <SignoffSection
          title={CODE_REVIEW_SECTION_TITLES.findings}
          summary={severity ? `Showing ${severity} only` : view.findingsSummary}
          defaultOpen
        >
          <div className="flex flex-col gap-2.5">
            {view.findings.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-(--text-secondary)">
                  {CODE_REVIEW_GROUP_BY_LABEL}
                </span>
                {CODE_REVIEW_GROUP_BY_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={groupBy === option.key}
                    onClick={() => setGroupBy(option.key)}
                    className={`h-6.5 rounded-full border px-2.5 text-[12px] ${groupBy === option.key ? 'border-(--accent-primary) bg-(--accent-soft-bg) text-(--accent-primary)' : 'border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)'}`}
                  >
                    {option.label}
                  </button>
                ))}
                {severity ? (
                  <button
                    type="button"
                    onClick={() => setFilter(undefined)}
                    className="h-6.5 rounded-full border border-(--border-subtle) px-2.5 text-[12px] text-(--text-secondary) hover:bg-(--surface-hover)"
                  >
                    All severities
                  </button>
                ) : null}
              </div>
            ) : null}
            {groups.map((group) => (
              <FindingGroup key={`${groupBy}-${group.key}-${severity ?? ''}`} group={group} />
            ))}
            {view.findings.length === 0 ? (
              <span className="text-[12.5px] text-(--text-secondary)">Nothing was found.</span>
            ) : null}
          </div>
        </SignoffSection>

        <SignoffSection
          title={CODE_REVIEW_SECTION_TITLES.criteria}
          summary={view.criteriaSummary}
          defaultOpen
        >
          {view.criteria.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
              {view.criteria.map((c) => (
                <CriterionRow key={c.key} criterion={c} />
              ))}
            </div>
          ) : (
            <span className="text-[12.5px] text-(--text-secondary)">
              The review listed no criteria.
            </span>
          )}
        </SignoffSection>

        <SignoffSection title={CODE_REVIEW_SECTION_TITLES.evidence} summary={view.evidenceSummary}>
          <EvidenceCard view={view} />
        </SignoffSection>
      </div>
    </div>
  )
}

/** A group of findings — a severity or a file — folding its cards under one header. */
function FindingGroup({ group }: { group: CodeReviewFindingGroup }) {
  const [open, setOpen] = useState(group.defaultOpen)
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 bg-(--surface-sunken) px-3.5 py-2.5 text-left text-[13px]"
      >
        {group.kind === 'severity' ? (
          <span className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[group.tone]}`}>
            {group.title}
          </span>
        ) : (
          <code className="font-mono text-[12px] font-semibold text-(--text-primary) [overflow-wrap:anywhere]">
            {group.title}
          </code>
        )}
        <span className="flex-1 text-(--text-secondary)">{group.count}</span>
        <IconChevronDown
          className={`size-3.5 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="flex flex-col">
          {group.rows.map((f) => (
            <FindingCard key={f.key} finding={f} showSeverity={group.kind === 'file'} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** One finding: severity, the file as a chip, the symbol, a short title, then the explanation at reading width. */
function FindingCard({
  finding,
  showSeverity,
}: {
  finding: CodeReviewFindingRow
  showSeverity: boolean
}) {
  const { place } = finding
  return (
    <div className="flex flex-col gap-1.5 border-t border-(--border-subtle) px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSeverity ? (
          <span className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[finding.tone]}`}>
            {finding.severity}
          </span>
        ) : null}
        {place.file ? (
          <span
            title={place.line ? `${place.file}:${place.line}` : place.file}
            className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-sunken) px-2 font-mono text-[12px] text-(--text-primary)"
          >
            <IconFile className="size-3 shrink-0 text-(--text-secondary)" />
            <span className="truncate">{place.file}</span>
            {place.line ? <span className="text-(--text-secondary)">:{place.line}</span> : null}
          </span>
        ) : null}
        {place.symbol ? (
          <span className="font-mono text-[12px] text-(--text-secondary) [overflow-wrap:anywhere]">
            › {place.symbol}
          </span>
        ) : null}
        {place.prose ? (
          <span className="text-[12px] text-(--text-secondary)">
            <Markdown text={place.prose} inline />
          </span>
        ) : null}
        {finding.title ? (
          <span className="text-[13px] font-semibold text-(--text-primary)">
            <Markdown text={finding.title} inline />
          </span>
        ) : null}
      </div>
      {finding.text ? (
        <div className="max-w-[76ch] text-[13px] text-(--text-secondary)">
          <Markdown text={finding.text} inline />
        </div>
      ) : null}
    </div>
  )
}

/** One criterion on one line — mark, criterion, status — with how and where it was shown opening under it. */
function CriterionRow({ criterion: c }: { criterion: CodeReviewCriterionRow }) {
  const [open, setOpen] = useState(false)
  const head = (
    <>
      <span className={`text-[13px] font-bold ${REVIEW_TONE_TEXT[c.tone]}`} aria-hidden>
        {c.mark}
      </span>
      <span className="min-w-0 text-[13px] text-(--text-primary)">
        <Markdown text={c.text} inline />
      </span>
      <span className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[c.tone]}`}>
        {c.statusLabel}
      </span>
    </>
  )
  const grid =
    'grid w-full grid-cols-[18px_minmax(0,1fr)_auto_14px] items-center gap-2.5 px-3.5 py-2.5'
  return (
    <div className="border-t border-(--border-subtle) first:border-t-0">
      {c.where ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`${grid} text-left hover:bg-(--surface-hover)`}
        >
          {head}
          <IconChevronRight
            className={`size-3 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <div className={grid}>
          {head}
          <span />
        </div>
      )}
      {open && c.where ? (
        <div className="flex flex-wrap items-baseline gap-1.5 pb-3 pl-11.5 pr-3.5 text-[12.5px] text-(--text-secondary)">
          <span className="font-semibold text-(--text-primary)">{CODE_REVIEW_HOW_SHOWN_LABEL}</span>
          {c.where.code ? (
            <code className="rounded bg-(--surface-sunken) px-1.5 py-px font-mono text-[12px] [overflow-wrap:anywhere]">
              {c.where.text}
            </code>
          ) : (
            <Markdown text={c.where.text} inline />
          )}
        </div>
      ) : null}
    </div>
  )
}

/** What the evidence shows, and what it leaves unproven — a list, a "nothing" chip, or a dashed "not said" chip. */
function EvidenceCard({ view }: { view: Pick<CodeReviewView, 'showsItems' | 'unproven'> }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-(--border-subtle) px-3.5 py-3">
      <span
        className={`text-[11.5px] font-semibold uppercase tracking-wide ${REVIEW_TONE_TEXT.done}`}
      >
        {CODE_REVIEW_SECTION_TITLES.shows}
      </span>
      {view.showsItems.length > 0 ? (
        view.showsItems.map((item, i) => (
          <div key={i} className="flex gap-2 text-[13px] text-(--text-primary)">
            <span className={`shrink-0 ${REVIEW_TONE_TEXT.done}`} aria-hidden>
              ✓
            </span>
            <span className="max-w-[76ch]">
              <Markdown text={item} inline />
            </span>
          </div>
        ))
      ) : (
        <span className="text-[13px] text-(--text-secondary)">—</span>
      )}
      {view.unproven.state === 'listed' ? (
        <>
          <span
            className={`mt-1.5 text-[11.5px] font-semibold uppercase tracking-wide ${REVIEW_TONE_TEXT.working}`}
          >
            {CODE_REVIEW_SECTION_TITLES.unproven}
          </span>
          {view.unproven.items.map((item, i) => (
            <div key={i} className="flex gap-2 text-[13px] text-(--text-primary)">
              <span className={`shrink-0 font-bold ${REVIEW_TONE_TEXT.working}`} aria-hidden>
                !
              </span>
              <span className="max-w-[76ch]">
                <Markdown text={item} inline />
              </span>
            </div>
          ))}
        </>
      ) : view.unproven.state === 'none' ? (
        <span className="badge badge--soft badge--sm badge--done mt-1.5 self-start">
          <IconCheck className="size-3" />
          {CODE_REVIEW_UNPROVEN_CHIPS.none}
        </span>
      ) : (
        <span className="mt-1.5 inline-flex h-6 items-center self-start rounded-full border border-dashed border-(--status-working-soft-border) px-2.5 text-[12px] text-(--status-working-soft-fg)">
          {CODE_REVIEW_UNPROVEN_CHIPS.unstated}
        </span>
      )}
    </div>
  )
}
