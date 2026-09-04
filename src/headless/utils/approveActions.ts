import type { ApproveActionDescriptor } from './runReviewTypes'

/**
 * The three ways to approve, each fully described.
 *
 * One source for the button, its hover callout and its confirm dialog, so the
 * promise made on hover is the same sentence the dialog then makes — and both
 * name the real branches rather than describing the feature in the abstract.
 * "Approve" on its own never said where the work would end up, which is the only
 * thing that actually differs between these.
 */
export function approveActionDescriptors(input: {
  /** The review branch the run landed on. */
  branch: string
  /** The branch a merge would land into. */
  baseBranch: string
  hasRemote: boolean
  /** How many files the run changed. */
  fileCount: number
}): ApproveActionDescriptor[] {
  const { branch, baseBranch, hasRemote, fileCount } = input
  const files = `${fileCount} file${fileCount === 1 ? '' : 's'}`

  return [
    {
      action: 'leave-branch',
      label: 'Approve',
      hint: `Record your approval and stop. The work stays on ${branch} for you to handle.`,
      title: 'Approve and leave the branch',
      effects: [
        'Records your approval on this run.',
        `Nothing is merged — ${baseBranch} is untouched.`,
        `The ${branch} branch stays as it is, with ${files} on it.`,
      ],
      confirmLabel: 'Approve',
    },
    {
      action: 'create-pr',
      label: 'Approve & open PR',
      hint: `Push ${branch} and open a pull request against ${baseBranch} in your browser.`,
      title: 'Approve and open a pull request',
      effects: [
        'Records your approval on this run.',
        `Pushes ${branch} to origin — this sends your code to the remote.`,
        `Opens the pull-request page for ${branch} → ${baseBranch} in your browser.`,
        `Nothing is merged locally; ${baseBranch} is untouched.`,
      ],
      confirmLabel: 'Push and open',
      ...(hasRemote
        ? {}
        : {
            disabledReason:
              'This project has no remote, so there is nowhere to open a pull request.',
          }),
    },
    {
      action: 'merge',
      label: 'Approve & merge',
      hint: `Merge ${branch} into ${baseBranch} here, on this machine.`,
      title: 'Approve and merge',
      effects: [
        'Records your approval on this run.',
        `Merges ${branch} into ${baseBranch}, applying ${files} to your working tree.`,
        'Uncommitted local changes are stashed and restored around the merge.',
        'Blocked if this project requires passing verification and it has not passed.',
      ],
      confirmLabel: 'Merge',
    },
  ]
}
