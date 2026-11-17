import { useProcessDelivery } from '../../../headless'
import PublishCard from './PublishCard'

export interface GroupPublishCardProps {
  groupRunId: string
  /** The group's park, so a new stop reads the card again. */
  parkedAt: number
  /** Stop the group run, on its park's own answer. */
  onStop: () => void
}

/** A group run waiting to publish every leg, read and published through the backend. */
export default function GroupPublishCard({ groupRunId, parkedAt, onStop }: GroupPublishCardProps) {
  const delivery = useProcessDelivery({ kind: 'group', groupRunId }, parkedAt)
  return (
    <PublishCard
      view={delivery.publish}
      readError={delivery.readError}
      onEdit={delivery.setEdit}
      onPublish={() => void delivery.publishNow()}
      onStop={onStop}
    />
  )
}
