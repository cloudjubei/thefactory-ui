import { useState } from 'react'
import { AppFeatureRequestDialog } from 'thefactory-ui/web'
import type { AppFeatureRequestAsk } from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const noop = () => {}

const FROM_REFERENCE: AppFeatureRequestAsk = {
  id: 1,
  draft: {
    targetProjectId: 'thefactory-knowledge',
    title: 'Knowledge explorer subagent',
    summary:
      'A small, read-only explorer the chat delegates code search to, returning only map-backed path:line citations.',
    description:
      'FastContext shows a separate explorer keeps the solver’s context clean (up to ~60% fewer tokens). Today the knowledge read tools go to the same chat model.',
    doneWhen: [
      'A chat can hand a code question to the explorer and gets citations back, not file contents.',
      'The tool-use battery scores file-recovery accuracy.',
    ],
    references: ['@thefactory-references:refs/fastcontext.md'],
  },
  busy: false,
  error: null,
  waiting: 0,
}

const SENDING: AppFeatureRequestAsk = { ...FROM_REFERENCE, busy: true }

const FAILED: AppFeatureRequestAsk = {
  ...FROM_REFERENCE,
  error: 'Project thefactory-knowledge is not accepting requests from this project.',
}

const MINIMAL: AppFeatureRequestAsk = {
  ...FROM_REFERENCE,
  draft: {
    targetProjectId: 'thefactory-tools',
    title: 'Diff coverage gate',
    summary: '',
    description: '',
    doneWhen: [],
    references: [],
  },
}

function FeatureRequestDemo({
  initial,
  target,
}: {
  initial: AppFeatureRequestAsk
  target: string
}) {
  const [ask, setAsk] = useState(initial)
  return (
    <AppFeatureRequestDialog
      ask={ask}
      targetName={target}
      onEdit={(draft) => setAsk((a) => ({ ...a, draft }))}
      onSend={noop}
      onCancel={noop}
    />
  )
}

export const APP_FEATURE_REQUEST_SCENES: Scene[] = [
  {
    id: 'app-feature-request',
    title: 'Send a feature request an app asks for',
    component: 'AppFeatureRequestDialog',
    group: 'Process',
    description:
      'An embedded app’s `overseer:feature.request`, confirmed over the App view before it is sent to another project: where it goes, then title, summary, description and done-when lines, editable until Send. The references the app attached are listed, not editable. Cancel or X declines. It waits as long as the person takes.',
    states: [
      {
        id: 'from-reference',
        title: 'From a reference',
        description: 'Everything filled in, with the reference file it came from.',
        overlay: true,
        render: () => <FeatureRequestDemo initial={FROM_REFERENCE} target="thefactory-knowledge" />,
      },
      {
        id: 'minimal',
        title: 'Only a title',
        description: 'The app named the project and a title; the person adds the rest.',
        overlay: true,
        render: () => <FeatureRequestDemo initial={MINIMAL} target="thefactory-tools" />,
      },
      {
        id: 'sending',
        title: 'Sending',
        description: 'Paired with From a reference: Send is in progress, fields are locked.',
        overlay: true,
        render: () => <FeatureRequestDemo initial={SENDING} target="thefactory-knowledge" />,
      },
      {
        id: 'send-failed',
        title: 'Send failed',
        description: 'Paired with From a reference: the reason shows, Send tries again.',
        overlay: true,
        render: () => <FeatureRequestDemo initial={FAILED} target="thefactory-knowledge" />,
      },
    ],
  },
]
