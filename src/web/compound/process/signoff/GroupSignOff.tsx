import { useState, type ReactNode } from 'react'

import {
  GROUP_SIGN_OFF_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_TEXT,
  groupSignOffAnswers,
  requestProofChoices,
  type GroupSignOffAttachmentRow,
  type GroupSignOffDecision,
  type GroupSignOffLayout,
  type GroupSignOffRepoRow,
  type GroupSignOffScreen,
  type GroupSignOffSubmittedLayout,
  type ParkAnswerView,
  type SignOffOutputActions,
  type SignOffOutputChipView,
  type SignOffOutputLayout,
} from '../../../../headless'
import { IconChevronRight, IconDownload } from '../../../icons'
import Alert from '../../../primitives/Alert'
import { Button } from '../../../primitives/Button'
import SegmentedControl from '../../../primitives/SegmentedControl'
import Spinner from '../../../primitives/Spinner'
import TicketChip from '../../chips/TicketChip'
import ToneBadge from '../../chips/ToneBadge'
import ParkAnswers from '../ParkAnswers'
import ParkNoteComposer from '../ParkNoteComposer'
import RunNeedsYouCard from '../RunNeedsYouCard'
import type { StorySignoffExtraChip } from '../StorySignoffReview'
import SignOffOutputPanel from './SignOffOutputPanel'
import TicketPostNote, { type TicketPostNoteProps } from './TicketPostNote'

export type GroupSignOffProps = {
  screen: GroupSignOffScreen
  outputs: readonly SignOffOutputChipView[]
  outputActions: SignOffOutputActions
  acting?: string | undefined
  actionError?: string | null
  onDecide: (decision: GroupSignOffDecision) => Promise<boolean>
  onRetry: () => Promise<boolean>
  onDownload: (row: GroupSignOffAttachmentRow) => void
  /** Open a repo's own run. */
  onOpenRun: (runId: string, projectId: string) => void
  /** A repo's proof, with the output chips set beside its own. */
  renderEvidence: (repo: GroupSignOffRepoRow, chips: readonly StorySignoffExtraChip[]) => ReactNode
  /** What is still to record, once the pull requests are open. */
  loom?: ReactNode
  layout?: GroupSignOffLayout
  outputLayout?: SignOffOutputLayout
  submittedLayout?: GroupSignOffSubmittedLayout
  /** Open on Request changes — for a fixed showcase state. */
  requesting?: boolean
  /** How the note of what would post is drawn — for a fixed showcase state. */
  ticketPost?: Pick<TicketPostNoteProps, 'layout' | 'startOpen'>
}

function Heading({ children }: { children: string }) {
  return (
    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
      {children}
    </span>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-4 py-3.5 sm:px-5"
    >
      <Heading>{title}</Heading>
      {children}
    </section>
  )
}

function RepoFacts({ repo, plain = false }: { repo: GroupSignOffRepoRow; plain?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-[12px] text-(--text-secondary)">
      {repo.prTitle ? (
        <span className="wrap-break-word font-medium text-(--text-primary)">{repo.prTitle}</span>
      ) : null}
      {repo.line ? <span className="wrap-break-word">{repo.line}</span> : null}
      {repo.filesLine || repo.branchLine ? (
        <span className="wrap-anywhere text-(--text-muted)">
          {[repo.filesLine, repo.branchLine].filter(Boolean).join(' · ')}
        </span>
      ) : null}
      {repo.link && !plain ? (
        <a
          href={repo.link.url}
          target="_blank"
          rel="noreferrer noopener"
          className="w-fit font-medium text-(--accent-primary) hover:underline"
        >
          {repo.link.label}
        </a>
      ) : null}
      {repo.error && !plain ? <Alert variant="error">{repo.error}</Alert> : null}
    </div>
  )
}

function RepoHead({ repo }: { repo: GroupSignOffRepoRow }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="min-w-0 truncate text-[13px] font-semibold text-(--text-primary)">
        {repo.name}
      </span>
      <ToneBadge tone={repo.badge.tone}>{repo.badge.label}</ToneBadge>
      {repo.busy ? <Spinner size={12} /> : null}
    </div>
  )
}

