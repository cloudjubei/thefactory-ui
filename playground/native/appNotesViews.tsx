import { useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { OnFixtures } from '../scenes/onFixtures'
import { APP_NOTE_SEND_ROUTES, useSentAppNote } from '../scenes/appNoteSend'
import ProjectAppView from '../../src/native/compound/ProjectAppView'
import { WebViewFixture } from './stubs/webview'
import ChatInput from '../../src/native/compound/chat/ChatInput'
import type { AppNote } from '../../src/headless/utils/appNotesTypes'
import type { NativeView } from './views'

function Demo() {
  const [text, setText] = useState('')
  const [picking, setPicking] = useState(false)
  const [notes, setNotes] = useState<AppNote[]>([
    {
      id: 'one',
      projectId: 'sample',
      comment: 'Make the renewal date easier to find.',
      targets: [
        {
          kind: 'element',
          selector: '#renewal',
          outerHtml: '<p id="renewal">Renews November 20</p>',
        },
      ],
    },
    {
      id: 'two',
      projectId: 'sample',
      comment: 'Explain what is included before this action.',
      targets: [
        {
          kind: 'element',
          selector: '[data-testid="upgrade"]',
          outerHtml: '<button data-testid="upgrade">Upgrade</button>',
        },
      ],
    },
  ])
  const [sent, setSent] = useState('')
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {picking ? <Text>Host opens this chat’s ProjectAppView in pick mode.</Text> : null}
      <ChatInput
        value={text}
        onChange={setText}
        appNotes={notes}
        onChangeAppNotes={setNotes}
        onShowApp={() => setPicking(true)}
        onSend={(_, __, meta) => setSent(JSON.stringify(meta?.appNotes ?? []))}
        clearOnSend
      />
      {sent ? <Text accessibilityLabel="Sent structured context">{sent}</Text> : null}
    </View>
  )
}

// No network, clock or delayed state: the fake app settles on these two targets.
// This exercises native ProjectAppView's JSON message boundary and actual selection cards,
// not a device WebView or the shared bridge's stable-selector algorithm.
const pickSurface = (active: boolean, post: (message: unknown) => void) => (
  <View style={{ padding: 20, paddingTop: 110, gap: 16, backgroundColor: '#f4f5f7', flex: 1 }}>
    <Text style={{ fontSize: 22, color: '#17202a' }}>Workspace plan</Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pick renewal date"
      disabled={!active}
      onPress={() =>
        post({
          type: 'overseer:pick.selected',
          payload: {
            selector: '#renewal',
            outerHtml: '<p id="renewal">Renews November 20</p>',
          },
        })
      }
    >
      <Text style={{ color: '#17202a' }}>Renews November 20</Text>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pick Upgrade button"
      disabled={!active}
      onPress={() =>
        post({
          type: 'overseer:pick.selected',
          payload: {
            selector: '[data-testid="upgrade"]',
            outerHtml: '<button data-testid="upgrade">Upgrade</button>',
          },
        })
      }
    >
      <Text style={{ color: '#1260a0' }}>Upgrade</Text>
    </Pressable>
  </View>
)

function PickerDemo() {
  const nextPickId = useRef(0)
  const [appNotes, setAppNotes] = useState<AppNote[]>([])
  const [picking, setPicking] = useState(true)
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  return (
    <View style={{ padding: 16, gap: 12, width: 680, maxWidth: '100%' }}>
      <Text>Native picker · dry simulated WebView bridge (not a device)</Text>
      <WebViewFixture.Provider value={pickSurface}>
        <View style={{ height: 300 }}>
          <ProjectAppView
            url="https://fixture.invalid/workspace-plan"
            pickMode={picking}
            onExitPickMode={() => setPicking(false)}
            onElementPick={(pick) => {
              const id = `pick-${++nextPickId.current}`
              setAppNotes((current) => [
                ...current,
                {
                  id,
                  projectId: 'sample',
                  comment: '',
                  targets: [
                    { kind: 'element', selector: pick.selector, outerHtml: pick.outerHtml },
                  ],
                },
              ])
            }}
          />
        </View>
      </WebViewFixture.Provider>
      <ChatInput
        value={text}
        onChange={setText}
        appNotes={appNotes}
        onChangeAppNotes={setAppNotes}
        onShowApp={() => setPicking(true)}
        onSend={(_, __, meta) => setSent(JSON.stringify(meta?.appNotes ?? []))}
        clearOnSend
      />
      {sent ? <Text accessibilityLabel="Sent structured context">{sent}</Text> : null}
    </View>
  )
}

function SentNote() {
  const sent = useSentAppNote()
  if (sent.status === 'sending') return <Text>Sending the note to the launching chat…</Text>
  if (sent.status === 'error') return <Text>{sent.message}</Text>
  return (
    <View>
      <Text>Sent to the launching chat</Text>
      <Text>{sent.content}</Text>
      <Text>{sent.selector}</Text>
      <Text>{sent.comment}</Text>
    </View>
  )
}

export const APP_NOTE_VIEWS: NativeView[] = [
  { id: 'app-selections', title: 'App selections: edit, remove and send', render: () => <Demo /> },
  {
    id: 'app-note-send',
    title: 'App note sent to the launching chat',
    render: () => (
      <OnFixtures routes={APP_NOTE_SEND_ROUTES}>
        <SentNote />
      </OnFixtures>
    ),
  },
  {
    id: 'app-picker',
    title: 'ProjectAppView: native picker to selection card',
    render: () => <PickerDemo />,
  },
]
