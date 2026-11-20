import { View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import {
  MERGE_CHECKS_FAILED_RUN,
  MERGE_OTHER_FAILURE_RUN,
  MERGE_RECOVERIES_RUN_ID,
  REVIEW_AGENT_REFUSED_RUN,
} from '../scenes/mergeRecoveriesFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

const RUNS: Record<string, ProcessRun> = {
  'checks-failed': MERGE_CHECKS_FAILED_RUN,
  'other-failure': MERGE_OTHER_FAILURE_RUN,
  'agent-refused': REVIEW_AGENT_REFUSED_RUN,
}

/**
 * A colleague review run stopped on its merge, on a phone: failed checks offer
 * Re-run failed checks and Merge anyway (`?state=checks-failed`), another
 * failure only the usual answers (`?state=other-failure`), and a review whose
 * CLI refused says why in its words (`?state=agent-refused`).
 */
export const MERGE_RECOVERY_VIEWS: NativeView[] = [
  {
    id: 'merge-recoveries',
    title: 'A merge stopped by failed checks',
    render: (address) => {
      const run = RUNS[address.get('state') ?? ''] ?? MERGE_CHECKS_FAILED_RUN
      return (
        <OnFixtures routes={{ '/api/v1/process-runs/{runId}': () => run }}>
          <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
            <ProcessPipeline runId={MERGE_RECOVERIES_RUN_ID} />
          </View>
        </OnFixtures>
      )
    },
  },
]
