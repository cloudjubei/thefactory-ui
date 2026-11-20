import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { ProjectCheckHostConsentSettingsPanel } from 'thefactory-ui/web'
import { WaitingCard } from '../../src/web/compound/process/ProcessPipeline'
import { HOST_CHECK_CONSENT_WAITING_VIEW } from './hostCheckConsentFixtures'
import type { Scene } from '../showcase/types'

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
 * The park card that asks once per project before checks fall back to the host,
 * and the project setting that shows whether they are allowed (with revoke).
 *
 * Web, no login:
 * - /?scene=host-check-consent&state=park — commands listed, Allow for this project.
 * - &state=settings-off|settings-on|settings-checking|settings-revoking|settings-load-failed
 *
 * Native: ?view=host-check-consent&state=…
 */
function Park(): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="max-w-[720px] bg-(--surface-base) p-4">
                  <WaitingCard
                    view={HOST_CHECK_CONSENT_WAITING_VIEW}
                    managerLine={undefined}
                    onChoose={noop}
                    onChangeProof={noop}
                    onAnswerRequest={noop}
                    onDelegate={handedOn}
                  />
                </div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

export const HOST_CHECK_CONSENT_SCENES: Scene[] = [
  {
    id: 'host-check-consent',
    title: 'Allow host checks — park card',
    component: 'WaitingCard (ProcessPipeline)',
    group: 'Process',
    description:
      'The first time a project’s checks must fall back from the sandbox to the host, the run parks with the exact commands listed and offers Allow for this project. Once allowed, later fallbacks for that project run without asking. Revoke is a project setting. Each state is its own address; nothing is clicked.',
    states: [
      {
        id: 'park',
        title: 'Park card',
        description:
          'Why the checks cannot stay in the sandbox, the lead, the command list, and Allow for this project.',
        render: () => <Park />,
      },
    ],
  },
  {
    id: 'host-check-consent-settings',
    title: 'Settings › Project › Host checks',
    component: 'ProjectCheckHostConsentSettings',
    group: 'Settings',
    description:
      'Whether this project’s checks may fall back to the host. Allow is granted from the park card; revoke here so the next fallback asks again. It never expires on its own.',
    states: [
      {
        id: 'settings-off',
        title: 'Not allowed',
        description: 'Where every project starts, and after a revoke.',
        render: () => (
          <div className="p-4">
            <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} />
          </div>
        ),
      },
      {
        id: 'settings-on',
        title: 'Allowed',
        description: 'Granted from the park card. Revoke asks again next time.',
        render: () => (
          <div className="p-4">
            <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed />
          </div>
        ),
      },
      {
        id: 'settings-checking',
        title: 'Checking',
        description: 'Not read yet, so nothing claims a position.',
        render: () => (
          <div className="p-4">
            <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed={undefined} />
          </div>
        ),
      },
      {
        id: 'settings-revoking',
        title: 'Revoking',
        description: 'The revoke waits for the answer.',
        render: () => (
          <div className="p-4">
            <ProjectCheckHostConsentSettingsPanel {...SETTINGS_BASE} allowed saving />
          </div>
        ),
      },
      {
        id: 'settings-load-failed',
        title: 'Could not read it',
        description: 'No claim at a position until it can be read.',
        render: () => (
          <div className="p-4">
            <ProjectCheckHostConsentSettingsPanel
              {...SETTINGS_BASE}
              allowed={undefined}
              loadError="Could not read this setting."
            />
          </div>
        ),
      },
    ],
  },
]
