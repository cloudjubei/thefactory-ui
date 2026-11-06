import { useCapabilitySettings, type CapabilitySettingsOwner } from '../../../headless'
import CapabilitySettingsPanel from './CapabilitySettingsPanel'

export interface CapabilitySettingsProps {
  /** The project or the group whose capabilities these are. */
  owner: CapabilitySettingsOwner
}

/**
 * A project's or a group's capabilities in its Settings: device automation,
 * tool sets, and the flags for connector write-back, auto-merge and
 * auto-follow-up. Each stays off until it is turned on. The badge says what
 * is on. Native peer: `native/compound/settings/CapabilitySettings`.
 */
export default function CapabilitySettings({ owner }: CapabilitySettingsProps) {
  const settings = useCapabilitySettings(owner)
  if (!settings.view) {
    return (
      <div className="max-w-2xl space-y-2" data-testid="capability-settings">
        <h2 className="text-xl font-semibold">Capabilities</h2>
        <p className="text-sm text-(--text-secondary)">{settings.error ?? 'Loading…'}</p>
      </div>
    )
  }
  return (
    <CapabilitySettingsPanel
      view={settings.view}
      error={settings.error}
      busy={settings.busy}
      onToggle={settings.toggle}
      onInherit={settings.inherit}
    />
  )
}
