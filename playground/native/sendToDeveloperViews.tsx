import { useState } from 'react'
import { View } from 'react-native'
import type { ProcessResumeChoice, ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  choiceTakesNote,
  isResumeParkChoice,
  parkNoteCopy,
  parkNoteRequired,
  processParkAnswersView,
} from 'thefactory-ui/headless'
import ParkAnswers from '../../src/native/compound/process/ParkAnswers'
import ParkNoteComposer from '../../src/native/compound/process/ParkNoteComposer'
import {
  SEND_TO_DEVELOPER_SPENT_RUN,
  sendToDeveloperRun,
} from '../scenes/sendToDeveloperUncheckedFixtures'
import type { NativeView } from './views'

/** The stop's answers on mobile, as the park card draws them; choosing one that takes a note opens it. */
function UncheckedStop({ run, noteOpen }: { run: ProcessRun; noteOpen: boolean }) {
  const offered = processRunParkChoices(run).filter(isResumeParkChoice)
  const [selected, setSelected] = useState<string>()
  const [noteFor, setNoteFor] = useState<ProcessResumeChoice | undefined>(
    noteOpen ? 'send-to-developer' : undefined,
  )
  const offer = offered.find((c) => c.choice === noteFor)
  return (
    <View style={{ padding: 16, width: 390, maxWidth: '100%' }}>
      {noteFor ? (
        <ParkNoteComposer
          copy={parkNoteCopy(noteFor, offer)}
          required={parkNoteRequired(noteFor, offer)}
          onSend={() => setNoteFor(undefined)}
          onCancel={() => setNoteFor(undefined)}
        />
      ) : (
        <ParkAnswers
          view={processParkAnswersView(offered, undefined, selected)}
          onSelect={setSelected}
          onSend={(answer, note) => {
            if (!note && choiceTakesNote(answer.choice)) {
              setNoteFor(answer.choice as ProcessResumeChoice)
            }
          }}
        />
      )}
    </View>
  )
}

/** Verify could not check: sending the work to the developer, at `?view=send-to-developer-unchecked&state=…`. */
export const SEND_TO_DEVELOPER_VIEWS: readonly NativeView[] = [
  {
    id: 'send-to-developer-unchecked',
    title: 'Send to the developer when Verify could not check',
    render: (address) => {
      const state = address.get('state')
      if (state === 'loop-spent') {
        return <UncheckedStop run={SEND_TO_DEVELOPER_SPENT_RUN} noteOpen={false} />
      }
      return <UncheckedStop run={sendToDeveloperRun()} noteOpen={state === 'note-required'} />
    },
  },
]
