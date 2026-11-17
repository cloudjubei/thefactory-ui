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
    <div className={embedded ? '' : 'mx-3 mt-3'}>
      <MergeProgressList rows={delivery.merge} onResolve={() => void onResolve()} />
    </div>
  )
}
