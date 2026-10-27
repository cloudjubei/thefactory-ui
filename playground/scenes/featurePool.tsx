import type { ReactNode } from 'react'
import {
  featureWorkAskView,
  featureWorkLaunchCheck,
  launchFeaturePickRows,
  type LaunchFeatureRow,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the chat dock draws these itself. The showcase reaches
// into the source for them, as the playground renders the library from source.
import LaunchFeatureList from '../../src/web/compound/chat/LaunchFeatureList'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import type { Scene } from '../showcase/types'

const noop = () => {}

const POOL = [
  { id: 'f1', title: 'Turn engine hook' },
  { id: 'f2', title: 'Hot-seat turn handover' },
  { id: 'f3', title: 'Handover cover screen' },
]

const planRow = (featureId: string, title: string, proofLabels: string[]): LaunchFeatureRow => ({
  featureId,
  title,
  chain: [],
  proofLabels,
})

const PLAN: Record<string, LaunchFeatureRow> = {
  f1: planRow('f1', 'Turn engine hook', ['Unit tests', 'Checks']),
  f2: planRow('f2', 'Hot-seat turn handover', ['Unit tests', 'Code review']),
  f3: planRow('f3', 'Handover cover screen', ['Before / after screens']),
}

/** The launch card as the dock draws it: the ask, the features picked, and why it cannot start. */
function LaunchCard({
  picked,
  refusal,
  inChat = false,
}: {
  picked: string[]
  refusal?: string
  inChat?: boolean
}) {
  const view = featureWorkAskView({
    storyTitle: 'Phase 6b — hot-seat play',
    joinsOpenRun: false,
    args: { reason: 'The story is ready; you asked to start the handover first.' },
    ...(inChat ? { mode: 'chat' as const } : {}),
  })
  const check = featureWorkLaunchCheck({
    storyId: 's21',
    proposalLoaded: true,
    ...(refusal !== undefined ? { refusal } : {}),
    openWorkUnchosen: false,
    storyLoaded: true,
    featureCount: POOL.length,
    nonePicked: picked.length === 0,
  })
  const rows = inChat || refusal !== undefined ? [] : picked.map((id) => PLAN[id]!)
  return frame(
    <ToolAskCard
      view={view}
      busy={false}
      ready={check.ready}
      {...(check.problem !== undefined ? { problem: check.problem } : {})}
      onApprove={noop}
      onDeny={noop}
      onLater={noop}
    >
      <LaunchFeatureList
        rows={rows}
        tail={[]}
        save={false}
        onToggleKind={noop}
        onNotesChange={noop}
        onSaveChange={noop}
        pick={{ rows: launchFeaturePickRows(POOL, picked), onToggle: noop }}
      />
    </ToolAskCard>,
  )
}

const frame = (node: ReactNode) => <div className="w-[460px] max-w-full">{node}</div>

export const FEATURE_POOL_SCENES: Scene[] = [
  {
    id: 'launch-feature-pick',
    title: 'Start work: pick the features',
    component: 'LaunchFeatureList, ToolAskCard (startFeatureWork)',
    group: 'Chat',
    description:
      'A story is a pool of features: the launch card lists every open one, ticked in or out, and the run works only those ticked. When the pick cannot start, the card shows the backend’s reason in its words.',
    states: [
      {
        id: 'all-picked',
        title: 'Every feature picked',
        description: 'The default: every open feature of the story is in the run.',
        render: () => <LaunchCard picked={['f1', 'f2', 'f3']} />,
      },
      {
        id: 'subset',
        title: 'Two of three picked',
        description:
          'Paired with Every feature picked: the cover screen is left out — it stays on the story for a later run.',
        render: () => <LaunchCard picked={['f1', 'f2']} />,
      },
      {
        id: 'none-picked',
        title: 'Nothing picked',
        description:
          'Paired with Every feature picked: the card asks for a feature before it starts.',
        render: () => <LaunchCard picked={[]} />,
      },
      {
        id: 'blocker-refused',
        title: 'Blocker left out',
        description:
          'Paired with Two of three picked: the handover needs the turn engine hook, which is left out — the backend refuses the pick and the card shows why.',
        render: () => (
          <LaunchCard
            picked={['f2', 'f3']}
            refusal={
              'Cannot start "Hot-seat turn handover": blocker "Turn engine hook" is not done and is not earlier in this run.'
            }
          />
        ),
      },
      {
        id: 'cycle-refused',
        title: 'Features wait on each other',
        description:
          'Paired with Blocker left out: two picked features block each other, and the backend names the cycle.',
        render: () => (
          <LaunchCard
            picked={['f2', 'f3']}
            refusal="Features depend on each other in a cycle: Hot-seat turn handover, Handover cover screen."
          />
        ),
      },
      {
        id: 'in-chat',
        title: 'Worked in this chat',
        description:
          'Paired with Two of three picked: the same pick when the chat’s agent does the work — no plan, only the features.',
        render: () => <LaunchCard picked={['f1', 'f2']} inChat />,
      },
    ],
  },
]
