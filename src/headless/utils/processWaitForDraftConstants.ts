import type { ProcessWaitForHow } from 'thefactory-tools/types'

/** A pull request link: http or https. */
export const PROCESS_WAIT_FOR_LINK = /^https?:\/\//i

/** A commit id: 7 to 40 hexadecimal characters. */
export const PROCESS_WAIT_FOR_COMMIT = /^[0-9a-f]{7,40}$/i

/** The prefix of a launch card's wait row keys. */
export const PROCESS_WAIT_FOR_ROW_KEY = 'w'

/** What a row's target was read as, in a word. */
export const PROCESS_WAIT_FOR_KIND_LABELS: Record<ProcessWaitForHow, string> = {
  branch: 'branch',
  commit: 'commit',
  'pull-request': 'pull request',
}

/** The words of a launch card's "Wait for other work before proof". */
export const PROCESS_WAIT_FOR_LAUNCH_COPY = {
  add: 'Wait for other work before proof',
  heading: 'Wait for other work before proof',
  hint: 'The run builds and checks now, then waits before its proof until this work is on its base branch.',
  label: 'Label',
  labelPlaceholder: 'ZNR-780',
  target: 'Branch, commit or PR link',
  targetPlaceholder: 'znr-780-persona-evals',
  project: 'Project',
  ownProject: 'This project',
  addAnother: 'Add another',
  remove: 'Remove',
  checking: 'Checking…',
  stepLine: (labels: string, step: string, next: string | undefined) =>
    `Waits for ${labels} at “${step}”${next ? `, before ${next}` : ''}`,
  beforeProof: (labels: string) => `Waits for ${labels} before its proof`,
} as const
