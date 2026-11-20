import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { testSessionDisplay } from 'thefactory-ui/headless'
import { RunModelChip } from '../../src/native/compound/chat/signoff'
import { TestWithMePanel } from '../../src/native/compound/process/signoff/TestWithMeCard'
import { TEST_WITH_ME_STATES, type TestWithMeState } from '../scenes/testWithMeFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>{children}</View>
    </ScrollView>
  )
}

function Block({ state }: { state: string }) {
  const confirmingStop = state === 'stop-confirm'
  const named = confirmingStop ? 'running' : state
  const known = (named in TEST_WITH_ME_STATES ? named : 'running') as TestWithMeState
  const display = testSessionDisplay(TEST_WITH_ME_STATES[known])
  if (!display) return null
  return (
    <Phone>
      <TestWithMePanel
        display={display}
        onStart={noop}
        onStop={noop}
        onOpen={noop}
        onOpenChat={noop}
        modelChip={
          <RunModelChip
            model={{ tool: 'claude-code', tag: 'CLI', model: 'Opus 5.5', effort: undefined }}
          />
        }
        {...(confirmingStop ? { confirmingStop } : {})}
      />
    </Phone>
  )
}

/** The "Test with me" block (`&state=idle|starting|just-up|running|stopping|stopped|run-ended|failed|start-refused|helper-gathering|helper-not-started|helper-stopped|no-data-environment|stop-confirm`). */
export const TEST_WITH_ME_VIEWS: NativeView[] = [
  {
    id: 'test-with-me',
    title: 'Sign-off: test with me',
    render: (address) => <Block state={address.get('state') ?? 'running'} />,
  },
]
