import { useState } from 'react'
import type { ProcessPublishEdit } from 'thefactory-ui/headless'
import { ProcessGroupLegCard } from '../../src/web/compound/process/ProcessGroupPipeline'
import PublishCard from '../../src/web/compound/process/PublishCard'
import type { Scene, SceneState } from '../showcase/types'
import {
  LEG_PUBLISH_STATES,
  groupPublishView,
  legDeliveryOf,
  legPublishCardOf,
  legPublishEdits,
  type LegPublishStateId,
} from './groupLegPublishFixtures'

const noop = () => undefined

/** The group run page's legs in one state; pressing Open pull request shows it going at once. */
function Legs({ id, width = 720 }: { id: LegPublishStateId; width?: number }) {
  const state = LEG_PUBLISH_STATES[id]
  const [edits, setEdits] = useState(() => legPublishEdits(state))
  const [pressed, setPressed] = useState(false)
  const onEdit = (projectId: string, field: keyof ProcessPublishEdit, value: string) =>
    setEdits((was) => ({ ...was, [projectId]: { ...was[projectId]!, [field]: value } }))
  return (
    <div className="flex flex-col gap-3 p-4" style={{ maxWidth: width }}>
      {'groupCard' in state ? (
        <PublishCard
          view={groupPublishView(state, edits, pressed)}
          onEdit={onEdit}
          onPublish={() => setPressed(true)}
          onStop={noop}
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {state.rows.map((row) => {
          const card = legPublishCardOf(state, row, edits, pressed)
          return (
            <ProcessGroupLegCard
              key={row.leg.id}
              row={row}
              delivery={legDeliveryOf(state, row)}
              now={0}
              onOpen={noop}
              onMarkLanded={noop}
              {...(card
                ? {
                    publish: (
                      <PublishCard
                        view={card.view}
                        onEdit={onEdit}
                        onPublish={() => setPressed(true)}
                      />
                    ),
                  }
                : {})}
            />
          )
        })}
      </div>
    </div>
  )
}

const STATE_TEXT: Record<LegPublishStateId, { title: string; description: string }> = {
  'one-ready': {
    title: 'One leg ready, another building',
    description:
      'The docs leg waits at its gate: its own card, with its branch, PR title and account. Open pull request publishes that leg alone; the API leg builds on.',
  },
  publishing: {
    title: 'Opening its pull request',
    description: 'Shown at once on the press: the fields lock and a second press does nothing.',
  },
  published: {
    title: 'Published',
    description: 'Its pull request on the leg, and the leg moved on to its sign-off.',
  },
  refused: {
    title: 'Refused',
    description:
      'Back to the card with the backend’s reason, the edits kept. Press again to retry.',
  },
  'both-ready': {
    title: 'Both legs ready',
    description:
      'The whole group waits to publish: one card above the legs opens every pull request, and the legs carry none of their own.',
  },
}

const states: SceneState[] = [
  ...(Object.keys(STATE_TEXT) as LegPublishStateId[]).map((id) => ({
    id,
    ...STATE_TEXT[id],
    render: () => <Legs id={id} />,
  })),
  {
    id: 'one-ready-phone',
    title: 'One leg ready, on a phone',
    description: 'The small-screen width: the mobile app’s native page follows this.',
    render: () => <Legs id="one-ready" width={390} />,
  },
  {
    id: 'both-ready-phone',
    title: 'Both legs ready, on a phone',
    render: () => <Legs id="both-ready" width={390} />,
  },
]

export const GROUP_LEG_PUBLISH_SCENES: Scene[] = [
  {
    id: 'group-leg-publish',
    title: 'Open pull request on a group leg',
    component: 'ProcessGroupLegCard + PublishCard',
    group: 'Process',
    description:
      'A pull-request-first group run’s page: a leg waiting at its publish gate opens its own pull request from its card while the others still work. When every leg waits and the group is parked to publish, the group’s one card does it for all.',
    states,
  },
]
