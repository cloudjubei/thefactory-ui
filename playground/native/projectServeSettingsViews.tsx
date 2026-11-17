import { View } from 'react-native'
import { serveBuildLimitField } from 'thefactory-ui/headless'
import { ProjectServeSettingsPanel } from '../../src/native/compound/projects/ProjectServeSettings'
import { SERVE_BUILD_LIMIT_SCENE_STATES } from '../scenes/projectServeSettingsFixtures'
import type { NativeView } from './views'

const noop = () => {}

/**
 * A project's serve settings on a phone. `?state=default` is an empty build
 * limit (placeholder 30). `edited` has 45 typed and Save available. `saved`
 * holds 45 and says Saved. `invalid` is 0, which cannot be saved. `save-failed`
 * keeps 45 and says the save did not go through.
 */
export const PROJECT_SERVE_SETTINGS_VIEWS: NativeView[] = [
  {
    id: 'project-serve-settings',
    title: 'Settings › Project › Serve',
    render: (address) => {
      const state =
        SERVE_BUILD_LIMIT_SCENE_STATES[address.get('state') ?? 'default'] ??
        SERVE_BUILD_LIMIT_SCENE_STATES.default
      return (
        <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>
          <ProjectServeSettingsPanel
            field={serveBuildLimitField(state.storedMs, state.typed)}
            saved={state.saved === true}
            saving={state.saving === true}
            {...(state.saveError ? { saveError: state.saveError } : {})}
            onChange={noop}
            onSave={noop}
          />
        </View>
      )
    },
  },
]
