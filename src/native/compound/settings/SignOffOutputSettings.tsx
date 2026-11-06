import { useSignOffOutputs, type SignOffOutputOwner } from '../../../headless'
import SignOffOutputSettingsPanel from './SignOffOutputSettingsPanel'

export interface SignOffOutputSettingsProps {
  /** The project or the group whose outputs these are. */
  owner: SignOffOutputOwner
}

/** Native peer of web's `SignOffOutputSettings`: the outputs, read and changed through the backend. */
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
