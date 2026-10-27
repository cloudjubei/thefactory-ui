import { FEATURE_QUESTION_ANSWER_ROW_COPY } from './featureQuestionAnswerRowConstants'
import type { ToolRowMilestone } from './gitSetupApprovalTypes'

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

function resultOf(result: unknown): Record<string, unknown> {
  if (typeof result !== 'string') return record(result)
  try {
    return record(JSON.parse(result))
  } catch {
    return {}
  }
}

/**
 * The line a carried-out `submitFeatureQuestionAnswer` row shows: the answer saved, and
 * whether the work waiting on it carried on, still waits on other questions, or did not.
 * Nothing while it waits on the person, for a failed call (its row says why), or for a
 * result that did not save an answer. Pure.
 */
export function featureQuestionAnswerMilestone(
  result: unknown,
  resultType: string | undefined,
  awaitingDecision: boolean,
): ToolRowMilestone | undefined {
  if (awaitingDecision || resultType !== 'success') return undefined
  const body = resultOf(result)
  if (body.answered !== true) return undefined
  const saved = FEATURE_QUESTION_ANSWER_ROW_COPY.saved
  if (body.carriedOn === true) {
    return { tone: 'success', title: saved, detail: FEATURE_QUESTION_ANSWER_ROW_COPY.carriedOn }
  }
  if (typeof body.stillOpen === 'number' && body.stillOpen > 0) {
    return {
      tone: 'success',
      title: saved,
      detail: FEATURE_QUESTION_ANSWER_ROW_COPY.stillOpen(body.stillOpen),
    }
  }
  if (body.carriedOn === false) {
    const why = typeof body.why === 'string' ? body.why.trim() : ''
    return {
      tone: 'warning',
      title: saved,
      ...(why ? { detail: FEATURE_QUESTION_ANSWER_ROW_COPY.notCarriedOn(why) } : {}),
    }
  }
  return { tone: 'success', title: saved }
}
