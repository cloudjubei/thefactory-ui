import { useAgentTypeSettings, type AgentTypeOwner } from '../../../headless'
import AgentTypeSettingsPanel from './AgentTypeSettingsPanel'

export interface AgentTypeSettingsProps {
  /** The project or the group whose agent types these are. */
  owner: AgentTypeOwner
}

/**
 * A project's or a group's agent types in its Settings, read and changed
 * through the backend — what `AgentTypeSettingsPanel` shows. Native peer:
 * `native/compound/settings/AgentTypeSettings`.
 */
export default function AgentTypeSettings({ owner }: AgentTypeSettingsProps) {
  const settings = useAgentTypeSettings(owner)
  return (
    <AgentTypeSettingsPanel
      owner={owner}
      data={settings.data}
      error={settings.error}
      busy={settings.busy}
      onSave={settings.save}
      onRemove={settings.remove}
      onSaveSlots={settings.saveSlots}
    />
  )
}
