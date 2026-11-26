import { DOCKER_DISK_TEXT } from '../../src/headless/utils/dockerDiskConstants'
import { ConfirmDialog } from '../../src/web'
import DockerDiskPanel from '../../src/web/compound/settings/DockerDiskPanel'
import type { Scene } from '../showcase/types'
import {
  DOCKER_DISK_CONFIRM_STATE,
  DOCKER_DISK_STATES,
  type DockerDiskState,
} from './dockerDiskFixtures'

const noop = async () => {}

function panel({ disk, clearing, error }: DockerDiskState) {
  return (
    <DockerDiskPanel
      disk={disk}
      loading={false}
      clearing={clearing ?? false}
      error={error ?? null}
      clear={noop}
      resize={noop}
    />
  )
}

export const DOCKER_DISK_SCENES: Scene[] = [
  {
    id: 'docker-disk',
    title: 'Docker disk',
    component: 'DockerDiskPanel',
    group: 'Settings',
    description:
      'Database settings’ Docker disk, the same on web and desktop (mobile draws the same facts and wording natively): how much of the disk Docker was given is used, one button that clears the build cache and untagged images and names how much that frees, and a size slider that only goes up, to what the computer can hold. Clear acts at once and the bar drops before Docker answers. Resize asks first, because Docker restarts and takes the database and every sandbox down for a minute or two.',
    states: [
      ...DOCKER_DISK_STATES.map((state) => ({
        id: state.id,
        title: state.title,
        description: state.description,
        render: () => panel(state),
      })),
      {
        ...DOCKER_DISK_CONFIRM_STATE,
        overlay: true,
        render: () => (
          <ConfirmDialog
            isOpen
            onClose={() => {}}
            onConfirm={() => {}}
            title={DOCKER_DISK_TEXT.confirmTitle}
            description={DOCKER_DISK_TEXT.confirmBody}
            confirmLabel={DOCKER_DISK_TEXT.confirmAction}
            cancelLabel={DOCKER_DISK_TEXT.cancel}
            destructive
          />
        ),
      },
    ],
  },
]
