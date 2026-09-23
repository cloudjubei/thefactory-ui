import { useState } from 'react'

import { fileNameSlug, type EvidenceTile } from '../../../../headless'
import Markdown from '../../Markdown'
import { Button } from '../../../primitives/Button'
import { IconDownload } from '../../../icons'
import { HelpChip } from '../../chips'
import { downloadDataUri } from './download'

export type ReportTabProps = {
  reports: readonly EvidenceTile[]
}

function ReportCard({ report, showProvenance }: { report: EvidenceTile; showProvenance: boolean }) {
  const text = report.text
  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          Written by the verifier
        </span>
        {showProvenance ? (
          <HelpChip label="How this report was produced">
            <div className="font-semibold">Where this came from</div>
            <p className="mt-1">
              The verifier agent wrote it as its closing step, after building and driving the app.
              It is that agent's own account of what it did — not a summary of the diff, and not
              written by the agent that made the change.
            </p>
            <p className="mt-1 text-(--text-muted)">
              Filed as evidence on this run, so it cannot be edited afterwards.
            </p>
          </HelpChip>
        ) : null}
        <span className="flex-1" />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Save as markdown"
          title="Save as markdown"
          disabled={!text}
          onClick={() => {
            if (!text) return
            downloadDataUri(
              `data:text/markdown;charset=utf-8,${encodeURIComponent(text)}`,
              `${fileNameSlug(report.caption, 'report')}.md`,
            )
          }}
        >
          <IconDownload className="w-4 h-4" />
        </Button>
      </div>
      {text ? (
        <div className="markdown-content text-[12.5px] leading-relaxed text-(--text-secondary)">
          <Markdown text={text} />
        </div>
      ) : (
        <div className="text-[12px] text-(--text-muted)">Loading the report…</div>
      )}
    </section>
  )
}

/**
 * The verifier's written account — ONE report, not a wall.
 *
 * A feature accrues a report per fix-loop iteration; stacking every one as a full
 * "Written by the verifier" card turned the sign-off into a wall of near-identical
 * text. The AUTHORITATIVE report is the latest; earlier attempts fold behind a
 * disclosure so the history is there without drowning the current account.
 */
export default function ReportTab({ reports }: ReportTabProps) {
  const [showEarlier, setShowEarlier] = useState(false)
  if (reports.length === 0) return null
  // Newest first — the last report is the one that reflects the final state.
  const ordered = [...reports].sort((a, b) => (b.ref.createdAt ?? 0) - (a.ref.createdAt ?? 0))
  const [latest, ...earlier] = ordered
  return (
    <div className="flex flex-col gap-2">
      <ReportCard report={latest} showProvenance />
      {earlier.length > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowEarlier((v) => !v)}
            className="self-start text-[11.5px] text-(--accent-primary) hover:underline"
          >
            {showEarlier ? 'Hide' : 'Show'} {earlier.length} earlier report
            {earlier.length === 1 ? '' : 's'}
          </button>
          {showEarlier
            ? earlier.map((report) => (
                <ReportCard key={report.ref.id} report={report} showProvenance={false} />
              ))
            : null}
        </div>
      ) : null}
    </div>
  )
}
