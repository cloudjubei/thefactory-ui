import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import ToolCallCard from '../../src/native/compound/chat/ToolCall/ToolCallCard'
import {
  ALREADY_HANDLED_CALL,
  ALREADY_HANDLED_RESULT,
  LIVE_ASK_CALL,
  SAME_CALL_RAN_CALL,
} from '../scenes/alreadyHandledFixtures'
import type { NativeView } from './views'

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 8 }}>{children}</View>
    </ScrollView>
  )
}

function Handled({ state }: { state: string }) {
  return (
    <Phone>
      {state === 'same-call' ? (
        <ToolCallCard
          toolCall={SAME_CALL_RAN_CALL}
          resultType="not_allowed"
          result={{ outcome: 'expired', reason: SAME_CALL_RAN_CALL.alreadyHandled }}
        />
      ) : (
        <ToolCallCard
          toolCall={ALREADY_HANDLED_CALL}
          resultType="not_allowed"
          result={ALREADY_HANDLED_RESULT}
        />
      )}
      {state === 'beside-live' ? (
        <ToolCallCard
          toolCall={LIVE_ASK_CALL}
          resultType="require_confirmation"
          selectable
          selected={false}
          onToggleSelect={() => {}}
        />
      ) : null}
    </Phone>
  )
}

/** A tool row whose ask closed itself as already handled — `?state=same-call|beside-live`. */
export const ALREADY_HANDLED_VIEWS: NativeView[] = [
  {
    id: 'tool-call-already-handled',
    title: 'An ask already handled',
    render: (address) => <Handled state={address.get('state') ?? 'needs-you'} />,
  },
]
