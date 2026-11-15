import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunParkChoices } from 'thefactory-tools/utils'
import {
  isResumeParkChoice,
  partialProofOfChoices,
  partialProofView,
  preExistingBreakOfChoices,
  preExistingBreakView,
  processParkAnswersView,
  processTryBuildDisplay,
  signoffCarriedView,
  verifyProofView,
} from 'thefactory-ui/headless'
import ParkAnswers from '../../src/native/compound/process/ParkAnswers'
import PartialProofLists from '../../src/native/compound/process/PartialProofLists'
import PreExistingBreakNotice from '../../src/native/compound/process/PreExistingBreakNotice'
import ProofScreens from '../../src/native/compound/process/ProofScreens'
import SignoffCarriedCard from '../../src/native/compound/process/signoff/SignoffCarriedCard'
import { ProcessTryBuildPanel } from '../../src/native/compound/process/signoff/ProcessTryBuildCard'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  CARRIED_SIGNOFF_RUN,
  CARRIED_TRY_BUILD,
  CHECKS_BREAK_RUN,
  DEVELOPER_BREAK_RUN,
  PARTIAL_PROOF,
  PARTIAL_PROOF_RUN,
  PARTIAL_PROOF_TILES,
  POINTS_ONLY_SIGNOFF_RUN,
} from '../scenes/readyAnswersFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

/** A stop on mobile as the park card draws it: its title, what it is about, then its answers. */
function Stop({ run }: { run: ProcessRun }) {
  const { theme } = useNativeTheme()
  const [selected, setSelected] = useState<string>()
  const choices = processRunParkChoices(run).filter(isResumeParkChoice)
  const partial = partialProofOfChoices(choices)
  const partialList = partial ? partialProofView(partial) : undefined
  const broken = preExistingBreakOfChoices(choices)
  const brokenView = broken ? preExistingBreakView(broken) : undefined
  return (
    <Phone>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {brokenView?.headline ?? run.park?.message}
      </Text>
      {brokenView ? <PreExistingBreakNotice view={brokenView} heading={false} /> : null}
      {partialList ? <PartialProofLists view={partialList} /> : null}
      <ParkAnswers
        view={processParkAnswersView(choices, undefined, selected)}
        onSelect={setSelected}
        onSend={noop}
      />
    </Phone>
  )
}

function VerifyRow() {
  const view = verifyProofView(PARTIAL_PROOF, PARTIAL_PROOF_TILES, { standing: 'unchecked' })
  return (
    <Phone>
      <ProofScreens view={view} onOpen={noop} onRequestImage={noop} />
    </Phone>
  )
}

function Carried({ run, phone }: { run: ProcessRun; phone: boolean }) {
  const carried = signoffCarriedView([run])
  const display = phone ? processTryBuildDisplay(CARRIED_TRY_BUILD, null) : undefined
  return (
    <Phone>
      {display ? <ProcessTryBuildPanel display={display} onDownload={noop} /> : null}
      {carried ? <SignoffCarriedCard view={carried} /> : null}
    </Phone>
  )
}

/** The ready answers on mobile, at `?view=<id>&state=…`, the same states as the web scenes. */
export const READY_ANSWER_VIEWS: readonly NativeView[] = [
  {
    id: 'partial-proof-stop',
    title: 'Verify showed part of it',
    render: (address) =>
      address.get('state') === 'verify-row' ? <VerifyRow /> : <Stop run={PARTIAL_PROOF_RUN} />,
  },
  {
    id: 'pre-existing-break-stop',
    title: 'Already broken before this change',
    render: (address) => (
      <Stop run={address.get('state') === 'developer' ? DEVELOPER_BREAK_RUN : CHECKS_BREAK_RUN} />
    ),
  },
  {
    id: 'signoff-carried',
    title: 'Sign-off: try these, left out',
    render: (address) => {
      const state = address.get('state')
      if (state === 'points-only') return <Carried run={POINTS_ONLY_SIGNOFF_RUN} phone={false} />
      return <Carried run={CARRIED_SIGNOFF_RUN} phone={state !== 'no-phone-build'} />
    },
  },
]
