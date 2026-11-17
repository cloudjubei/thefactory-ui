import { useProcessDelivery, type ProcessResumeChoice } from '../../../headless'
import PublishCard from './PublishCard'

export interface RunPublishCardProps {
  runId: string
  /** The run's park, so a new stop reads the card again. */
  parkedAt: number
  embedded?: boolean
  /** Answer the run's gate, on the same path as every other stop; resolves `false` when refused. */
  onAnswer: (choice: ProcessResumeChoice) => Promise<boolean>
}

/** A run's publish gate, read and answered through the backend: what `PublishCard` shows. */
export default function RunPublishCard({
  runId,
  parkedAt,
  embedded,
  onAnswer,
}: RunPublishCardProps) {
  const delivery = useProcessDelivery({ kind: 'run', runId }, parkedAt)
  return (
    <PublishCard
      view={delivery.publish}
      readError={delivery.readError}
      {...(embedded !== undefined ? { embedded } : {})}
      onEdit={delivery.setEdit}
      onPublish={() => void delivery.publishNow(() => onAnswer('approve'))}
      onStop={() => void onAnswer('abandon')}
    />
  )
}
