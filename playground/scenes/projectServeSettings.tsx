import { serveBuildLimitField } from 'thefactory-ui/headless'
import { ProjectServeSettingsPanel } from 'thefactory-ui/web'
import {
  SERVE_BUILD_LIMIT_SCENE_STATES,
  type ServeBuildLimitSceneState,
} from './projectServeSettingsFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}

function Settled({ storedMs, typed, saved, saving, saveError }: ServeBuildLimitSceneState) {
  return (
    <div className="p-4">
      <ProjectServeSettingsPanel
        field={serveBuildLimitField(storedMs, typed)}
        saved={saved === true}
        saving={saving === true}
        {...(saveError ? { saveError } : {})}
        onChange={noop}
        onSave={noop}
      />
    </div>
  )
}

export const PROJECT_SERVE_SETTINGS_SCENES: Scene[] = [
  {
    id: 'project-serve-settings',
    title: 'Settings › Project › Serve',
    component: 'ProjectServeSettings',
    group: 'Settings',
    description:
      'A project’s serve settings show the build limit in minutes and save it on the project. Blank uses 30 minutes, the limit every project starts with. A number above 0 is kept in milliseconds. Each state is its own address; nothing is clicked.',
    states: [
      {
        id: 'default',
        title: 'The default',
        description:
          'The project sets no limit. The field is empty, the placeholder is 30, and Save is not available.',
        render: () => <Settled {...SERVE_BUILD_LIMIT_SCENE_STATES.default} />,
      },
      {
        id: 'edited',
        title: '45 minutes, not saved yet',
        description: '45 is typed. Save is available and would keep 45 minutes.',
        render: () => <Settled {...SERVE_BUILD_LIMIT_SCENE_STATES.edited} />,
      },
      {
        id: 'saved',
        title: '45 minutes, saved',
        description: 'The project holds 45 minutes. The line says Saved.',
        render: () => <Settled {...SERVE_BUILD_LIMIT_SCENE_STATES.saved} />,
      },
      {
        id: 'invalid',
        title: 'Not a limit',
        description: '0 cannot be saved. The reason is under the field and Save is not available.',
        render: () => <Settled {...SERVE_BUILD_LIMIT_SCENE_STATES.invalid} />,
      },
      {
        id: 'save-failed',
        title: 'Save failed',
        description: '45 is still typed. The alert says the limit was not saved.',
        render: () => <Settled {...SERVE_BUILD_LIMIT_SCENE_STATES['save-failed']} />,
      },
    ],
  },
]
