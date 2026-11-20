import type { ReactNode } from 'react'
import { NamedLandingForm } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import {
  NAMED_LANDING_STATES,
  NAMED_LANDING_STATE_TEXT,
  type NamedLandingState,
  type NamedLandingStateId,
} from './namedLandingFixtures'

const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

function Form({ id, confirming = false }: { id: NamedLandingStateId; confirming?: boolean }) {
  const state: NamedLandingState = NAMED_LANDING_STATES[id]
  return (
    <NamedLandingForm
      action={state.action}
      {...(state.text !== undefined ? { initialText: state.text } : {})}
      initialConfirming={confirming}
    />
  )
}

const states: SceneState[] = [
  ...(Object.keys(NAMED_LANDING_STATE_TEXT) as NamedLandingStateId[]).map((id) => ({
    id,
    ...NAMED_LANDING_STATE_TEXT[id],
    render: () => page(<Form id={id} />),
  })),
  {
    id: 'confirm',
    title: 'The confirm',
    description: 'What finishing records, by the link named, and that nothing is merged or pushed.',
    overlay: true,
    render: () => page(<Form id="link" confirming />),
  },
  {
    id: 'link-phone',
    title: 'A pull request link, on a phone',
    description: 'The small-screen width: the mobile app’s native form follows this.',
    render: () => phone(<Form id="link" />),
  },
]

export const NAMED_LANDING_SCENES: Scene[] = [
  {
    id: 'merged-another-way',
    title: 'Finish as merged by a link or a commit',
    component: 'NamedLandingForm',
    group: 'Process',
    description:
      'A run whose work went in another way — another pull request, or by hand — is finished as merged by the pull request’s link or the commit on its base. Offered at the run’s own sign-off, once it stopped, and when approved and not merged; a group’s leg is then marked merged with it.',
    states,
  },
]
