import { View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  reviewRunFollowsMerge,
  reviewRunWorkingView,
  useColleagueReviewMerge,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import RunWorkingCard from '../chat/RunWorkingCard'

export type RunReviewMergeProgressProps = {
  run: ProcessRun
}

/**
 * Native peer of web's `RunReviewMergeProgress`: a colleague review run's
 * approve-and-merge on the run's own screen while the run works, pull
 * request by pull request, staying as it ended while the run carries on.
 */
export default function RunReviewMergeProgress({ run }: RunReviewMergeProgressProps) {
  const { theme } = useNativeTheme()
  const follows = reviewRunFollowsMerge(run)
  const { merge } = useColleagueReviewMerge(
    follows ? run.ticketReview?.groupId : undefined,
    follows ? run.ticketReview?.ticketKey : undefined,
  )
  if (!follows) return null
  const view = reviewRunWorkingView(run, merge.job, Date.now())
  if (!view.merge) return null
  return (
    <View
      style={{
        marginHorizontal: nativeSpace[3],
        marginTop: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
        paddingHorizontal: nativeSpace[4],
        paddingVertical: nativeSpace[3],
      }}
    >
      <RunWorkingCard view={view} />
    </View>
  )
}
