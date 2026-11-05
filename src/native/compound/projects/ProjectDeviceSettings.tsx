import { Text, View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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
  const { theme } = useNativeTheme()
  const secondary = { fontSize: 13, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {TEXT.title}
      </Text>
      <Text style={secondary}>{TEXT.lead}</Text>
      {saveError ? <Alert>{saveError}</Alert> : null}
      {loadError && enabled === undefined ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Alert>{loadError}</Alert>
          <Button variant="secondary" onPress={onRetry}>
            {TEXT.retry}
          </Button>
        </View>
      ) : (
        <>
          <Switch
            checked={enabled === true}
            disabled={enabled === undefined || saving}
            onCheckedChange={setEnabled}
            label={TEXT.label}
          />
          <Text style={secondary}>{TEXT.note}</Text>
        </>
      )}
    </View>
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
