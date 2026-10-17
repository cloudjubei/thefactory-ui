import { useCallback, useState } from 'react'

import { answerFeatureQuestion } from '../api'
import { useCanonicalizeReferences } from '../contexts/ReferenceRenderingContext'
import type { OpenFeatureQuestion } from '../utils/featureQuestions'

export type UseFeatureQuestionAnswers = {
  /** The answer typed for each question, by question id. */
  answers: Record<string, string>
  setAnswer: (questionId: string, text: string) => void
  /** The question whose answer is being saved. */
  answering: string | undefined
  /** The question whose answer was not saved. */
  failed: string | undefined
  /** Save the typed answer — the server carries on whatever waited on the question. */
  submit: (question: Pick<OpenFeatureQuestion, 'questionId' | 'featureId'>) => Promise<void>
}

/**
 * Answering a story's open questions, the same way the story's own Q&A does:
 * through the feature's answer route, which carries on the work that waited on
 * the question. Shared by all three clients.
 */
export function useFeatureQuestionAnswers(
  projectId: string,
  storyId: string,
): UseFeatureQuestionAnswers {
  const canonicalize = useCanonicalizeReferences()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answering, setAnswering] = useState<string | undefined>()
  const [failed, setFailed] = useState<string | undefined>()

  const setAnswer = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }, [])

  const submit = useCallback(
    async (question: Pick<OpenFeatureQuestion, 'questionId' | 'featureId'>) => {
      const answer = canonicalize((answers[question.questionId] ?? '').trim())
      if (answer.length === 0) return
      setAnswering(question.questionId)
      setFailed(undefined)
      try {
        await answerFeatureQuestion({
          path: { projectId, storyId, featureId: question.featureId },
          body: { questionId: question.questionId, answer },
          throwOnError: true,
        })
        setAnswers((prev) => ({ ...prev, [question.questionId]: '' }))
      } catch {
        setFailed(question.questionId)
      } finally {
        setAnswering(undefined)
      }
    },
    [answers, canonicalize, projectId, storyId],
  )

  return { answers, setAnswer, answering, failed, submit }
}
