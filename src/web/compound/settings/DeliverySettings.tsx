import { useDeliverySettings, type DeliveryOwner } from '../../../headless'
import DeliverySettingsPanel from './DeliverySettingsPanel'

export interface DeliverySettingsProps {
  /** The project or the group whose delivery this is. */
  owner: DeliveryOwner
}

/**
 * A project's or a group's delivery settings in its Settings, read and saved
 * through the backend: what `DeliverySettingsPanel` shows. Native peer:
 * `native/compound/settings/DeliverySettings`.
 */
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
