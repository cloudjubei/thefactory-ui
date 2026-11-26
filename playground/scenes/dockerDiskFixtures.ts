import type { DockerDisk } from '../../src/headless/utils/dockerDiskTypes'

const GB = 1_000_000_000

const ROOMY: DockerDisk = {
  usedBytes: 36 * GB,
  allocatedBytes: 64 * GB,
  reclaimableBytes: 12.5 * GB,
  resize: { currentGb: 64, maxGb: 164 },
  resizing: false,
}

export type DockerDiskState = {
  id: string
  title: string
  description: string
  disk: DockerDisk | null
  clearing?: boolean
  error?: string
}

export const DOCKER_DISK_STATES: readonly DockerDiskState[] = [
  {
    id: 'room-to-spare',
    title: 'Room to spare',
    description: 'A little over half used, 12.5 GB to clear, room to grow to 164 GB.',
    disk: ROOMY,
  },
  {
    id: 'nearly-full',
    title: 'Nearly full',
    description: 'At 90% and over the bar turns red and one line says what to do.',
    disk: { ...ROOMY, usedBytes: 62 * GB, reclaimableBytes: 28.9 * GB },
  },
  {
    id: 'clearing',
    title: 'Clearing',
    description:
      'Straight after Clear: the bar already shows the space as freed while Docker works.',
    disk: { ...ROOMY, usedBytes: 23.5 * GB, reclaimableBytes: 0 },
    clearing: true,
  },
  {
    id: 'nothing-to-clear',
    title: 'Nothing to clear',
    description: 'An empty build cache: the button is off and says so.',
    disk: { ...ROOMY, reclaimableBytes: 0 },
  },
  {
    id: 'resizing',
    title: 'Docker restarting',
    description: 'After a confirmed resize: the last reading stays, both actions are off.',
    disk: { ...ROOMY, resizing: true },
  },
  {
    id: 'resize-failed',
    title: 'Resize failed',
    description: 'Docker’s own reason, kept until the next resize.',
    disk: { ...ROOMY, resizeError: 'Docker did not stop: timed out' },
  },
  {
    id: 'no-room-to-grow',
    title: 'No room to grow',
    description: 'The computer is short of space, so there is no slider.',
    disk: { ...ROOMY, resize: { currentGb: 64, maxGb: 64 } },
  },
  {
    id: 'size-not-adjustable',
    title: 'Size not adjustable',
    description:
      'Where Docker has no size setting to change (Docker on Linux uses the computer’s own disk): usage and Clear only.',
    disk: {
      usedBytes: 310 * GB,
      allocatedBytes: 500 * GB,
      reclaimableBytes: 4 * GB,
      resizing: false,
    },
  },
  {
    id: 'cannot-measure',
    title: 'Cannot measure',
    description: 'Docker is off or the database container is gone.',
    disk: null,
    error:
      'Docker’s disk cannot be measured. Check that Docker is running and the database container exists.',
  },
]

export const DOCKER_DISK_CONFIRM_STATE = {
  id: 'confirm-resize',
  title: 'Confirm resize',
  description: 'What Resize asks before Docker restarts.',
}