function RepoRows({
  repos,
  onOpenRun,
  ticketPost,
}: {
  repos: readonly GroupSignOffRepoRow[]
  onOpenRun: GroupSignOffProps['onOpenRun']
  ticketPost?: GroupSignOffProps['ticketPost']
}) {
  return (
    <div className="flex flex-col divide-y divide-(--border-subtle) rounded-lg border border-(--border-subtle) bg-(--surface-base)">
      {repos.map((repo) => (
        <div key={repo.legId} className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <RepoHead repo={repo} />
            {repo.runId ? (
              <button
                type="button"
                className="ml-auto shrink-0 text-[12px] font-medium text-(--text-secondary) hover:text-(--text-primary) hover:underline"
                onClick={() => onOpenRun(repo.runId!, repo.projectId)}
              >
                {GROUP_SIGN_OFF_TEXT.openRun}
              </button>
            ) : null}
          </div>
          <RepoFacts repo={repo} />
          {repo.ticketPost ? <TicketPostNote view={repo.ticketPost} {...ticketPost} /> : null}
        </div>
      ))}
    </div>
  )
}

function Head({ screen }: { screen: GroupSignOffScreen }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 text-[17px] font-semibold leading-snug text-(--text-primary)">
          {screen.title}
        </span>
        {screen.tickets.map((ticket) => (
          <TicketChip key={ticket.key} view={ticket} />
        ))}
      </div>
      <span className="text-[12.5px] text-(--text-secondary)">{screen.line}</span>
    </div>
  )
}

function GoingLive({ words }: { words: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Heading>{GROUP_SIGN_OFF_TEXT.goingLive}</Heading>
      <span className="text-[12.5px] text-(--text-primary)">{words}</span>
    </div>
  )
}

function RequestChanges({
  repos,
  busy,
  requestedLeg,
  onPick,
  onSend,
  onCancel,
}: {
  repos: readonly GroupSignOffRepoRow[]
  busy: boolean
  requestedLeg: string | undefined
  onPick: (legId: string) => void
  onSend: Parameters<typeof ParkNoteComposer>[0]['onSend']
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Heading>{GROUP_SIGN_OFF_TEXT.whichRepo}</Heading>
      <SegmentedControl
        size="sm"
        ariaLabel={GROUP_SIGN_OFF_TEXT.whichRepoLabel}
        value={requestedLeg ?? ''}
        onChange={onPick}
        options={repos.map((r) => ({ value: r.legId, label: r.name }))}
        className="w-fit max-w-full"
      />
      <fieldset disabled={busy || !requestedLeg} className="m-0 min-w-0 border-0 p-0">
        <ParkNoteComposer
          proofChoices={requestProofChoices()}
          onSend={onSend}
          onCancel={onCancel}
        />
      </fieldset>
    </div>
  )
}

function Decision({
  screen,
  acting,
  actionError,
  onDecide,
  repoRows,
  requesting,
}: Pick<GroupSignOffProps, 'screen' | 'acting' | 'actionError' | 'onDecide' | 'requesting'> & {
  repoRows: ReactNode
}) {
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [noting, setNoting] = useState(requesting === true)
  const [legId, setLegId] = useState(screen.sendBack[0]?.legId)
  const busy = acting !== undefined || screen.unsaved.length > 0
  const answers = groupSignOffAnswers(screen.choices, selected)
  const send = (answer: ParkAnswerView) => {
    if (answer.choice === 'request-changes') return setNoting(true)
    void onDecide({ choice: answer.choice as 'approve' | 'reject' })
  }
  return (
    <RunNeedsYouCard
      className=""
      tone="review"
      where={<ToneBadge tone={screen.badge.tone}>{screen.badge.label}</ToneBadge>}
    >
      <Head screen={screen} />
      {repoRows}
      {screen.plan ? (
        <span className="text-[13px] font-medium text-(--text-primary)">{screen.plan}</span>
      ) : null}
      {screen.goingLive ? <GoingLive words={screen.goingLive} /> : null}
      {screen.loomLeft > 0 ? (
        <span className="text-[12.5px] text-(--text-secondary)">
          {GROUP_SIGN_OFF_TEXT.loomLeft(screen.loomLeft)}
        </span>
      ) : null}
      {screen.unsaved.length > 0 ? (
        <Alert variant="info">{GROUP_SIGN_OFF_TEXT.unsaved(screen.unsaved.join(' and '))}</Alert>
      ) : null}
      {noting ? (
        <RequestChanges
          repos={screen.sendBack}
          busy={busy}
          requestedLeg={legId}
          onPick={setLegId}
          onCancel={() => setNoting(false)}
          onSend={(note, requestedProof) =>
            void onDecide({
              choice: 'request-changes',
              ...(legId ? { legId } : {}),
              ...(note ? { note } : {}),
              ...(requestedProof?.length ? { requestedProof } : {}),
            }).then((ok) => {
              if (ok) setNoting(false)
            })
          }
        />
      ) : (
        <ParkAnswers view={answers} busy={busy} onSelect={setSelected} onSend={send} />
      )}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
    </RunNeedsYouCard>
  )
}

