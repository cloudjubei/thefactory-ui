import { useEffect, useRef, useState } from 'react'

import {
  RUN_THROUGH_ISSUE_CHOICES,
  RUN_THROUGH_REVIEW_COPY,
  runThroughIssueReviewKey,
  useReviewEvidenceImage,
  type EvidenceTile,
  type RunThroughIssueChoice,
  type RunThroughIssueCurrent,
  type RunThroughIssueDot,
  type RunThroughIssueReviewView,
  type RunThroughIssueStanding,
  type UseRunThroughIssueReview,
} from '../../../headless'
import { IconArrowLeftMini, IconArrowRightMini, IconChat, IconCheck, IconClose } from '../../icons'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'
import EvidenceReferenceChip from '../chips/EvidenceReferenceChip'
import { PROCESS_TONE_BADGE, REVIEW_TONE_BADGE } from './signoff/tones'

export type RunThroughIssueReviewPanelProps = {
  review: Pick<
    UseRunThroughIssueReview,
    'view' | 'isOpen' | 'close' | 'goTo' | 'move' | 'answer' | 'finish' | 'finishing'
  >
  projectId: string
  /** The app's project, where the fixes are made. */
  projectName: string
  /** The run's recording, for each issue's moment in it. */
  recording?: EvidenceTile
  /** Open the run's chat to talk an issue over. */
  onDiscuss?: () => void
}

const DOT_FILL: Record<RunThroughIssueStanding, string> = {
  fix: 'border-(--accent-primary) bg-(--accent-primary)',
  reply:
    'border-(--accent-primary) bg-(--accent-primary) ring-2 ring-(--accent-primary) ring-offset-2 ring-offset-(--surface-overlay)',
  'not-an-issue': 'border-(--text-muted) bg-(--text-muted)',
  open: 'border-(--border-strong) bg-transparent',
}

function Kbd({ children }: { children: string }) {
  return (
    <span className="inline-grid h-5 min-w-5 place-items-center rounded border border-(--border-default) bg-(--surface-base) px-1 font-mono text-[11px] font-semibold text-(--text-secondary)">
      {children}
    </span>
  )
}

