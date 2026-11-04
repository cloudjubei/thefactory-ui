import { CommitDialogView } from '../../src/web/compound/git/dialogs/CommitDialog'
import { STATUS } from '../../src/fakeBackend/fixtures/git'
import type { Scene } from '../showcase/types'

const noop = () => {}
const done = async () => undefined

const HOOK_OUTPUT = [
  '⋯ Backing up original state…',
  '✔ Done backing up original state (adbfb870)!',
  '⋯ Running tasks for staged files…',
  '    *.{ts,js,mjs} — 24 files',
  '\u001b[31m✖\u001b[39m eslint --fix --no-warn-ignored --max-warnings=0',
  '↓ prettier --write',
  '',
  '\u001b[31m✖\u001b[39m eslint --fix --no-warn-ignored --max-warnings=0:',
  '',
  '/Users/cloud/Documents/Work/thefactory-tools/src/workflow/ProcessGroupDriver.test.ts',
  "  860:9  \u001b[31merror\u001b[39m  'open' is never reassigned. Use 'const' instead  \u001b[2mprefer-const\u001b[22m",
  '',
  '\u001b[31m\u001b[1m✖ 1 problem (1 error, 0 warnings)\u001b[22m\u001b[39m',
  'husky - pre-commit script failed (code 1)',
].join('\n')

export const COMMIT_CHECKS_SCENES: Scene[] = [
  {
    id: 'commit-checks',
    title: 'Commit stopped by its checks',
    component: 'CommitDialog (CommitDialogView)',
    group: 'Primitives',
    description:
      'A commit the project’s pre-commit hook refused. The dialog says nothing was committed, shows what the checks printed as a terminal does, keeps the message, and offers “Fix with an agent”: a new project chat sent the output and the staged files, working in a copy that holds them; its change comes back to apply, and staged files stay staged. Any other failure shows the server’s own reason instead of a status code.',
    states: [
      {
        id: 'stopped',
        title: 'Stopped by the checks',
        description: 'The hook’s output with its colours, and the way to hand it to an agent.',
        overlay: true,
        render: () => (
          <CommitDialogView
            isOpen
            onClose={noop}
            status={STATUS}
            onCommit={done}
            onPush={done}
            onFixWithAgent={done}
            initial={{ message: 'Project group stories', hookOutput: HOOK_OUTPUT }}
          />
        ),
      },
      {
        id: 'stopped-silent',
        title: 'Stopped without a reason',
        description: 'A hook that refused the commit and printed nothing.',
        overlay: true,
        render: () => (
          <CommitDialogView
            isOpen
            onClose={noop}
            status={STATUS}
            onCommit={done}
            onPush={done}
            onFixWithAgent={done}
            initial={{
              message: 'Project group stories',
              hookOutput: 'A commit hook stopped the commit without saying why.',
            }}
          />
        ),
      },
    ],
  },
]
