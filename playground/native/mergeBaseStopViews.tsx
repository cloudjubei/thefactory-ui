import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import { FilesProvider } from 'thefactory-ui/headless'
import type { ReviewCardMerge } from '../../src/headless/utils/colleagueReviewMergeTypes'
import { MergeSection } from '../../src/native/compound/chat/ColleagueReviewCard'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import {
  MERGE_ASKED_DEVELOPER,
  MERGE_BASE_STOP_RUN_ID,
  MERGE_BEHIND_BASE,
  MERGE_RESOLVE_STARTING,
  MERGE_RESOLVING_IN_RUN,
  MERGE_STOPPED_ON_BASE,
  RUN_BASE_CHECKS_FAILED,
  RUN_MERGE_STOPPED_ON_BASE,
} from '../scenes/mergeBaseStopFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import {
  ANSWER_BRING_IN,
  ANSWER_PARENT_RUN_ID,
  ANSWER_RUN_ID,
  runAnswerRoutes,
  type RunAnswerCase,
} from '../scenes/runAnswerFixtures'
import type { NativeView } from './views'

const noop = () => {}

const MERGES: Record<string, ReviewCardMerge> = {
  inline: MERGE_STOPPED_ON_BASE,
  'inline-ask': MERGE_STOPPED_ON_BASE,
  'inline-resolve-starting': MERGE_RESOLVE_STARTING,
  'inline-resolving': MERGE_RESOLVING_IN_RUN,
  'inline-asked': MERGE_ASKED_DEVELOPER,
  'inline-behind': MERGE_BEHIND_BASE,
}

const RUNS: Record<string, ProcessRun> = {
  'run-stop': RUN_MERGE_STOPPED_ON_BASE,
  'run-checks-failed': RUN_BASE_CHECKS_FAILED,
}

/** A stop answered with “Bring in main”: which run's screen, and how the host takes the answer. */
const ANSWERS: Record<string, { runId: string; which: RunAnswerCase }> = {
  'answer-sending': { runId: ANSWER_RUN_ID, which: 'sending' },
  'answer-refused': { runId: ANSWER_RUN_ID, which: 'refused' },
  'answer-parent-sending': { runId: ANSWER_PARENT_RUN_ID, which: 'sending' },
  'answer-parent-refused': { runId: ANSWER_PARENT_RUN_ID, which: 'refused' },
}

/** Presses buttons of the screen by their words, in order, each once it is offered — as a person would. */
function PressEach({ labels, children }: { labels: readonly string[]; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const joined = labels.join('\n')
  useEffect(() => {
    if (!host || !joined) return undefined
    const wanted = joined.split('\n')
    let at = 0
    const timer = window.setInterval(() => {
      const found = [...host.querySelectorAll('[role="button"],button')].find(
        (el) => el.textContent === wanted[at],
      )
      if (!found) return
      ;(found as HTMLElement).click()
      at += 1
      if (at >= wanted.length) window.clearInterval(timer)
    }, 150)
    return () => window.clearInterval(timer)
  }, [host, joined])
  return (
    <View ref={(node) => setHost(node as unknown as HTMLElement | null)} style={{ flex: 1 }}>
      {children}
    </View>
  )
}

/**
 * A merge stopped on a pull request's base, on a phone: the merge section's
 * stop with Resolve it here and Ask the developer (`?state=inline`), the
 * drafted ask open (`inline-ask`), each choice shown at once and once done
 * (`inline-resolve-starting`, `inline-resolving`, `inline-asked`), a head
 * only behind its base (`inline-behind`), a review run's stop with the same
 * two ways on (`run-stop`), and bringing the base in failing the type check
 * before anything is pushed (`run-checks-failed`). Answering a stop with
 * “Bring in main”, pressed as a person would: shown at once while the host has
 * not answered (`answer-sending`), the stop back with the reason when it
 * refuses (`answer-refused`), and the same on the story run's screen, whose
 * stop mirrors its feature's (`answer-parent-sending`, `answer-parent-refused`).
 */
export const MERGE_BASE_STOP_VIEWS: NativeView[] = [
  {
    id: 'merge-base-stop',
    title: 'A merge stopped on a pull request’s base',
    render: (address) => {
      const state = address.get('state') ?? 'inline'
      const answer = ANSWERS[state]
      if (answer) {
        return (
          <OnFixtures routes={runAnswerRoutes(answer.which)}>
            <FilesProvider>
              <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
                <PressEach labels={[ANSWER_BRING_IN, ANSWER_BRING_IN]}>
                  <ProcessPipeline runId={answer.runId} />
                </PressEach>
              </View>
            </FilesProvider>
          </OnFixtures>
        )
      }
      const run = RUNS[state]
      if (run) {
        return (
          <OnFixtures routes={{ '/api/v1/process-runs/{runId}': () => run }}>
            <FilesProvider>
              <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
                <ProcessPipeline runId={MERGE_BASE_STOP_RUN_ID} />
              </View>
            </FilesProvider>
          </OnFixtures>
        )
      }
      return (
        <ScrollView contentContainerStyle={{ padding: 16, width: 390, maxWidth: '100%' }}>
          <MergeSection
            merge={MERGES[state] ?? MERGE_STOPPED_ON_BASE}
            onStart={noop}
            onResolveHere={noop}
            onAsk={noop}
            askOpen={state === 'inline-ask'}
          />
        </ScrollView>
      )
    },
  },
]
