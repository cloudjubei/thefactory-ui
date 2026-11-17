import { View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import { useProcessDelivery, type ProcessRun } from '../../../headless'
import MergeProgressList from './MergeProgressList'

export interface RunMergeProgressProps {
  run: Pick<ProcessRun, 'id' | 'publication' | 'updatedAt'>
  /** Send a conflict to an agent: the run's existing resolve. */
  onResolve: () => Promise<boolean>
  embedded?: boolean
}

/**
 * A published run's merge after Accept, read while it goes: nothing for a run
 * never published, nor before Accept starts its merge.
 */
export default function RunMergeProgress({
  run,
  onResolve,
  embedded = false,
}: RunMergeProgressProps) {
  const delivery = useProcessDelivery(
    run.publication ? { kind: 'run', runId: run.id } : undefined,
    run.updatedAt,
  )
  if (delivery.merge.length === 0) return null
  return (
    <View
      style={embedded ? undefined : { marginHorizontal: nativeSpace[3], marginTop: nativeSpace[3] }}
    >
      <MergeProgressList rows={delivery.merge} onResolve={() => void onResolve()} />
    </View>
  )
}
