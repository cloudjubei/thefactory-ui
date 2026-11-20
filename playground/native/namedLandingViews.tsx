import { ScrollView, View } from 'react-native'
import NamedLandingForm from '../../src/native/compound/process/NamedLandingForm'
import {
  NAMED_LANDING_STATES,
  type NamedLandingState,
  type NamedLandingStateId,
} from '../scenes/namedLandingFixtures'
import type { NativeView } from './views'

function Form({ id }: { id: NamedLandingStateId }) {
  const state: NamedLandingState = NAMED_LANDING_STATES[id]
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>
        <NamedLandingForm
          action={state.action}
          {...(state.text !== undefined ? { initialText: state.text } : {})}
        />
      </View>
    </ScrollView>
  )
}

/**
 * Finish as merged by a link or a commit on a phone, at `?view=merged-another-way&state=`
 * one of the web scene's: closed, link, commit, two-things, finishing or refused.
 */
export const NAMED_LANDING_VIEWS: NativeView[] = [
  {
    id: 'merged-another-way',
    title: 'Finish as merged by a link or a commit',
    render: (address) => {
      const asked = address.get('state') ?? 'closed'
      const id = (asked in NAMED_LANDING_STATES ? asked : 'closed') as NamedLandingStateId
      return <Form key={id} id={id} />
    },
  },
]
