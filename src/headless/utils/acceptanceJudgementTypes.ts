import type { CodeReviewCriterionStatus } from 'thefactory-tools/types'

/** One criterion a code review judged: as it wrote it, and how it judged it. */
export type JudgedCriterion = { text: string; status: CodeReviewCriterionStatus }

/** One acceptance line that was asked, and the review's judgement of it when it gave one. */
export type AcceptanceLineJudgement = {
  text: string
  status: CodeReviewCriterionStatus | undefined
}

/** How a feature's (or story's) acceptance criteria stand against what its code review judged. */
export type AcceptanceJudgement = {
  /** Acceptance lines the feature asked for. */
  asked: number
  /** Of those, how many the review judged. */
  judged: number
  /** Of those judged, how many it found met. */
  met: number
}

/** What a sign-off says of an {@link AcceptanceJudgement}: the count, the line under it, and whether it is whole. */
export type AcceptanceDeliveredLine = {
  value: string
  sub: string
  whole: boolean
}
