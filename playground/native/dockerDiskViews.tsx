import { ScrollView, View } from 'react-native'
import { DOCKER_DISK_TEXT } from '../../src/headless/utils/dockerDiskConstants'
import DockerDiskPanel from '../../src/native/compound/settings/DockerDiskPanel'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { ConfirmDialog } from '../../src/native/primitives/Modal'
import {
  DOCKER_DISK_CONFIRM_STATE,
  DOCKER_DISK_STATES,
  type DockerDiskState,
} from '../scenes/dockerDiskFixtures'
import type { NativeView } from './views'

const noop = () => {}
const idle = async () => {}

function Disk({ state }: { state: DockerDiskState }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface.base }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>
        <DockerDiskPanel
          disk={state.disk}
          loading={false}
          clearing={state.clearing ?? false}
          error={state.error ?? null}
          clear={idle}
          resize={idle}
        />
      </View>
    </ScrollView>
  )
}

/** Database settings’ Docker disk on mobile, one view per state of the web scene, on its fixtures. */
export const DOCKER_DISK_VIEWS: readonly NativeView[] = [
  ...DOCKER_DISK_STATES.map((state) => ({
    id: `docker-disk-${state.id}`,
    title: `Docker disk: ${state.title}`,
    render: () => <Disk state={state} />,
  })),
  {
    id: `docker-disk-${DOCKER_DISK_CONFIRM_STATE.id}`,
    title: `Docker disk: ${DOCKER_DISK_CONFIRM_STATE.title}`,
    render: () => (
      <ConfirmDialog
        isOpen
        onClose={noop}
        onConfirm={noop}
        title={DOCKER_DISK_TEXT.confirmTitle}
        description={DOCKER_DISK_TEXT.confirmBody}
        confirmLabel={DOCKER_DISK_TEXT.confirmAction}
        cancelLabel={DOCKER_DISK_TEXT.cancel}
        destructive
      />
    ),
  },
]
