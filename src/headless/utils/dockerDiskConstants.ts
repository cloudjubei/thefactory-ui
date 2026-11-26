export const DOCKER_DISK_BYTES_PER_GB = 1_000_000_000
export const DOCKER_DISK_WARN_PERCENT = 90
export const DOCKER_DISK_RESIZE_POLL_MS = 3000

export const DOCKER_DISK_TEXT = {
  title: 'Docker disk',
  intro:
    'The database and every sandbox share this disk. When it fills up the database stops, so keep some room.',
  loading: 'Checking…',
  usageLabel: 'Docker disk used',
  clear: 'Clear',
  clearing: 'Clearing…',
  nothingToClear: 'Nothing to clear',
  clearNote:
    'Clears the build cache and untagged images. Volumes and tagged images are kept; the next image build is slower.',
  sizeLabel: 'Disk size',
  resize: 'Resize',
  resizing: 'Docker is restarting with the new size. The database comes back by itself.',
  noRoom: 'This computer has no room to grow the disk.',
  confirmTitle: 'Restart Docker to resize?',
  confirmBody:
    'Docker restarts. The database and every running container, including agent runs in sandboxes, stop for a minute or two. The disk can only be made bigger from here.',
  confirmAction: 'Restart and resize',
  cancel: 'Cancel',
  nearlyFull: 'Nearly full. Clear space or make the disk bigger.',
} as const
