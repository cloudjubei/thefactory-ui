import { useState } from 'react'

import {
  fileNameSlug,
  orderReports,
  reportProvenance,
  type EvidenceTile,
} from '../../../../headless'
import Markdown from '../../Markdown'
import { Button } from '../../../primitives/Button'
import { IconDownload } from '../../../icons'
import { HelpChip } from '../../chips'
import { downloadDataUri } from './download'

export type ReportTabProps = {
  reports: readonly EvidenceTile[]
}

function ReportCard({ report }: { report: EvidenceTile }) {
  const text = report.text
  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
      <div className="flex items-center justify-end gap-2">
        <HelpChip label="How this report was produced">
          <div className="font-semibold">Where this came from</div>
          <p className="mt-1">{reportProvenance(report.ref)}</p>
          <p className="mt-1 text-(--text-muted)">
            Filed as evidence on this run, so it cannot be edited afterwards.
          </p>
        </HelpChip>
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
 * A written account — ONE report, not a wall.
 *
 * A feature accrues a report per fix-loop iteration; stacking every one as a full
 * "Written by the verifier" card turned the sign-off into a wall of near-identical
 * text. The report step's own account leads, then the latest; earlier ones fold
 * behind a disclosure so the history is there without drowning the current one.
 * Each card credits the step that wrote it.
 */
export default function ReportTab({ reports }: ReportTabProps) {
  const [showEarlier, setShowEarlier] = useState(false)
  if (reports.length === 0) return null
  const [latest, ...earlier] = orderReports(reports)
  return (
    <div className="flex flex-col gap-2">
      <ReportCard report={latest} />
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
            ? earlier.map((report) => <ReportCard key={report.ref.id} report={report} />)
            : null}
        </div>
      ) : null}
    </div>
  )
}
