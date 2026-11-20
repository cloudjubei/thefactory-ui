import { Text, View } from 'react-native'
import { nativeSpace } from '../../../tokens/native'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  PROJECT_CHECK_HOST_CONSENT_SETTINGS as TEXT,
  useProjectCheckHostConsent,
  type UseProjectCheckHostConsent,
} from '../../../headless'

export type ProjectCheckHostConsentSettingsPanelProps = Omit<
  UseProjectCheckHostConsent,
  'reload'
> & {
  onRetry: () => void
}

/** Whether host checks are allowed for this project, with revoke when they are. */
export function ProjectCheckHostConsentSettingsPanel({
  allowed,
  saving,
  loadError,
  saveError,
  revoke,
  onRetry,
}: ProjectCheckHostConsentSettingsPanelProps) {
  const { theme } = useNativeTheme()
  const secondary = { fontSize: 13, color: theme.text.secondary }
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {TEXT.title}
      </Text>
      <Text style={secondary}>{TEXT.lead}</Text>
      {saveError ? <Alert>{saveError}</Alert> : null}
      {loadError && allowed === undefined ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Alert>{loadError}</Alert>
          <Button variant="secondary" onPress={onRetry}>
            {TEXT.retry}
          </Button>
        </View>
      ) : allowed === undefined ? (
        <Text style={secondary}>…</Text>
      ) : (
        <>
          <Text style={{ fontSize: 13, color: theme.text.primary }}>
            {allowed ? TEXT.allowed : TEXT.notAllowed}
          </Text>
          <Text style={secondary}>{TEXT.note}</Text>
          {allowed ? (
            <Button variant="secondary" disabled={saving} onPress={revoke}>
              {saving ? TEXT.revoking : TEXT.revoke}
            </Button>
          ) : null}
        </>
      )}
    </View>
  )
}

export interface ProjectCheckHostConsentSettingsProps {
  projectId: string
}

/** Host-check consent for a project, in its Settings. */
export default function ProjectCheckHostConsentSettings({
  projectId,
}: ProjectCheckHostConsentSettingsProps) {
  const { reload, ...state } = useProjectCheckHostConsent(projectId)
  return <ProjectCheckHostConsentSettingsPanel {...state} onRetry={reload} />
}
