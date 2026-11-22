import type { ProcessRun } from 'thefactory-tools/types'

import type {
  AnswerRunThroughIssueData,
  RunThroughIssueAnswer,
  Story,
} from '../headless/api/generated/types.gen'
import { FAKE_RUN_THROUGH_ISSUES, FAKE_RUN_THROUGH_RUN } from './fixtures/runThroughRun'
import { FAKE_STAMP } from './fixtures/stamps'

/** The id of the story going over the run-through's issues makes. */
export const FAKE_RUN_THROUGH_FIXES_STORY_ID = 'run-through-fixes'

/** What the fake answers a write with: the run, or why it refused. */
export type FakeRunThroughReviewAnswer =
  | { ok: true; run: ProcessRun }
  | { ok: false; status: 400 | 404; error: string }

const ANSWERS: readonly string[] = ['fix', 'not-an-issue']

/**
 * The fake's run-through at its sign-off, and a person going over its issues:
 * each answer kept (a later one replaces the earlier), and finishing — once
 * every issue is answered — makes a story of the fixes in its project and
 * closes the run. One per route table, so each fake server starts unanswered.
 */
export class FakeRunThroughReview {
  private _run: ProcessRun = FAKE_RUN_THROUGH_RUN
  private _story: Story | undefined
  private _at = FAKE_RUN_THROUGH_RUN.updatedAt

  /** The run as `GET /process-runs/:runId` answers it now. */
  run(): ProcessRun {
    return this._run
  }

  /** The stories it made in `projectId`. */
  stories(projectId: string): Story[] {
    return this._story && projectId === this._run.projectId ? [this._story] : []
  }

  answer(issueId: string, body: unknown): FakeRunThroughReviewAnswer {
    const { answer, note } = (body ?? {}) as Partial<AnswerRunThroughIssueData['body']>
    if (!FAKE_RUN_THROUGH_ISSUES.some((ref) => ref.id === issueId)) {
      return { ok: false, status: 404, error: `No issue '${issueId}' in this run.` }
    }
    if (!answer || !ANSWERS.includes(answer)) {
      return { ok: false, status: 400, error: 'Answer `fix` or `not-an-issue`.' }
    }
    if (this._run.issueReview) {
      return { ok: false, status: 400, error: 'These issues were already gone over.' }
    }
    const words = note?.trim()
    const given: RunThroughIssueAnswer = {
      issueId,
      answer,
      ...(words ? { note: words } : {}),
      at: this._tick(),
    }
    this._run = {
      ...this._run,
      issueAnswers: { ...this._run.issueAnswers, [issueId]: given },
      updatedAt: given.at,
    }
    return { ok: true, run: this._run }
  }

  /** Make the story of the fixes and close the run; answering again after does nothing new. */
  finish(): FakeRunThroughReviewAnswer {
    if (this._run.issueReview) return { ok: true, run: this._run }
    const answers = this._run.issueAnswers ?? {}
    const open = FAKE_RUN_THROUGH_ISSUES.filter((ref) => !answers[ref.id])
    if (open.length > 0) {
      return { ok: false, status: 400, error: `${open.length} issue(s) are not answered yet.` }
    }
    const fixes = FAKE_RUN_THROUGH_ISSUES.filter((ref) => answers[ref.id]?.answer === 'fix')
    const at = this._tick()
    const { projectId, title = '' } = this._run
    if (fixes.length > 0) {
      this._story = {
        id: FAKE_RUN_THROUGH_FIXES_STORY_ID,
        title: `Fix what “${title}” met`,
        description:
          'What the run-through met, gone over one by one: one feature per issue to fix.',
        status: 'pending',
        features: fixes.map((ref, index) => {
          const issue = ref.issue!
          const note = answers[ref.id]?.note
          return {
            id: `${FAKE_RUN_THROUGH_FIXES_STORY_ID}-f${index + 1}`,
            title: issue.title,
            description: `Met: ${issue.happened}`,
            acceptance:
              [note, issue.expected].filter(Boolean).join('\n\n') ||
              `“${issue.title}” no longer happens.`,
            status: 'pending',
            context: [],
            ...FAKE_STAMP,
          }
        }),
        ...FAKE_STAMP,
      }
    }
    const { park: _park, ...rest } = this._run
    this._run = {
      ...rest,
      status: 'succeeded',
      updatedAt: at,
      issueReview: {
        projectId,
        ...(this._story ? { storyId: this._story.id } : {}),
        fixes: fixes.length,
        notIssues: FAKE_RUN_THROUGH_ISSUES.length - fixes.length,
        at,
      },
    }
    return { ok: true, run: this._run }
  }

  private _tick(): number {
    this._at += 1
    return this._at
  }
}
