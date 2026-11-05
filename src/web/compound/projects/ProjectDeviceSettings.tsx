import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import {
  PROJECT_DEVICE_AUTOMATION_TEXT as TEXT,
  useProjectDeviceAutomation,
  type UseProjectDeviceAutomation,
} from '../../../headless'

export type ProjectDeviceSettingsPanelProps = Omit<UseProjectDeviceAutomation, 'reload'> & {
  onRetry: () => void
}

/** The switch as it stands. It waits, and is not shown off, while the setting is unknown. */
export function ProjectDeviceSettingsPanel({
  enabled,
  saving,
  loadError,
  saveError,
  setEnabled,
  onRetry,
}: ProjectDeviceSettingsPanelProps) {
  return (
    <section className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{TEXT.title}</h3>
        <p className="text-sm text-(--text-secondary)">{TEXT.lead}</p>
      </div>
      {saveError ? <Alert>{saveError}</Alert> : null}
      {loadError && enabled === undefined ? (
        <div className="flex items-center gap-2">
          <Alert className="flex-1">{loadError}</Alert>
          <Button variant="secondary" onClick={onRetry}>
            {TEXT.retry}
          </Button>
        </div>
      ) : (
        <>
          <Switch
            checked={enabled === true}
            disabled={enabled === undefined || saving}
            onCheckedChange={setEnabled}
            label={TEXT.label}
          />
          <p className="text-sm text-(--text-secondary)">{TEXT.note}</p>
        </>
      )}
    </section>
  )
}

export interface ProjectDeviceSettingsProps {
  projectId: string
}

/** Whether this project's agents may drive a device, in its Settings. */
export default function ProjectDeviceSettings({ projectId }: ProjectDeviceSettingsProps) {
  const { reload, ...state } = useProjectDeviceAutomation(projectId)
  return <ProjectDeviceSettingsPanel {...state} onRetry={reload} />
}
