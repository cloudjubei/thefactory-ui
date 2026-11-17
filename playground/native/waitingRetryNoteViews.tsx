import { View } from 'react-native'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { WaitingCard } from '../../src/native/compound/process/ProcessPipeline'
import { RETRY_DEFINITIONS_NEWER } from '../scenes/retryDefinitionsFixtures'
import { WAITING_RETRY_PICK, WAITING_RETRY_VIEW } from '../scenes/waitingRetryNoteFixtures'
import type { NativeView } from './views'

const noop = () => {}
const handedOn = async () => true
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/**
 * The waiting card on a phone. `?state=current` has Current selected.
 * `?state=note` has the note composer open, with Current still selected above it.
 * The note sends that pick. There is no readout of the resume body.
 */
export const WAITING_RETRY_NOTE_VIEWS: NativeView[] = [
  {
    id: 'waiting-retry-note',
    title: 'A waiting card’s own answer for a retry',
    render: (address) => (
      <AuthProvider storage={NO_TOKEN}>
        <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="mobile">
          <AppSettingsProvider storage={MEMORY}>
            <ProjectsProvider>
              <FilesProvider>
                <View style={{ width: 390, maxWidth: '100%' }}>
                  <WaitingCard
                    view={WAITING_RETRY_VIEW}
                    managerLine={undefined}
                    retry={{
                      definitions: RETRY_DEFINITIONS_NEWER,
                      pick: WAITING_RETRY_PICK,
                      onPick: noop,
                    }}
                    {...(address.get('state') === 'note' ? { noteForStart: 'retry' as const } : {})}
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
    ),
  },
]
