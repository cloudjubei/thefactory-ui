import type { ChatOpenQuestionsCard } from 'thefactory-tools/types'
import { Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import ReferenceTextarea from '../files/ReferenceTextarea'
import RichText from '../files/RichText'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import { useStories } from '../../../headless/contexts/StoriesContext'
import {
  useFeatureQuestionAnswers,
  type UseFeatureQuestionAnswers,
} from '../../../headless/hooks/useFeatureQuestionAnswers'
import { openQuestionsCardView } from '../../../headless/utils/openQuestionsCard'
import { OPEN_QUESTIONS_COPY } from '../../../headless/utils/openQuestionsCardConstants'
import type { OpenQuestionsCardView } from '../../../headless/utils/openQuestionsCardTypes'

export type OpenQuestionsCardProps = {
  card: ChatOpenQuestionsCard
  /** When the host posted the card. */
  at?: string
}

/**
 * Native peer of [web's `OpenQuestionsCard`](../../../web/compound/chat/OpenQuestionsCard.tsx):
 * the questions a paused run waits on, read live from the story, each with its answer box.
 */
export default function OpenQuestionsCard({ card, at }: OpenQuestionsCardProps) {
  const { getStory } = useStories()
  const view = openQuestionsCardView(getStory(card.storyId)?.features, card)
  const answering = useFeatureQuestionAnswers(card.projectId, card.storyId)
  return <OpenQuestionsBox view={view} {...answering} {...(at ? { at } : {})} />
}

export type OpenQuestionsBoxProps = Pick<
  UseFeatureQuestionAnswers,
  'answers' | 'setAnswer' | 'answering' | 'failed' | 'submit'
> & {
  view: OpenQuestionsCardView
  at?: string
}

/** The card as drawn from what it reads — the questions, the typed answers, what is being saved. */
export function OpenQuestionsBox({
  view,
  at,
  answers,
  setAnswer,
  answering,
  failed,
  submit,
}: OpenQuestionsBoxProps) {
  const { theme, status } = useNativeTheme()
  const open = view.state === 'open'
  return (
    <View
      style={{
        gap: 8,
        padding: 10,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: open ? theme.accent.softBorder : theme.border.subtle,
        backgroundColor: open ? theme.accent.softBg : theme.surface.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
          {view.title}
        </Text>
        {at ? <Text style={{ fontSize: 11, color: theme.text.muted }}>{at}</Text> : null}
      </View>
      {view.questions.map((q) => (
        <View key={q.questionId} style={{ gap: 4 }}>
          <RichText text={q.question} textColor={theme.text.primary} />
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {OPEN_QUESTIONS_COPY.on(q.featureTitle)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ReferenceTextarea
                rows={1}
                value={answers[q.questionId] ?? ''}
                placeholder={OPEN_QUESTIONS_COPY.placeholder}
                onChangeText={(text) => setAnswer(q.questionId, text)}
                onSubmit={() => void submit(q)}
              />
            </View>
            <Button
              size="sm"
              disabled={
                answering === q.questionId || (answers[q.questionId] ?? '').trim().length === 0
              }
              onPress={() => void submit(q)}
            >
              {answering === q.questionId
                ? OPEN_QUESTIONS_COPY.sending
                : OPEN_QUESTIONS_COPY.answer}
            </Button>
          </View>
          {failed === q.questionId ? (
            <Text style={{ fontSize: 11, color: status.blocked.softFg }}>
              {OPEN_QUESTIONS_COPY.failed}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}
