import { View } from 'react-native'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { ProjectCheckHostConsentSettingsPanel } from '../../src/native/compound/projects/ProjectCheckHostConsentSettings'
import { WaitingCard } from '../../src/native/compound/process/ProcessPipeline'
import { HOST_CHECK_CONSENT_WAITING_VIEW } from '../scenes/hostCheckConsentFixtures'
import type { NativeView } from './views'

const noop = () => {}
const handedOn = async () => true
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

const SETTINGS_BASE = {
  allowed: false as boolean | undefined,
  saving: false,
  loadError: undefined as string | undefined,
  saveError: undefined as string | undefined,
  revoke: noop,
  onRetry: noop,
}

/**
 * Host-check consent on a phone: the park card, and the project setting.
 * `?view=host-check-consent&state=park|settings-off|settings-on|…`
 */
export const HOST_CHECK_CONSENT_VIEWS: NativeView[] = [
  {
    id: 'host-check-consent',
    title: 'Allow host checks — park card',
    render: (address) => {
      const state = address.get('state') ?? 'park'
      if (state === 'park') {
        return (
          <AuthProvider storage={NO_TOKEN}>
            <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="mobile">
              <AppSettingsProvider storage={MEMORY}>
                <ProjectsProvider>
                  <FilesProvider>
                    <View style={{ width: 390, maxWidth: '100%' }}>
                      <WaitingCard
                        view={HOST_CHECK_CONSENT_WAITING_VIEW}
                        managerLine={undefined}
                        onChoose={noop}
                        onChangeProof={noop}
                        onAnswerRequest={noop}
                        onDelegate={handedOn}
                      />
                    </View>
                  </FilesProvider>
                </ProjectsProvider>
              </AppSettingsProvider>
            </ApiProvider>
          </AuthProvider>
        )
      }
      const panel =
        state === 'settings-on' ? (
          <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed />
        ) : state === 'settings-checking' ? (
          <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed={undefined} />
        ) : state === 'settings-revoking' ? (
          <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed saving />
        ) : state === 'settings-load-failed' ? (
          <ProjectCheckHostConsentSettingsPanel
            {...SETTINGS_BASE}
            allowed={undefined}
            loadError="Could not read this setting."
          />
        ) : (
          <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} />
        )
      return <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>{panel}</View>
    },
  },
]
