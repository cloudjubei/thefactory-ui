import { fileNameSlug, type EvidenceTile } from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { IconDownload } from '../../../icons'
import { HelpChip } from '../../chips'
import { downloadDataUri } from './download'

export type ReportTabProps = {
  reports: readonly EvidenceTile[]
}

/**
 * The verifier's written account. The `?` explains provenance — who wrote it and
 * that it is filed, not editable — and save is an icon button like every other
 * save on this surface.
 */
export default function ReportTab({ reports }: ReportTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {reports.map((report) => {
        const text = report.text
        return (
          <section
            key={report.ref.id}
            className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Written by the verifier
              </span>
              <HelpChip label="How this report was produced">
                <div className="font-semibold">Where this came from</div>
                <p className="mt-1">
                  The verifier agent wrote it as its closing step, after building and driving the
                  app. It is that agent's own account of what it did — not a summary of the diff,
                  and not written by the agent that made the change.
                </p>
                <p className="mt-1 text-(--text-muted)">
                  Filed as evidence on this run, so it cannot be edited afterwards.
                </p>
              </HelpChip>
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
              <div className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-(--text-secondary)">
                {text}
              </div>
            ) : (
              <div className="text-[12px] text-(--text-muted)">Loading the report…</div>
            )}
          </section>
        )
      })}
    </div>
  )
}
