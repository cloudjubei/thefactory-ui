import { useSignOffOutputs, type SignOffOutputOwner } from '../../../headless'
import SignOffOutputSettingsPanel from './SignOffOutputSettingsPanel'

export interface SignOffOutputSettingsProps {
  /** The project or the group whose outputs these are. */
  owner: SignOffOutputOwner
}

/**
 * A project's or a group's sign-off outputs in its Settings, read and changed
 * through the backend: what `SignOffOutputSettingsPanel` shows. Native peer:
 * `native/compound/settings/SignOffOutputSettings`.
 */
export default function SignOffOutputSettings({ owner }: SignOffOutputSettingsProps) {
  const outputs = useSignOffOutputs(owner)
  return (
    <SignOffOutputSettingsPanel
      views={outputs.views}
      own={outputs.own}
      choices={outputs.choices}
      noNotes={outputs.noNotes}
      intro={outputs.intro}
      canAdd={outputs.canAdd}
      error={outputs.error}
      busy={outputs.busy}
      onSave={outputs.save}
      onRemove={outputs.remove}
    />
  )
}