function Dots({
  dots,
  onPick,
}: {
  dots: readonly RunThroughIssueDot[]
  onPick: (index: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {dots.map((dot) => (
          <button
            key={dot.key}
            type="button"
            title={dot.label}
            aria-label={dot.label}
            aria-current={dot.current ? 'step' : undefined}
            onClick={() => onPick(dot.index)}
            className={`grid size-[18px] cursor-pointer place-items-center rounded-full ${dot.current ? 'border-2 border-(--accent-primary)' : 'border-2 border-transparent'}`}
          >
            <span className={`block size-2.5 rounded-full border ${DOT_FILL[dot.standing]}`} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[11.5px] text-(--text-secondary) max-sm:hidden">
        {(['fix', 'not-an-issue', 'open'] as const).map((standing) => (
          <span key={standing} className="inline-flex items-center gap-1.5">
            <span className={`block size-2 rounded-full border ${DOT_FILL[standing]}`} />
            {RUN_THROUGH_REVIEW_COPY.legend[standing]}
          </span>
        ))}
      </div>
    </div>
  )
}

function Shot({
  projectId,
  current,
  recording,
}: {
  projectId: string
  current: RunThroughIssueCurrent
  recording: EvidenceTile | undefined
}) {
  const { row } = current
  const tile = row.screenshot
  const fetched = useReviewEvidenceImage(
    tile && !tile.dataUri ? projectId : undefined,
    tile?.ref.id,
    tile?.ref.mediaType,
  )
  const dataUri = tile?.dataUri ?? fetched.dataUri
  const atRecording = recording !== undefined && row.atSec !== undefined
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-(--border-subtle) bg-black">
        {dataUri ? (
          <img alt={row.title} src={dataUri} className="block size-full object-contain" />
        ) : (
          <div className="grid size-full place-items-center px-6 text-center text-[12.5px] text-white/70">
            {tile ? null : RUN_THROUGH_REVIEW_COPY.noShot}
          </div>
        )}
        {row.time ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-white">
            {row.time}
          </span>
        ) : null}
      </div>
      {atRecording || tile ? (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-(--text-secondary)">
          <EvidenceReferenceChip
            link={
              atRecording
                ? { kind: 'evidence', projectId, evidenceId: recording.ref.id, at: row.atSec }
                : { kind: 'evidence', projectId, evidenceId: row.key }
            }
          />
          <span>
            {atRecording ? RUN_THROUGH_REVIEW_COPY.moment : RUN_THROUGH_REVIEW_COPY.shotOnly}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function ChoiceButton({
  choice,
  chosen,
  onPick,
}: {
  choice: RunThroughIssueChoice
  chosen: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${chosen ? 'border-(--accent-primary) bg-(--accent-soft-bg) shadow-[0_0_0_1px_var(--accent-primary)]' : 'border-(--border-default) bg-(--surface-raised) hover:border-(--border-strong) hover:bg-(--surface-hover)'}`}
    >
      <Kbd>{choice.key}</Kbd>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold text-(--text-primary)">{choice.label}</span>
        <span className="text-[12px] text-(--text-secondary)">{choice.detail}</span>
      </span>
      {chosen ? <IconCheck className="size-4 shrink-0 text-(--accent-primary)" /> : null}
    </button>
  )
}

function Section({ label, text }: { label: string; text: string | undefined }) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </span>
      <p className="m-0 text-[13.5px] leading-normal text-(--text-primary)">{text}</p>
    </div>
  )
}

function IssueScreen({
  current,
  projectId,
  recording,
  replying,
  onReplying,
  onAnswer,
  onDiscuss,
}: {
  current: RunThroughIssueCurrent
  projectId: string
  recording: EvidenceTile | undefined
  replying: boolean
  onReplying: (on: boolean) => void
  onAnswer: (choice: RunThroughIssueChoice['id'], note?: string) => void
  onDiscuss: (() => void) | undefined
}) {
  const { row } = current
  const [draft, setDraft] = useState(current.note ?? '')
  useEffect(() => setDraft(current.note ?? ''), [row.key, current.note])
  const chosen = (id: RunThroughIssueChoice['id']) =>
    id === 'reply'
      ? current.standing === 'reply' || replying
      : !replying &&
        (id === 'fix' ? current.standing === 'fix' : current.standing === 'not-an-issue')
  return (
    <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Shot projectId={projectId} current={current} recording={recording} />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[row.tone]}`}>
            {row.severity}
          </span>
          <span className="text-[12.5px] text-(--text-muted)">
            {RUN_THROUGH_REVIEW_COPY.number(current.number)}
          </span>
        </div>
        <h2 className="m-0 text-[18px] font-semibold leading-snug text-(--text-primary)">
          {row.title}
        </h2>
        <Section label={RUN_THROUGH_REVIEW_COPY.happened} text={row.happened} />
        <Section label={RUN_THROUGH_REVIEW_COPY.expected} text={row.expected} />
        <div className="flex flex-col gap-2 pt-1">
          {RUN_THROUGH_ISSUE_CHOICES.map((choice) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              chosen={chosen(choice.id)}
              onPick={() => (choice.id === 'reply' ? onReplying(true) : onAnswer(choice.id))}
            />
          ))}
        </div>
        {replying ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (draft.trim()) onAnswer('reply', draft)
            }}
          >
            <Textarea
              autoFocus
              rows={3}
              aria-label={RUN_THROUGH_REVIEW_COPY.replyLabel}
              placeholder={RUN_THROUGH_REVIEW_COPY.replyPlaceholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  if (draft.trim()) onAnswer('reply', draft)
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => onReplying(false)}>
                {RUN_THROUGH_REVIEW_COPY.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                {RUN_THROUGH_REVIEW_COPY.save}
              </Button>
            </div>
          </form>
        ) : current.note ? (
          <div className="rounded-md border-l-2 border-(--accent-primary) bg-(--accent-soft-bg) px-3 py-2 text-[13px] leading-normal text-(--text-primary)">
            {current.note}
          </div>
        ) : null}
        {onDiscuss ? (
          <button
            type="button"
            onClick={onDiscuss}
            className="inline-flex items-center gap-1.5 self-start pt-1 text-[12.5px] font-medium text-(--text-secondary) hover:text-(--accent-primary)"
          >
            <IconChat className="size-3.5" />
            {RUN_THROUGH_REVIEW_COPY.discuss}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function SummaryScreen({
  view,
  onPick,
}: {
  view: RunThroughIssueReviewView
  onPick: (index: number) => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 p-4 sm:p-5">
      {view.groups.map((group) => (
        <section key={group.answer} className="flex flex-col gap-1.5">
          <h3 className="m-0 text-[13px] font-semibold text-(--text-primary)">{group.heading}</h3>
          {group.rows.map((r) => (
            <div key={r.row.key} className="flex flex-col">
              <button
                type="button"
                onClick={() => onPick(r.index)}
                className="flex w-full items-center gap-2.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2 text-left hover:border-(--border-strong) hover:bg-(--surface-hover)"
              >
                <span className={`badge badge--soft badge--sm ${REVIEW_TONE_BADGE[r.row.tone]}`}>
                  {r.row.severity}
                </span>
                <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-(--text-muted)">
                  {r.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-(--text-primary)">
                  {r.row.title}
                </span>
                <span
                  className={`badge badge--soft badge--sm shrink-0 ${PROCESS_TONE_BADGE[r.tone]}`}
                >
                  {r.badge}
                </span>
              </button>
              {r.note ? (
                <span className="px-9 pb-1 pt-1 text-[12.5px] italic text-(--text-secondary)">
                  “{r.note}”
                </span>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * Going over a run-through's issues one at a time, over the run page — the
 * whole screen on a phone: which issue of how many, a dot per issue coloured
 * by its answer, the screenshot at its moment, what happened and what was
 * expected, and three answers (keys 1, 2, 3; arrows move; Esc closes).
 * Answering moves to the next open issue; after the last, the answers grouped
 * and the one action that makes the fixes and closes the run.
 */
export default function RunThroughIssueReviewPanel({
  review,
  projectId,
  projectName,
  recording,
  onDiscuss,
}: RunThroughIssueReviewPanelProps) {
  const { view, isOpen, close, goTo, move, answer, finish, finishing } = review
  const [replying, setReplying] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const current = view.current
  const currentKey = current?.row.key
  useEffect(() => setReplying(false), [currentKey])

  const give = (choice: RunThroughIssueChoice['id'], note?: string) => {
    if (!current) return
    if (choice === 'reply') {
      if (note === undefined) return setReplying(true)
      setReplying(false)
      return answer(current.row.key, 'fix', note)
    }
    setReplying(false)
    answer(current.row.key, choice)
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('textarea, input, select, [contenteditable="true"]')) return
      const action = runThroughIssueReviewKey(e.key)
      if (!action) return
      e.preventDefault()
      if (action.kind === 'move') return move(action.by)
      if (current) give(action.choice)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onSummary = view.at === 'summary'
  const footer = onSummary ? (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-[1_1_240px] flex-col">
        <span className="text-[13.5px] font-semibold text-(--text-primary)">{view.tally}</span>
        <span className="text-[12px] text-(--text-secondary)">
          {view.allAnswered
            ? RUN_THROUGH_REVIEW_COPY.createDoes(view.fixes, projectName)
            : RUN_THROUGH_REVIEW_COPY.openFirst(view.open)}
        </span>
      </div>
      <Button
        variant="outline"
        className="max-sm:w-full"
        disabled={!view.allAnswered}
        loading={finishing}
        onClick={finish}
      >
        {RUN_THROUGH_REVIEW_COPY.create(view.fixes, projectName)}
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="secondary" onClick={() => move(-1)} disabled={view.at === 0}>
        <IconArrowLeftMini className="size-3.5" />
        {RUN_THROUGH_REVIEW_COPY.back}
      </Button>
      <div className="flex flex-1 items-center justify-center gap-1 text-[11.5px] text-(--text-muted)">
        <span className="hidden items-center gap-1 sm:inline-flex">
          {RUN_THROUGH_ISSUE_CHOICES.map((c) => (
            <Kbd key={c.key}>{c.key}</Kbd>
          ))}
          <span className="pl-0.5">{RUN_THROUGH_REVIEW_COPY.answer} ·</span>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span className="pl-0.5">{RUN_THROUGH_REVIEW_COPY.move}</span>
        </span>
        <span className="tabular-nums sm:hidden">
          {current ? RUN_THROUGH_REVIEW_COPY.position(current.number, view.total) : null}
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={() => move(1)}>
        {RUN_THROUGH_REVIEW_COPY.next}
        <IconArrowRightMini className="size-3.5" />
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      hideHeader
      initialFocusRef={headingRef}
      size="xl"
      contentClassName="p-0"
      panelClassName="sm:max-w-[1040px] max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none max-sm:border-0"
      footer={footer}
    >
      <div className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-(--border-subtle) bg-(--surface-overlay) px-4 pb-3 pt-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="m-0 flex-1 text-[16px] font-semibold text-(--text-primary) outline-none"
          >
            {view.heading}
          </h2>
          <span className="text-[12.5px] font-medium text-(--text-secondary)">{view.progress}</span>
          <button
            type="button"
            aria-label={RUN_THROUGH_REVIEW_COPY.close}
            onClick={close}
            className="inline-grid size-7 place-items-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
          >
            <IconClose className="size-4" />
          </button>
        </div>
        <Dots dots={view.dots} onPick={goTo} />
      </div>
      {current ? (
        <IssueScreen
          current={current}
          projectId={projectId}
          recording={recording}
          replying={replying}
          onReplying={setReplying}
          onAnswer={give}
          onDiscuss={onDiscuss}
        />
      ) : (
        <SummaryScreen view={view} onPick={goTo} />
      )}
    </Modal>
  )
}
