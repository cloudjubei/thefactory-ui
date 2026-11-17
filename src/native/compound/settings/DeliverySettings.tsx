import { useDeliverySettings, type DeliveryOwner } from '../../../headless'
import DeliverySettingsPanel from './DeliverySettingsPanel'

export interface DeliverySettingsProps {
  /** The project or the group whose delivery this is. */
  owner: DeliveryOwner
}

/** Native peer of web's `DeliverySettings`: the delivery form, read and saved through the backend. */
export default function DeliverySettings({ owner }: DeliverySettingsProps) {
  const delivery = useDeliverySettings(owner)
  return (
    <DeliverySettingsPanel
      view={delivery.view}
      draft={delivery.draft}
      error={delivery.error}
      onChange={delivery.change}
      onSave={delivery.save}
      onReset={delivery.reset}
    />
  )
}
