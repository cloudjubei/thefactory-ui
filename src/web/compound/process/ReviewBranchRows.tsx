import { useState } from 'react'

import { REVIEW_PUSH_COPY as COPY } from '../../../headless/utils/colleagueReviewBranchUpdatesConstants'
import type { ColleagueReviewBranchRow } from '../../../headless/utils/colleagueReviewBranchUpdatesTypes'
import ToneBadge from '../chips/ToneBadge'
import { DiffViewer, type IntraMode } from '../diff/DiffViewer'

function BranchRow({ row, diffOpen }: { row: ColleagueReviewBranchRow; diffOpen: boolean }) {
  const [open, setOpen] = useState(diffOpen)
  const [wrap, setWrap] = useState(true)
  const [ignoreWS, setIgnoreWS] = useState(false)
  const [intra, setIntra] = useState<IntraMode>('word')
  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-(--text-primary) underline"
        >
          {row.name}
        </a>
        <ToneBadge tone={row.tone}>{row.stateLabel}</ToneBadge>
        {row.checksPassed !== undefined ? (
          <ToneBadge tone={row.checksPassed ? 'done' : 'stuck'}>
            {row.checksPassed ? COPY.checksPassed : COPY.checksFailed}
          </ToneBadge>
        ) : null}
        {row.branches ? <span className="text-(--text-muted)">{row.branches}</span> : null}
      </div>
      {row.detail ? <p className="m-0 text-(--text-secondary)">{row.detail}</p> : null}
      {row.files.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11.5px] font-medium text-(--text-muted)">{COPY.files}</span>
          <span className="break-all font-mono text-[12px] text-(--text-primary)">
            {row.files.join(', ')}
          </span>
        </div>
      ) : null}
      {row.diffStat ? (
        <pre className="m-0 overflow-x-auto whitespace-pre font-mono text-[11.5px] text-(--text-secondary)">
          {row.diffStat}
        </pre>
      ) : null}
      {row.checks.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {row.checks.map((check) => (
            <ToneBadge
              key={check.label}
              tone={check.passed ? 'done' : 'stuck'}
              title={check.summary}
            >
              {`${check.label}: ${check.summary}`}
            </ToneBadge>
          ))}
        </div>
      ) : row.checksPassed === undefined && row.stateLabel === 'Resolved' ? (
        <span className="text-(--text-muted)">{COPY.noChecks}</span>
      ) : null}
      {row.diff ? (
        <>
          <button
            type="button"
            className="self-start text-[11.5px] underline text-(--text-secondary)"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? COPY.hideDiff : COPY.showDiff}
          </button>
          {open ? (
            <div className="max-h-[50vh] overflow-auto rounded-md border border-(--border-subtle)">
              <DiffViewer
                patch={row.diff}
                wrap={wrap}
                ignoreWS={ignoreWS}
                intra={intra}
                onWrapChange={setWrap}
                onIgnoreWSChange={setIgnoreWS}
                onIntraChange={setIntra}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  )
}

export type ReviewBranchRowsProps = {
  rows: readonly ColleagueReviewBranchRow[]
  /** Start with every diff open — for a fixed showcase state. */
  diffOpen?: boolean
}

/** Each pull request of a review run's push approval: its state, the files that conflicted, the changes, the checks and the diff. */
export default function ReviewBranchRows({ rows, diffOpen = false }: ReviewBranchRowsProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row) => (
        <BranchRow key={row.url} row={row} diffOpen={diffOpen} />
      ))}
    </ul>
  )
}
