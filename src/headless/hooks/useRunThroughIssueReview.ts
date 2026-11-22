import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  answerRunThroughIssue,
  extractErrorMessage,
  finishRunThroughIssueReview,
  useApi,
  type RunThroughIssueAnswer,
  type RunThroughIssueAnswerKind,
} from '../api'
import {
  isSameRunThroughIssueAnswer,
  runThroughIssueReviewAfter,
  runThroughIssueReviewEntry,
  runThroughIssueReviewFirstAt,
  runThroughIssueReviewStep,
  runThroughIssueReviewView,
  withRunThroughIssueAnswer,
} from '../utils/runThroughIssueReview'
import { RUN_THROUGH_REVIEW_COPY } from '../utils/runThroughIssueReviewConstants'
import type {
  RunThroughIssueAnswers,
  RunThroughIssueReviewAt,
  RunThroughIssueReviewEntryView,
  RunThroughIssueReviewView,
} from '../utils/runThroughIssueReviewTypes'
import type { RunThroughIssueRow } from '../utils/runThroughReportTypes'

export type UseRunThroughIssueReviewOptions = {
  /** Told why an answer or the close was refused, after it was taken back. */
  onError?: (message: string) => void
}

export type UseRunThroughIssueReview = {
  /** What the sign-off offers for the issues: the way in, or how they were gone over. */
  entry: RunThroughIssueReviewEntryView | undefined
  view: RunThroughIssueReviewView
  answers: RunThroughIssueAnswers
  isOpen: boolean
  /** Open the panel on the first open issue, or on the answers when none is. */
  open: () => void
  close: () => void
  goTo: (at: RunThroughIssueReviewAt) => void
  move: (by: 1 | -1) => void
  /**
   * Answer the issue shown and move to the next open one. Shown at once and
   * taken back when refused; the same answer again changes nothing.
   */
  answer: (issueId: string, answer: RunThroughIssueAnswerKind, note?: string) => void
  /** Make the story of the fixes and close the run. A second press while one is on its way does nothing. */
  finish: () => void
  finishing: boolean
}

type Answers = Record<string, RunThroughIssueAnswer>

/**
 * Going over a run-through's issues one at a time: where the panel is, the
 * answers — the run's, those the server confirmed since, and those on their
 * way, shown as given at once — and closing the run once every issue is
 * answered.
 */
export function useRunThroughIssueReview(
  run: ProcessRun | undefined,
  issues: readonly RunThroughIssueRow[],
  { onError }: UseRunThroughIssueReviewOptions = {},
): UseRunThroughIssueReview {
  const { client } = useApi()
  const runId = run?.id
  const [confirmed, setConfirmed] = useState<{ runId: string; answers: Answers }>()
  const [pending, setPending] = useState<Answers>({})
  const [finished, setFinished] = useState<ProcessRun>()
  const [finishing, setFinishing] = useState(false)
  const [isOpen, setOpen] = useState(false)
  const [at, setAt] = useState<RunThroughIssueReviewAt>(0)

  useEffect(() => {
    setPending({})
    setFinished(undefined)
    setOpen(false)
  }, [runId])

  const answers = useMemo<RunThroughIssueAnswers>(
    () => ({
      ...run?.issueAnswers,
      ...(confirmed && confirmed.runId === runId ? confirmed.answers : {}),
      ...pending,
    }),
    [run?.issueAnswers, confirmed, runId, pending],
  )
  const view = useMemo(() => runThroughIssueReviewView(issues, answers, at), [issues, answers, at])
  const shownRun = finished?.id === runId ? finished : run
  const entry = runThroughIssueReviewEntry(shownRun, issues.length)

  const open = useCallback(() => {
    setAt(runThroughIssueReviewFirstAt(issues, answers))
    setOpen(true)
  }, [issues, answers])
  const close = useCallback(() => setOpen(false), [])
  const goTo = useCallback((next: RunThroughIssueReviewAt) => setAt(next), [])
  const move = useCallback(
    (by: 1 | -1) => setAt((from) => runThroughIssueReviewStep(issues.length, from, by)),
    [issues.length],
  )

  const answer = useCallback(
    (issueId: string, kind: RunThroughIssueAnswerKind, note?: string) => {
      if (!runId) return
      const index = issues.findIndex((row) => row.key === issueId)
      if (isSameRunThroughIssueAnswer(answers[issueId], kind, note)) {
        if (index !== -1) setAt(runThroughIssueReviewAfter(issues, answers, index))
        return
      }
      const next = withRunThroughIssueAnswer(answers, issueId, kind, note, Date.now())
      const given = next[issueId]!
      setPending((p) => ({ ...p, [issueId]: given }))
      if (index !== -1) setAt(runThroughIssueReviewAfter(issues, next, index))
      const settle = () =>
        setPending((p) => {
          if (p[issueId] !== given) return p
          const { [issueId]: _settled, ...rest } = p
          return rest
        })
      answerRunThroughIssue({
        path: { runId, issueId },
        body: { answer: kind, ...(given.note ? { note: given.note } : {}) },
        throwOnError: true,
      })
        .then(({ data }) => {
          const answered = (data as ProcessRun).issueAnswers
          if (answered) setConfirmed({ runId, answers: answered })
          settle()
        })
        .catch((err: unknown) => {
          settle()
          onError?.(extractErrorMessage(err, RUN_THROUGH_REVIEW_COPY.answerFailed))
        })
    },
    [runId, issues, answers, onError],
  )

  const finish = useCallback(() => {
    if (!runId || finishing || finished?.id === runId) return
    setFinishing(true)
    finishRunThroughIssueReview({
      path: { runId },
      body: { decidedVia: client },
      throwOnError: true,
    })
      .then(({ data }) => {
        setFinished(data as ProcessRun)
        setOpen(false)
      })
      .catch((err: unknown) =>
        onError?.(extractErrorMessage(err, RUN_THROUGH_REVIEW_COPY.finishFailed)),
      )
      .finally(() => setFinishing(false))
  }, [runId, finishing, finished, client, onError])

  return {
    entry,
    view,
    answers,
    isOpen,
    open,
    close,
    goTo,
    move,
    answer,
    finish,
    finishing,
  }
}
