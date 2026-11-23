import { useState } from 'react'
import { ChatInput } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import {
  SCREENSHOT_CASES,
  useScreenshotScene,
  webScreenshotFile,
  type ScreenshotAnnotationCase,
} from './screenshotAnnotationFixtures'

function Demo({ state }: { state: ScreenshotAnnotationCase }) {
  const { screenshot, appNotes, setAppNotes, released } = useScreenshotScene(
    state,
    webScreenshotFile,
  )
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  return (
    <div style={{ width: 560, maxWidth: '100%' }}>
      <ChatInput
        value={text}
        onChange={setText}
        appNotes={appNotes}
        onChangeAppNotes={setAppNotes}
        screenshot={screenshot}
        onSend={(_, __, meta) => setSent(JSON.stringify(meta?.appNotes ?? []))}
        clearOnSend
        leftHints={null}
        rightHints={null}
      />
      {released.length ? (
        <p className="p-2 text-xs text-(--text-secondary)" aria-label="Released captures">
          Released: {released.join(', ')}
        </p>
      ) : null}
      {sent ? (
        <pre
          className="whitespace-pre-wrap break-all p-2 text-xs"
          aria-label="Sent structured context"
        >
          {sent}
        </pre>
      ) : null}
    </div>
  )
}

export const SCREENSHOT_ANNOTATION_SCENES: Scene[] = [
  {
    id: 'screenshot-annotation',
    title: 'Capture the app, crop and comment',
    component: 'ChatInput / ScreenshotAnnotationPanel',
    group: 'Chat',
    description:
      'The host supplies a capture adapter; the shared draft holds the frozen image for the launching chat. Nothing is sent until the person sends the message.',
    states: SCREENSHOT_CASES.map(({ id, title }) => ({
      id,
      title,
      render: () => <Demo state={id} />,
    })),
  },
]
