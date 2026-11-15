import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  isResumeParkChoice,
  processParkAnswersView,
  signoffCarriedView,
} from 'thefactory-ui/headless'
import ParkAnswers from '../../src/native/compound/process/ParkAnswers'
import SignoffCarriedCard from '../../src/native/compound/process/signoff/SignoffCarriedCard'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  REVIEW_GAP_BLOCKED_RUN,
  REVIEW_GAP_CARRIED_RUN,
  REVIEW_GAP_FOLLOW_UPS_RUN,
  reviewGapRun,
} from '../scenes/reviewGapFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

/** The code review's stop on mobile: what it asks, then its answers. */
function Stop({ run }: { run: ProcessRun }) {
  const { theme } = useNativeTheme()
  const [selected, setSelected] = useState<string>()
  const choices = processRunParkChoices(run).filter(isResumeParkChoice)
  const entry = run.ledger.at(-1)
  return (
    <Phone>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {run.park?.message}
      </Text>
      {entry?.summary ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{entry.summary}</Text>
      ) : null}
      <ParkAnswers
        view={processParkAnswersView(choices, undefined, selected)}
        onSelect={setSelected}
        onSend={noop}
      />
    </Phone>
  )
}

function Carried() {
  const carried = signoffCarriedView([REVIEW_GAP_CARRIED_RUN])
  return <Phone>{carried ? <SignoffCarriedCard view={carried} /> : null}</Phone>
}

const STOPS: Record<string, ProcessRun> = {
  'capture-blocked': REVIEW_GAP_BLOCKED_RUN,
  'follow-ups-only': REVIEW_GAP_FOLLOW_UPS_RUN,
}

/** The code review's stop on mobile, at `?view=review-gap-stop&state=…`, the same states as the web scene. */
export const REVIEW_GAP_VIEWS: readonly NativeView[] = [
  {
    id: 'review-gap-stop',
    title: 'Code review asks for changes nothing sends back',
    render: (address) => {
      const state = address.get('state') ?? 'missing-proof'
      if (state === 'carried-to-sign-off') return <Carried />
      return <Stop run={STOPS[state] ?? reviewGapRun()} />
    },
  },
]
