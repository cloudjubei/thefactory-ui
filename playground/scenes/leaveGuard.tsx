import { APP_DIRTY_DEFAULT_MESSAGE } from 'thefactory-ui/headless'
import LeaveConfirmDialog from '../../src/web/compound/shell/LeaveConfirmDialog'
import type { Scene } from '../showcase/types'

const noop = () => {}

export const LEAVE_GUARD_SCENES: Scene[] = [
  {
    id: 'leave-unsaved-app',
    title: 'Leave an app with unsaved changes',
    component: 'RouterLeaveGuard (LeaveConfirmDialog)',
    group: 'Primitives',
    description:
      'Asked before leaving the App view while the embedded app reports unsaved changes (`overseer:app.dirty`): another tab, another project, back / forward. Same style as discarding a form: one destructive Leave, and X or Esc stays. A reload or closing the window gets the browser’s own prompt instead.',
    states: [
      {
        id: 'app-message',
        title: 'The app’s own message',
        description: 'The app named what is unsaved, so the question says it.',
        overlay: true,
        render: () => (
          <LeaveConfirmDialog
            message="2 scenarios are not saved. Leave anyway?"
            onLeave={noop}
            onStay={noop}
          />
        ),
      },
      {
        id: 'default-message',
        title: 'No message from the app',
        description: 'The app only said it has unsaved changes.',
        overlay: true,
        render: () => (
          <LeaveConfirmDialog message={APP_DIRTY_DEFAULT_MESSAGE} onLeave={noop} onStay={noop} />
        ),
      },
    ],
  },
]
