import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { ProcessPublishEdit } from 'thefactory-ui/headless'
import { ProcessGroupLegCard } from '../../src/native/compound/process/ProcessGroupPipeline'
import PublishCard from '../../src/native/compound/process/PublishCard'
import {
  LEG_PUBLISH_STATES,
  groupPublishView,
  legDeliveryOf,
  legPublishCardOf,
  legPublishEdits,
  type LegPublishStateId,
} from '../scenes/groupLegPublishFixtures'
import type { NativeView } from './views'

const noop = () => undefined

function Legs({ id }: { id: LegPublishStateId }) {
  const state = LEG_PUBLISH_STATES[id]
  const [edits, setEdits] = useState(() => legPublishEdits(state))
  const [pressed, setPressed] = useState(false)
  const onEdit = (projectId: string, field: keyof ProcessPublishEdit, value: string) =>
    setEdits((was) => ({ ...was, [projectId]: { ...was[projectId]!, [field]: value } }))
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>
        {'groupCard' in state ? (
          <PublishCard
            view={groupPublishView(state, edits, pressed)}
            onEdit={onEdit}
            onPublish={() => setPressed(true)}
            onStop={noop}
          />
        ) : null}
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
      </View>
    </ScrollView>
  )
}

/**
 * Open pull request on a group leg, on a phone, at `?view=group-leg-publish&state=`
 * one of the web scene's: one-ready, publishing, published, refused or both-ready.
 */
export const GROUP_LEG_PUBLISH_VIEWS: NativeView[] = [
  {
    id: 'group-leg-publish',
    title: 'Open pull request on a group leg',
    render: (address) => {
      const asked = address.get('state') ?? 'one-ready'
      const id = (asked in LEG_PUBLISH_STATES ? asked : 'one-ready') as LegPublishStateId
      return <Legs key={id} id={id} />
    },
  },
]