function Attachments({
  rows,
  onDownload,
}: {
  rows: readonly GroupSignOffAttachmentRow[]
  onDownload: GroupSignOffProps['onDownload']
}) {
  if (rows.length === 0) {
    return (
      <span className="text-[12.5px] text-(--text-muted)">{GROUP_SIGN_OFF_TEXT.attachNone}</span>
    )
  }
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) rounded-lg border border-(--border-subtle) bg-(--surface-base) p-0">
      {rows.map((row) => (
        <li key={row.key} className="flex min-w-0 flex-col gap-1 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="wrap-break-word text-[12.5px] font-medium text-(--text-primary)">
                {row.name}
              </span>
              <span className="text-[11.5px] text-(--text-muted)">
                {row.kindLabel} · {row.projectName}
              </span>
            </span>
            {row.link ? (
              <a
                href={row.link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="shrink-0 text-[12px] font-medium text-(--accent-primary) hover:underline"
              >
                {row.link.label}
              </a>
            ) : row.attachment.downloadPath ? (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1.5"
                loading={row.busy}
                onClick={() => onDownload(row)}
              >
                <IconDownload className="size-3.5" />
                {GROUP_SIGN_OFF_TEXT.download}
              </Button>
            ) : null}
          </div>
          {row.error ? <Alert variant="error">{row.error}</Alert> : null}
        </li>
      ))}
    </ul>
  )
}

function Submitted({
  screen,
  outputs,
  outputActions,
  acting,
  actionError,
  onRetry,
  onDownload,
  onOpenRun,
  loom,
  submittedLayout = GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
}: GroupSignOffProps) {
  const posts = outputs.filter((o) => !o.panel.perRepo)
  const pullRequests = (
    <Card title={GROUP_SIGN_OFF_TEXT.pullRequests}>
      <RepoRows repos={screen.repos} onOpenRun={onOpenRun} />
      {screen.goingLive ? <GoingLive words={screen.goingLive} /> : null}
      {screen.canRetry ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            loading={acting === 'retry'}
            onClick={() => void onRetry()}
          >
            {GROUP_SIGN_OFF_TEXT.retry}
          </Button>
          <span className="text-[12px] text-(--text-secondary)">
            {GROUP_SIGN_OFF_TEXT.retryLine}
          </span>
        </div>
      ) : null}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
    </Card>
  )
  const post = posts.map((output) => (
    <Card key={output.key} title={output.panel.label}>
      <SignOffOutputPanel view={output.panel} actions={outputActions} flush />
    </Card>
  ))
  const attach = (
    <Card title={GROUP_SIGN_OFF_TEXT.attach}>
      <Attachments rows={screen.attachments} onDownload={onDownload} />
    </Card>
  )
  const record = loom ? <Card title={GROUP_SIGN_OFF_TEXT.record}>{loom}</Card> : null
  const head = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ToneBadge tone={screen.badge.tone}>{screen.badge.label}</ToneBadge>
      </div>
      <Head screen={screen} />
    </div>
  )
  if (submittedLayout === 'columns') {
    return (
      <div className="flex flex-col gap-4">
        {head}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            {pullRequests}
            {attach}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {post}
            {record}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {head}
      {submittedLayout === 'post-first' ? post : pullRequests}
      {submittedLayout === 'post-first' ? pullRequests : post}
      {record}
      {attach}
    </div>
  )
}

