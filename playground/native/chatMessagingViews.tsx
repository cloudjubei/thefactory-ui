import { View } from 'react-native'
import type { NativeView } from './views'
import ChatMessagingSetting from '../../src/native/compound/settings/ChatMessagingSetting'
import ToolAskApprovalPanel from '../../src/native/compound/chat/ToolAskApprovalPanel'
import type { PendingToolGrant } from '../../src/headless/utils/chatTypes'
import { OnFixtures } from '../scenes/onFixtures'
import { chatMessagingRoutes } from '../scenes/chatMessagingFixtures'

const ARGS = {
  chatId: '/projects/thefactory-backend',
  message: 'Please check the release notes.',
  awaitReply: false,
}
const GRANT = {
  id: 'message-approval',
  label: 'sendChatMessage',
  toolName: 'sendChatMessage',
  args: ARGS,
  detail: {
    tool: 'sendChatMessage',
    args: ARGS,
    detail: { targetProjectId: 'thefactory-backend', targetTitle: 'Release prep' },
  },
  alwaysAllowScopes: ['chat'],
  decide: async () => {},
} as unknown as PendingToolGrant

/** Stored choices and failed writes are fixed by the URL; no timers or real backend. */
export const CHAT_MESSAGING_VIEWS: readonly NativeView[] = [
  {
    id: 'chat-messaging-setting',
    title: 'Let agents message other chats',
    render: (address) => (
      <OnFixtures
        routes={chatMessagingRoutes(address.get('on') === '1', address.get('fail') === '1')}
      >
        <View style={{ padding: 16, maxWidth: 440 }}>
          <ChatMessagingSetting />
        </View>
      </OnFixtures>
    ),
  },
  {
    id: 'chat-messaging-approval',
    title: 'Send-message approval',
    render: () => (
      <OnFixtures routes={chatMessagingRoutes()}>
        <View style={{ padding: 16, maxWidth: 440 }}>
          <ToolAskApprovalPanel grant={GRANT} onDecideLater={() => {}} chatTitle="Group planning" />
        </View>
      </OnFixtures>
    ),
  },
]
