import { serveBuildLimitField } from 'thefactory-ui/headless'
import { ProjectServeSettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import { BUILD_LIMIT_AFTER_SAVE_STATES } from './buildLimitAfterSaveFixtures'

const noop = () => {}

function Panel({ state }: { state: keyof typeof BUILD_LIMIT_AFTER_SAVE_STATES }) {
  const shown = BUILD_LIMIT_AFTER_SAVE_STATES[state]
  return (
    <div className="p-4">
      <ProjectServeSettingsPanel
        field={serveBuildLimitField(shown.storedMs, shown.typed)}
        saved={shown.saved}
        onChange={noop}
        onSave={noop}
      />
    </div>
  )
}

export const BUILD_LIMIT_AFTER_SAVE_SCENES: Scene[] = [
  {
    id: 'build-limit-after-save',
    title: 'Build limit still typed after Save',
    component: 'ProjectServeSettingsPanel',
    group: 'Settings',
    description:
      'After Save returns, a newer value typed before the project list echoes the saved minutes stays in the field, and Save stays available. With nothing newer typed, the field shows the saved minutes and Saved. Each state is its own address; nothing is clicked. The panel is what the settings hook returns at those two moments.',
    states: [
      {
        id: 'typed-after-save',
        title: '60 typed after 45 was saved',
        description:
          'The project holds 45 minutes (2700000). 60 is typed in the gap after Save. Save is available and Saved is absent.',
        render: () => <Panel state="typed-after-save" />,
      },
      {
        id: 'echoed',
        title: '45 echoed, nothing newer typed',
        description:
          'The project holds 45 minutes and nothing newer is typed. The field shows 45 and Saved.',
        render: () => <Panel state="echoed" />,
      },
    ],
  },
]
