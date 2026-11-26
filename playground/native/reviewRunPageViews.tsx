import { View } from 'react-native'
import { FilesProvider } from 'thefactory-ui/headless'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import { ClickEach } from '../scenes/clickOnce'
import { OnFixtures } from '../scenes/onFixtures'
import {
  REVIEW_RUN_PAGE_CLICKS,
  REVIEW_RUN_PAGE_ID,
  reviewRunPageRoutes,
  type ReviewRunPageCase,
} from '../scenes/reviewRunPageFixtures'
import type { NativeView } from './views'

const noop = () => {}

const CASES: readonly ReviewRunPageCase[] = [
  'review-working',
  'ask-pending',
  'approval',
  'waiting-developer',
  'base-failed',
  'base-failed-note',
  'base-failed-ask',
  'push-after-fix',
  'merging',
]

const NO_CHAT = '-no-chat'

/**
 * A colleague review run on its screen, on a phone, at
 * `?view=review-run-page&state=…`, as the web scene: the review working with
 * the row that pushes its conversation (`review-working`; `-no-chat` for a
 * host that pushes none), an ask waiting in the run's chat (`ask-pending`),
 * the approval (`approval`), the wait for the developer
 * (`waiting-developer`), bringing the base in failed with its ways on
 * (`base-failed`, `base-failed-note`, `base-failed-ask`), the push of a
 * checks fix (`push-after-fix`) and the merge as it goes (`merging`).
 */
export const REVIEW_RUN_PAGE_VIEWS: readonly NativeView[] = [
  {
    id: 'review-run-page',
    title: 'A colleague review run on its page',
    render: (address) => {
      const state = address.get('state') ?? 'review-working'
      const noChat = state.endsWith(NO_CHAT)
      const id = noChat ? state.slice(0, -NO_CHAT.length) : state
      const which = CASES.find((one) => one === id) ?? 'review-working'
      return (
        <OnFixtures routes={reviewRunPageRoutes(which)}>
          <FilesProvider>
            <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
              <ClickEach labels={REVIEW_RUN_PAGE_CLICKS[which]}>
                <ProcessPipeline
                  runId={REVIEW_RUN_PAGE_ID}
                  {...(noChat ? {} : { onOpenRunChat: noop })}
                />
              </ClickEach>
            </View>
          </FilesProvider>
        </OnFixtures>
      )
    },
  },
]
