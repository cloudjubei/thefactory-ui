import type { CliImageBuildStep } from './cliImageViewTypes'

/** How old an upstream version check may be before opening CLI settings checks again. */
export const CLI_IMAGE_STALE_MS = 6 * 60 * 60 * 1000

/** How many trailing lines of build output a build view keeps. */
export const CLI_IMAGE_LOG_VISIBLE_LINES = 400

/** Shown in a build's log box before docker prints anything. */
export const CLI_IMAGE_LOG_WAITING = 'Waiting for docker output…'

/** Shown for the first stage before the build reports a stage. */
export const CLI_IMAGE_BUILD_STARTING = 'Starting…'

/** The stages of an image build, in order. */
export const CLI_IMAGE_BUILD_STEPS: readonly CliImageBuildStep[] = [
  {
    phase: 'building',
    label: 'Build image',
    hint: 'docker build downloads the base image and installs the CLI',
  },
  {
    phase: 'verifying',
    label: 'Verify version',
    hint: 'boots the new image and checks the CLI reports the requested version',
  },
  {
    phase: 'promoting',
    label: 'Switch to new image',
    hint: 'new runs start on the verified image',
  },
  {
    phase: 'restarting-sessions',
    label: 'Restart chat sessions',
    hint: 'resident sessions reconnect on the new version',
  },
]