function RepoFold({
  repo,
  open,
  onToggle,
  ticketPost,
  children,
}: {
  repo: GroupSignOffRepoRow
  open: boolean
  onToggle: () => void
  ticketPost?: Pick<TicketPostNoteProps, 'layout' | 'startOpen'> | undefined
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full min-w-0 items-start gap-2 px-4 py-3 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <IconChevronRight
          className={`mt-1 size-3 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <RepoHead repo={repo} />
          <RepoFacts repo={repo} plain />
        </span>
      </button>
      {repo.error ? (
        <div className="px-4 pb-3">
          <Alert variant="error">{repo.error}</Alert>
        </div>
      ) : null}
      {repo.ticketPost ? (
        <div className="px-4 pb-3">
          <TicketPostNote view={repo.ticketPost} {...ticketPost} />
        </div>
      ) : null}
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  )
}

function EvidenceHeading({ children }: { children: ReactNode }) {
  return (
    <section aria-label={GROUP_SIGN_OFF_TEXT.evidence} className="flex min-w-0 flex-col gap-2">
      <Heading>{GROUP_SIGN_OFF_TEXT.evidence}</Heading>
      {children}
    </section>
  )
}

function Evidence({
  screen,
  outputs,
  outputActions,
  outputLayout,
  renderEvidence,
  layout,
  ticketPost,
}: Pick<
  GroupSignOffProps,
  'screen' | 'outputs' | 'outputActions' | 'outputLayout' | 'renderEvidence' | 'ticketPost'
> & { layout: GroupSignOffLayout }) {
  const { repos } = screen
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const shown = repos.find((r) => r.legId === picked) ?? repos[0]
  const chips: StorySignoffExtraChip[] = outputs.map((chip) => ({
    key: chip.key,
    row: chip.row,
    content: (
      <SignOffOutputPanel
        view={chip.panel}
        actions={outputActions}
        {...(outputLayout ? { layout: outputLayout } : {})}
      />
    ),
  }))
  if (!shown) return null
  if (layout === 'repo-folds') {
    return (
      <div className="flex flex-col gap-2">
        {repos.map((repo) => (
          <RepoFold
            key={repo.legId}
            repo={repo}
            open={repo.legId === shown.legId}
            onToggle={() => setPicked(repo.legId)}
            ticketPost={ticketPost}
          >
            {repo.legId === shown.legId ? renderEvidence(repo, chips) : null}
          </RepoFold>
        ))}
      </div>
    )
  }
  if (layout === 'side-by-side') {
    return (
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
        <div
          className="flex flex-col gap-1.5"
          role="tablist"
          aria-label={GROUP_SIGN_OFF_TEXT.repos}
        >
          {repos.map((repo) => (
            <button
              key={repo.legId}
              type="button"
              role="tab"
              aria-selected={repo.legId === shown.legId}
              onClick={() => setPicked(repo.legId)}
              className={`flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2 text-left hover:bg-(--surface-hover) ${
                repo.legId === shown.legId
                  ? 'border-(--accent-primary)/60 bg-(--surface-raised)'
                  : 'border-(--border-subtle) bg-(--surface-base)'
              }`}
            >
              <RepoHead repo={repo} />
              {repo.line ? (
                <span className="text-[11.5px] text-(--text-secondary)">{repo.line}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="min-w-0">{renderEvidence(shown, chips)}</div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {repos.length > 1 ? (
        <SegmentedControl
          size="sm"
          ariaLabel={GROUP_SIGN_OFF_TEXT.repos}
          value={shown.legId}
          onChange={setPicked}
          options={repos.map((r) => ({ value: r.legId, label: r.name }))}
          className="w-fit max-w-full"
        />
      ) : null}
      {renderEvidence(shown, chips)}
    </div>
  )
}

/**
 * A ticket's one sign-off across its repos, top to bottom: the decision, with
 * which repos get a pull request and why any are left out, and every repo's
 * evidence behind the same chips as a run's, the group's outputs beside them.
 * Once approved it shows what came of it and what is left to do by hand.
 */
export default function GroupSignOff(props: GroupSignOffProps) {
  const {
    screen,
    outputs,
    outputActions,
    acting,
    actionError,
    onDecide,
    onOpenRun,
    renderEvidence,
    layout = GROUP_SIGN_OFF_DEFAULT_LAYOUT,
    outputLayout,
    requesting,
    ticketPost,
  } = props
  const evidence = (
    <Evidence
      screen={screen}
      outputs={outputs}
      outputActions={outputActions}
      {...(outputLayout ? { outputLayout } : {})}
      {...(ticketPost ? { ticketPost } : {})}
      renderEvidence={renderEvidence}
      layout={layout}
    />
  )
  if (screen.phase === 'building' || screen.phase === 'ended') {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ToneBadge tone={screen.badge.tone}>{screen.badge.label}</ToneBadge>
          {screen.tickets.map((ticket) => (
            <TicketChip key={ticket.key} view={ticket} />
          ))}
        </div>
        <span className="text-[12.5px] text-(--text-secondary)">{screen.line}</span>
      </div>
    )
  }
  if (screen.phase === 'submitted') {
    return (
      <div className="flex flex-col gap-4">
        <Submitted {...props} />
        <EvidenceHeading>{evidence}</EvidenceHeading>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Decision
        screen={screen}
        acting={acting}
        actionError={actionError ?? null}
        onDecide={onDecide}
        requesting={requesting === true}
        repoRows={
          layout === 'decision-first' ? (
            <RepoRows repos={screen.repos} onOpenRun={onOpenRun} ticketPost={ticketPost} />
          ) : null
        }
      />
      <EvidenceHeading>{evidence}</EvidenceHeading>
    </div>
  )
}
