import { View } from 'react-native'
import { serveBuildLimitField } from 'thefactory-ui/headless'
import { ProjectServeSettingsPanel } from '../../src/native/compound/projects/ProjectServeSettings'
import { BUILD_LIMIT_AFTER_SAVE_STATES } from '../scenes/buildLimitAfterSaveFixtures'
import type { NativeView } from './views'

const noop = () => {}

/**
 * The build limit after Save, on a phone. `?state=typed-after-save` is stored
 * 45 minutes with 60 typed: Save is available and Saved is absent.
 * `?state=echoed` is stored 45 minutes with nothing newer typed: 45 and Saved.
 */
export const BUILD_LIMIT_AFTER_SAVE_VIEWS: NativeView[] = [
  {
    id: 'build-limit-after-save',
    title: 'Build limit still typed after Save',
    render: (address) => {
      const state = address.get('state') === 'echoed' ? 'echoed' : 'typed-after-save'
      const shown = BUILD_LIMIT_AFTER_SAVE_STATES[state]
      return (
        <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>
          <ProjectServeSettingsPanel
            field={serveBuildLimitField(shown.storedMs, shown.typed)}
            saved={shown.saved}
            onChange={noop}
            onSave={noop}
          />
        </View>
      )
    },
  },
]
