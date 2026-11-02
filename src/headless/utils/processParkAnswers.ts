import { processManagerOfferedAnswers } from 'thefactory-tools/utils'
import type { ProcessManagerAnswer, ProcessParkChoice } from 'thefactory-tools/types'

import {
  PARK_ANSWER_CONFIRM,
  PARK_ANSWER_NOTE_LABEL,
  PARK_ANSWER_NOTE_LABELS,
  PARK_MINOR_CHOICES,
  PARK_OWN_ANSWER_CHOICES,
} from './processParkAnswersConstants'
import type { ParkAnswerView, ParkAnswersView } from './processParkAnswersTypes'

/**
 * A stop's answers for the "Needs you" card. The manager's answers come first,
 * in its order, each with the words it sends; every choice the stop offers that
 * the manager did not answer with follows as plain — so no choice is ever lost,
 * and with no manager answers the card offers the plain choices. The one in
 * front is the one the person picked (`selectedKey`), else the manager's pick
 * (the first answer on its `recommendedChoice`), else the stop's primary choice,
 * else the first. Carrying on unchecked and the endings are links unless picked. Pure.
 */
export function processParkAnswersView(
  choices: readonly ProcessParkChoice[],
  manager?: {
    answers?: readonly ProcessManagerAnswer[]
    recommendedChoice?: string
  },
  selectedKey?: string,
): ParkAnswersView {
  const written = processManagerOfferedAnswers(manager?.answers, choices)
  const pickIndex = written.findIndex((a) => a.choice === manager?.recommendedChoice)
  const fromManager: ParkAnswerView[] = written.flatMap((answer, i) => {
    const offer = choices.find((c) => c.choice === answer.choice)
    return offer ? [answerView(offer, `${answer.choice}:${i}`, i === pickIndex, answer)] : []
  })
  const answered = new Set(written.map((a) => a.choice))
  const plain = choices
    .filter((c) => !answered.has(c.choice))
    .map((c) => answerView(c, c.choice, fromManager.length === 0 && c.primary === true))
  const all = [...fromManager, ...plain]
  const lead =
    all.find((a) => a.key === selectedKey) ??
    all.find((a) => a.pick) ??
    all.find((a) => !PARK_MINOR_CHOICES.has(a.choice)) ??
    all[0]
  const rest = all.filter((a) => a !== lead)
  return {
    lead,
    others: rest.filter((a) => !PARK_MINOR_CHOICES.has(a.choice)),
    minor: rest.filter((a) => PARK_MINOR_CHOICES.has(a.choice)),
    fromManager: fromManager.length > 0,
  }
}

/** The choice an answer in the person's own words goes with at a stop — none when the stop takes no words. Pure. */
export function parkOwnAnswerChoice(
  choices: readonly Pick<ProcessParkChoice, 'choice'>[],
): ProcessParkChoice['choice'] | undefined {
  return PARK_OWN_ANSWER_CHOICES.find((c) => choices.some((offer) => offer.choice === c))
}

function answerView(
  offer: ProcessParkChoice,
  key: string,
  pick: boolean,
  written?: ProcessManagerAnswer,
): ParkAnswerView {
  const confirm = PARK_ANSWER_CONFIRM[offer.choice]
  return {
    key,
    choice: offer.choice,
    label: written?.label ?? offer.label,
    does: offer.detail,
    pick,
    offer,
    ...(written?.why ? { why: written.why } : {}),
    ...(written?.note
      ? {
          note: written.note,
          noteLabel: PARK_ANSWER_NOTE_LABELS[offer.choice] ?? PARK_ANSWER_NOTE_LABEL,
        }
      : {}),
    ...(confirm ? { confirm } : {}),
  }
}
