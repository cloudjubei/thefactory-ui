import { useRef, useState } from 'react'
import { formatVideoTime } from 'thefactory-tools/utils'

import {
  RUN_THROUGH_TEXT,
  runThroughTickPercent,
  useReviewEvidenceImage,
  type RunThroughIssueRow,
  type RunThroughRecordView,
  type RunThroughReportView,
} from '../../../../headless'
import { IconChevronRight, IconMonitor } from '../../../icons'
import { REVIEW_TONE_BADGE, REVIEW_TONE_FILL, REVIEW_TONE_TEXT } from '../../process/signoff/tones'
import EvidenceImageOverlay from '../EvidenceImageOverlay'
import { WalkthroughRecording } from './WalkthroughTab'

export type RunThroughTabProps = {
  projectId: string
  view: RunThroughReportView
}

function RecordHead({ record }: { record: RunThroughRecordView }) {
  return (
    <div className="flex max-w-[78ch] flex-col gap-1.5">
      <div className="flex items-baseline gap-2 text-[13px] text-(--text-primary)">
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)`}
        >
          {RUN_THROUGH_TEXT.scenario}
        </span>
        <span>{record.scenario}</span>
      </div>
      <div className="flex items-baseline gap-2 text-[13px] text-(--text-secondary)">
        <span
          aria-hidden
          className={`font-bold ${REVIEW_TONE_TEXT[record.reachedEnd ? 'done' : 'stuck']}`}
        >
          {record.reachedEnd ? '✓' : '✗'}
        </span>
        <span>{record.endLine}</span>
      </div>
      <p className="m-0 text-[13px] leading-normal text-(--text-secondary)">{record.summary}</p>
    </div>
  )
}

/** The moments under the recording: each issue a tick in its severity's colour, the playhead, and where it stopped. */
function MomentsBar({
  issues,
  reachedEnd,
  atSec,
  durationSec,
  onPick,
}: {
  issues: readonly RunThroughIssueRow[]
  reachedEnd: boolean
  atSec: number
  durationSec: number
  onPick: (row: RunThroughIssueRow) => void
}) {
  const playhead = runThroughTickPercent(atSec, durationSec) ?? 0
  return (
    <div className="flex items-center gap-2.5 text-[12px] tabular-nums text-(--text-secondary)">
      <span>{formatVideoTime(atSec)}</span>
      <div className="relative h-[18px] flex-1">
        <span className="absolute inset-x-0 top-[7px] h-1 rounded-sm bg-(--border-default)" />
        <span
          className="absolute left-0 top-[7px] h-1 rounded-sm bg-(--accent-primary)"
          style={{ width: `${playhead}%` }}
        />
        {issues.map((row) => {
          const left = runThroughTickPercent(row.atSec, durationSec)
          return left === undefined ? null : (
            <button
              key={row.key}
              type="button"
              title={`${row.time} · ${row.title}`}
              aria-label={RUN_THROUGH_TEXT.playFrom(row.time ?? '')}
              onClick={() => onPick(row)}
              className={`absolute top-0.5 h-3.5 w-1 -translate-x-1/2 cursor-pointer rounded-sm ${REVIEW_TONE_FILL[row.tone]}`}
              style={{ left: `${left}%` }}
            />
          )
        })}
        {reachedEnd ? null : (
          <span
            aria-hidden
            className="absolute right-0 top-0.5 h-3.5 w-0.5 rounded-sm bg-(--status-stuck-soft-fg)"
          />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute top-[3px] size-3 -translate-x-1/2 rounded-full bg-(--accent-primary) shadow-[0_0_0_2px_var(--surface-raised)]"
          style={{ left: `${playhead}%` }}
        />
      </div>
      <span>{formatVideoTime(durationSec)}</span>
    </div>
  )
}

function Screenshot({
  projectId,
  row,
  onOpen,
}: {
  projectId: string
  row: RunThroughIssueRow
  onOpen: (dataUri: string) => void
}) {
  const tile = row.screenshot
  const fetched = useReviewEvidenceImage(
    tile && !tile.dataUri ? projectId : undefined,
    tile?.ref.id,
    tile?.ref.mediaType,
  )
  const dataUri = tile?.dataUri ?? fetched.dataUri
  if (!tile) return null
  return (
    <button
      type="button"
      aria-label={RUN_THROUGH_TEXT.openShot(row.title)}
      disabled={!dataUri}
      onClick={() => dataUri && onOpen(dataUri)}
      className="block aspect-[16/10] w-[132px] cursor-zoom-in overflow-hidden rounded-md border border-(--border-subtle) bg-black hover:border-(--border-strong)"
    >
      {dataUri ? <img alt="" src={dataUri} className="block size-full object-cover" /> : null}
    </button>
  )
}

function IssueDetail({
  projectId,
  row,
  onOpenShot,
}: {
  projectId: string
  row: RunThroughIssueRow
  onOpenShot: (dataUri: string) => void
}) {
  const line = (label: string, text: string | undefined) =>
    text ? (
      <div className="flex gap-2 text-[12.5px] text-(--text-secondary)">
        <span className="shrink-0 font-semibold">{label}</span>
        <span>{text}</span>
      </div>
    ) : null
  return (
    <div className="flex flex-col gap-1.5 bg-(--accent-soft-bg) px-3 pb-3">
      <p className="m-0 text-[13px] leading-snug text-(--text-secondary)">{row.happened}</p>
      {line(RUN_THROUGH_TEXT.expected, row.expected)}
      {line(RUN_THROUGH_TEXT.doing, row.doing)}
      {row.screenshot || row.view ? (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Screenshot projectId={projectId} row={row} onOpen={onOpenShot} />
          {row.view ? (
            <span
              title={row.view}
              className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-sunken) px-2 font-mono text-[12px] text-(--text-primary)"
            >
              <IconMonitor className="size-3 shrink-0 text-(--text-secondary)" />
              <span className="truncate">{row.view}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * A tester's run-through on its own tab: the scenario, whether it reached the
 * end or where it stopped, and how it went; the run's recording with every
 * issue a tick on its moments; and the issues worst first, one open at a
 * time. Opening an issue plays its moment; its screenshot opens large.
 */
export default function RunThroughTab({ projectId, view }: RunThroughTabProps) {
  const [openKey, setOpenKey] = useState<string | undefined>(view.issues[0]?.key)
  const [time, setTime] = useState({ atSec: 0, durationSec: 0 })
  const [shot, setShot] = useState<
    { title: string; caption: string; dataUri: string } | undefined
  >()
  const seekRef = useRef<((atSec: number) => void) | null>(null)
  const { record, issues, recording } = view

  const play = (row: RunThroughIssueRow) => {
    if (row.atSec !== undefined) seekRef.current?.(row.atSec)
  }
  const pick = (row: RunThroughIssueRow) => {
    setOpenKey(row.key)
    play(row)
  }

  return (
    <div className="@container flex flex-col gap-3 pt-3">
      {record ? <RecordHead record={record} /> : null}
      <div className="grid grid-cols-1 items-start gap-3.5 @2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {recording ? (
          <WalkthroughRecording
            projectId={projectId}
            tile={recording}
            label={RUN_THROUGH_TEXT.recording}
            seekRef={seekRef}
            onProgress={(atSec, durationSec) => setTime({ atSec, durationSec })}
            footer={
              time.durationSec > 0 ? (
                <MomentsBar
                  issues={issues}
                  reachedEnd={record?.reachedEnd !== false}
                  atSec={time.atSec}
                  durationSec={time.durationSec}
                  onPick={pick}
                />
              ) : null
            }
          />
        ) : (
          <div className="grid h-[120px] place-items-center rounded-md border border-(--border-subtle) bg-(--surface-sunken) px-4 text-center text-[12px] text-(--text-secondary)">
            {RUN_THROUGH_TEXT.noRecording}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {RUN_THROUGH_TEXT.issues} · {view.issuesSummary}
          </span>
          <div className="flex flex-col overflow-hidden rounded-lg border border-(--border-subtle)">
            {issues.length === 0 ? (
              <span className="px-3 py-2.5 text-[12.5px] text-(--text-secondary)">
                {RUN_THROUGH_TEXT.nothingFlagged}
              </span>
            ) : (
              issues.map((row) => {
                const open = row.key === openKey
                return (
                  <div key={row.key} className="border-t border-(--border-subtle) first:border-t-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => {
                        setOpenKey(open ? undefined : row.key)
                        play(row)
                      }}
                      className={`grid w-full grid-cols-[auto_auto_minmax(0,1fr)_14px] items-center gap-2.5 px-3 py-2.5 text-left ${open ? 'bg-(--accent-soft-bg)' : 'hover:bg-(--surface-hover)'}`}
                    >
                      <span
                        className={`text-[12px] font-medium tabular-nums ${row.time && recording ? 'text-(--accent-primary)' : 'text-(--text-muted)'}`}
                      >
                        {row.time ?? '—'}
                      </span>
                      <span
                        className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[row.tone]}`}
                      >
                        {row.severity}
                      </span>
                      <span className="truncate text-[13px] font-semibold text-(--text-primary)">
                        {row.title}
                      </span>
                      <IconChevronRight
                        className={`size-3.5 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {open ? (
                      <IssueDetail
                        projectId={projectId}
                        row={row}
                        onOpenShot={(dataUri) =>
                          setShot({
                            title: row.title,
                            caption: [row.view, row.time].filter(Boolean).join(' · ') || row.title,
                            dataUri,
                          })
                        }
                      />
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      <EvidenceImageOverlay
        isOpen={shot !== undefined}
        onClose={() => setShot(undefined)}
        title={shot?.title ?? ''}
        images={shot ? [{ id: shot.title, caption: shot.caption, dataUri: shot.dataUri }] : []}
      />
    </div>
  )
}
