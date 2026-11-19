import { useState } from 'react'
import { View } from 'react-native'
import { REMOTE_BROWSER_TEXT } from 'thefactory-ui/headless'
import ChatInput from '../../src/native/compound/chat/ChatInput'
import {
  RemoteBrowserBeside,
  RemoteBrowserNotes,
  RemoteBrowserView,
} from '../../src/native/compound/remoteBrowser'
import {
  BROWSER_PROJECT,
  useRemoteBrowserScene,
  type BrowserSceneProps,
  type BrowserStep,
} from '../scenes/remoteBrowserFixtures'
import type { NativeView } from './views'

function Demo(props: BrowserSceneProps) {
  const { state, store } = useRemoteBrowserScene(props)
  const [text, setText] = useState('')
  return (
    <View
      style={{ width: 390, height: 780, maxWidth: '100%', overflow: 'hidden', borderRadius: 28 }}
    >
      <RemoteBrowserBeside
        chatTitle="Pricing page review"
        chatMeta={REMOTE_BROWSER_TEXT.messages(props.shared ? 3 : 2)}
        browser={<RemoteBrowserView state={state} store={store} />}
        chat={
          <>
            <RemoteBrowserNotes
              projectId={BROWSER_PROJECT}
              notes={state.notes}
              onEdit={(id, comment) => store.editNote(id, comment)}
              onRemove={(id) => store.removeNote(id)}
            />
            <ChatInput value={text} onChange={setText} onSend={() => setText('')} clearOnSend />
          </>
        }
      />
    </View>
  )
}

const STEPS: { id: string; title: string; props: Omit<BrowserSceneProps, 'device'> }[] = [
  { id: 'live', title: 'Browsing', props: {} },
  { id: 'loading', title: 'Loading', props: { silent: true } },
  { id: 'pick', title: 'Pick an element', props: { step: 'pick' as BrowserStep } },
  { id: 'mark', title: 'Mark an area', props: { step: 'mark' as BrowserStep } },
  { id: 'notes', title: 'Notes staged', props: { step: 'notes' as BrowserStep } },
  { id: 'shared', title: 'The agent shares its browser', props: { shared: true } },
  { id: 'lost', title: 'Reconnecting', props: { step: 'lost' as BrowserStep } },
  { id: 'ended', title: 'Browser closed', props: { step: 'ended' as BrowserStep } },
]

export const REMOTE_BROWSER_VIEWS: NativeView[] = STEPS.map((step) => ({
  id: `remote-browser-${step.id}`,
  title: `Browser beside the chat: ${step.title}`,
  render: () => <Demo device="phone" {...step.props} />,
}))
