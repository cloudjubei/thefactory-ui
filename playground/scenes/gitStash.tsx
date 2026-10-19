import { StashDialogView } from '../../src/web/compound/git/dialogs/StashDialog'
import type { Scene } from '../showcase/types'

const noop = () => {}
const stashed = async () => undefined

export const GIT_STASH_SCENES: Scene[] = [
  {
    id: 'git-stash',
    title: 'Stash changes',
    component: 'StashDialog (StashDialogView)',
    group: 'Primitives',
    description:
      'The Git view’s stash dialog. Files git does not track stay in the folder unless “Include untracked files” is ticked; then they go into the stash too, as `git stash --include-untracked` does.',
    states: [
      {
        id: 'tracked-only',
        title: 'Tracked changes only',
        description: 'The default: untracked files are left in the folder.',
        overlay: true,
        render: () => <StashDialogView isOpen onClose={noop} onStash={stashed} />,
      },
      {
        id: 'include-untracked',
        title: 'Untracked files included',
        description: 'Ticked: the stash takes the untracked files with it, staged files kept.',
        overlay: true,
        render: () => (
          <StashDialogView
            isOpen
            onClose={noop}
            onStash={stashed}
            initial={{ message: 'WIP: notes', keepIndex: true, includeUntracked: true }}
          />
        ),
      },
    ],
  },
]
