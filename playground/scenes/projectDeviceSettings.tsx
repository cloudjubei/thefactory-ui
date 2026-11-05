import { ProjectDeviceSettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}
const BASE = {
  enabled: false,
  saving: false,
  loadError: undefined,
  saveError: undefined,
  setEnabled: noop,
  onRetry: noop,
}

export const PROJECT_DEVICE_SETTINGS_SCENES: Scene[] = [
  {
    id: 'project-device-settings',
    title: 'Settings › Project › Device automation',
    component: 'ProjectDeviceSettings',
    group: 'Settings',
    description:
      'Per project and off unless turned on, as agents then control real hardware with no ask per action. The note stays in view in both positions, so what the switch allows is read before it is turned on. It takes effect at once, so there is no Save. While the setting is unknown the switch waits: it is never shown off.',
    states: [
      {
        id: 'off',
        title: 'Off',
        description: 'Where every project starts.',
        render: () => <ProjectDeviceSettingsPanel {...BASE} />,
      },
      {
        id: 'on',
        title: 'On',
        description: 'Agents in this project have the device tools.',
        render: () => <ProjectDeviceSettingsPanel {...BASE} enabled />,
      },
      {
        id: 'checking',
        title: 'Checking',
        description: 'Not read yet, so the switch cannot be used.',
        render: () => <ProjectDeviceSettingsPanel {...BASE} enabled={undefined} />,
      },
      {
        id: 'saving',
        title: 'Saving',
        description: 'The switch waits for the answer and keeps its old position.',
        render: () => <ProjectDeviceSettingsPanel {...BASE} saving />,
      },
      {
        id: 'save-failed',
        title: 'Change failed',
        description: 'The switch stays where the setting really is.',
        render: () => (
          <ProjectDeviceSettingsPanel
            {...BASE}
            saveError="Could not change this setting. Try again."
          />
        ),
      },
      {
        id: 'load-failed',
        title: 'Could not read it',
        description: 'No switch at all, as showing one would claim a position.',
        render: () => (
          <ProjectDeviceSettingsPanel
            {...BASE}
            enabled={undefined}
            loadError="Could not read this setting."
          />
        ),
      },
    ],
  },
]
