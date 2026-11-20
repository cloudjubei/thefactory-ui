import { useState } from 'react'
import {
  PROCESS_PUBLISH_COPY,
  type ProcessPublishEdit,
  type ProcessPublishRow,
  type ProcessPublishView,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'

export interface PublishCardProps {
  /** The card; undefined while the repos are read. */
  view: ProcessPublishView | undefined
  readError?: string | null
  /** Inside the "Needs you" card, which draws the frame. */
  embedded?: boolean
  onEdit: (projectId: string, field: keyof ProcessPublishEdit, value: string) => void
  onPublish: () => void
  /** Stop the run here, once confirmed; no Stop without it. */
  onStop?: () => void
  /** Start on the confirm to stop. */
  initialStopping?: boolean
}

function RepoRow({
  row,
  busy,
  showAccount,
  onEdit,
}: {
  row: ProcessPublishRow
  busy: boolean
  /** Repos are pushed as different accounts, so each names its own. */
  showAccount: boolean
  onEdit: PublishCardProps['onEdit']
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 truncate text-[13px] font-semibold text-(--text-primary)">
          {row.name}
        </span>
        <span className="font-mono text-[11px] text-(--text-muted)">
          {PROCESS_PUBLISH_COPY.onto(row.baseBranch)}
        </span>
      </div>
      {row.changed ? (
        <>
          <Field
            label={PROCESS_PUBLISH_COPY.shortField}
            hint={
              row.branch ? (
                <code className="font-mono text-(--text-primary)">{row.branch}</code>
              ) : (
                PROCESS_PUBLISH_COPY.shortHint
              )
            }
            error={row.branchError}
          >
            <Input
              value={row.short}
              disabled={busy}
              spellCheck={false}
              onChange={(e) => onEdit(row.projectId, 'short', e.target.value)}
            />
          </Field>
          <Field label={PROCESS_PUBLISH_COPY.titleField} error={row.titleError}>
            <Input
              value={row.prTitle}
              disabled={busy}
              onChange={(e) => onEdit(row.projectId, 'prTitle', e.target.value)}
            />
          </Field>
          {!row.account ? (
            <span className="text-[11.5px] text-(--status-on_hold-soft-fg)">
              {PROCESS_PUBLISH_COPY.noAccount}
            </span>
          ) : showAccount ? (
            <span className="text-[12px] text-(--text-secondary)">
              {PROCESS_PUBLISH_COPY.account}{' '}
              <span className="font-medium text-(--text-primary)">{row.account}</span>
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-[12px] text-(--text-secondary)">
          {PROCESS_PUBLISH_COPY.noChanges}
        </span>
      )}
      {row.notices ? (
        <ul
          aria-label={PROCESS_PUBLISH_COPY.notices}
          className="m-0 flex list-none flex-col gap-1 rounded-md border border-(--status-on_hold-soft-border) bg-(--status-on_hold-soft-bg) px-2.5 py-2"
        >
          {row.notices.map((notice) => (
            <li key={notice} className="text-[11.5px] leading-snug text-(--status-on_hold-soft-fg)">
              {notice}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * The publish gate of a pull-request-first run: each repo with its branch name
 * and its pull request's title, both editable, who it is pushed as, and
 * Open pull request or — where the run can be stopped from it — Stop. Native
 * peer: `native/compound/process/PublishCard`.
 */
export default function PublishCard({
  view,
  readError,
  embedded = false,
  onEdit,
  onPublish,
  onStop,
  initialStopping = false,
}: PublishCardProps) {
  const [stopping, setStopping] = useState(initialStopping)
  const busy = view?.publishing === true
  return (
    <div
      className={
        embedded
          ? 'flex flex-col gap-2.5'
          : 'mt-2 flex flex-col gap-2.5 rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) p-3'
      }
    >
      <div className="flex flex-col gap-0.5">
        <span
          className={
            embedded
              ? 'text-[17px] font-semibold leading-snug text-(--text-primary)'
              : 'text-[13px] font-semibold text-(--status-review-soft-fg)'
          }
        >
          {PROCESS_PUBLISH_COPY.title}
        </span>
        {view ? <span className="text-[12px] text-(--text-secondary)">{view.line}</span> : null}
      </div>
      {readError && !view ? <Alert>{readError}</Alert> : null}
      {!view ? (
        readError ? null : (
          <span className="text-[12px] text-(--text-secondary)">
            {PROCESS_PUBLISH_COPY.loading}
          </span>
        )
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {view.rows.map((row) => (
              <RepoRow
                key={row.projectId}
                row={row}
                busy={busy}
                showAccount={!view.account}
                onEdit={onEdit}
              />
            ))}
          </ul>
          {view.account ? (
            <span className="text-[12px] text-(--text-secondary)">
              {PROCESS_PUBLISH_COPY.account}{' '}
              <span className="font-medium text-(--text-primary)">{view.account}</span>
            </span>
          ) : null}
          {view.error ? <Alert>{view.error}</Alert> : null}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!view?.canPublish} loading={busy} onClick={onPublish}>
          {busy ? PROCESS_PUBLISH_COPY.publishing : PROCESS_PUBLISH_COPY.publish}
        </Button>
        {onStop ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStopping(true)}>
            {PROCESS_PUBLISH_COPY.stop}
          </Button>
        ) : null}
      </div>
      {stopping && onStop ? (
        <ConfirmDialog
          isOpen
          onClose={() => setStopping(false)}
          title={PROCESS_PUBLISH_COPY.stopTitle}
          description={PROCESS_PUBLISH_COPY.stopBody}
          confirmLabel={PROCESS_PUBLISH_COPY.stop}
          cancelLabel={PROCESS_PUBLISH_COPY.stopKeep}
          destructive
          onConfirm={() => {
            setStopping(false)
            onStop()
          }}
        />
      ) : null}
    </div>
  )
}
