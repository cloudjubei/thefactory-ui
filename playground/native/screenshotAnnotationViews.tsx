import { useState } from 'react'
import { Text, View } from 'react-native'
import ChatInput from '../../src/native/compound/chat/ChatInput'
import {
  SCREENSHOT_CASES,
  nativeScreenshotFile,
  useScreenshotScene,
  type ScreenshotAnnotationCase,
} from '../scenes/screenshotAnnotationFixtures'
import type { NativeView } from './views'

function Demo({ state }: { state: ScreenshotAnnotationCase }) {
  const { screenshot, appNotes, setAppNotes, released } = useScreenshotScene(
    state,
    nativeScreenshotFile,
  )
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  return (
    <View style={{ padding: 16, gap: 12, width: 560, maxWidth: '100%' }}>
      <ChatInput
        value={text}
        onChange={setText}
        appNotes={appNotes}
        onChangeAppNotes={setAppNotes}
        screenshot={screenshot}
        onSend={(_, __, meta) => setSent(JSON.stringify(meta?.appNotes ?? []))}
        clearOnSend
      />
      {released.length ? (
        <Text accessibilityLabel="Released captures">Released: {released.join(', ')}</Text>
      ) : null}
      {sent ? <Text accessibilityLabel="Sent structured context">{sent}</Text> : null}
    </View>
  )
}

export const SCREENSHOT_ANNOTATION_VIEWS: NativeView[] = SCREENSHOT_CASES.map(({ id, title }) => ({
  id: `screenshot-annotation-${id}`,
  title: `Screenshot annotation: ${title}`,
  render: () => <Demo state={id} />,
}))
