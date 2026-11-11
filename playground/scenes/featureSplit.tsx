import { useState, type ReactNode } from 'react'
import type { FeatureSplitPointLook } from 'thefactory-ui/headless'
import { SegmentedControl } from 'thefactory-ui/web'
// Not on the package's public surface: the pipeline draws its stop and its composers itself. The
// showcase reaches into the source for them, as the playground renders the library from source.
import FeatureSplitComposer from '../../src/web/compound/process/FeatureSplitComposer'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import type { Scene } from '../showcase/types'
import { SPLIT_FEATURE_RUN, SPLIT_POINT_LOOKS, SPLIT_STATES } from './featureSplitFixtures'

const noop = () => {}
const resolved = async () => {}

const frame = (node: ReactNode) => <div className="max-w-[640px] p-4">{node}</div>

const editor = (state: string, pointLook: FeatureSplitPointLook = 'switch') => {
  const { offer, draft } = SPLIT_STATES[state]!
  return frame(
    <FeatureSplitComposer
      key={`${state}-${pointLook}`}
      offer={offer}
      initial={draft}
      pointLook={pointLook}
      onSend={noop}
      onCancel={noop}
    />,
  )
}

/** The two looks for picking points, switched on the board on the real editor. */
function PointLookAlternatives() {
  const [look, setLook] = useState<FeatureSplitPointLook>('switch')
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3 p-4">
      <SegmentedControl
        ariaLabel="How points are picked"
        value={look}
        onChange={(value) => setLook(value as FeatureSplitPointLook)}
        options={SPLIT_POINT_LOOKS.map((l) => ({ value: l.id, label: l.label }))}
      />
      <FeatureSplitComposer
        key={look}
        offer={SPLIT_STATES.picked!.offer}
        initial={SPLIT_STATES.picked!.draft}
        pointLook={look}
        onSend={noop}
        onCancel={noop}
      />
    </div>
  )
}

export const FEATURE_SPLIT_SCENES: Scene[] = [
  {
    id: 'feature-split-stop',
    title: 'Move to a follow-up',
    component: 'ParkBlock (ProcessPipeline) · FeatureSplitComposer',
    group: 'Process',
    description:
      'Offered at a feature run’s proving stop — where changing the proof is offered, or a Verify that could not judge it — before the sign-off. The person picks acceptance points that can wait: they become a new follow-up feature on the story, linked back to the run; the feature keeps the rest, the proof can change in the same answer, and the step is judged again against what is left. Covision run 59d1109e. The run’s manager may recommend it, never give it.',
    states: [
      {
        id: 'verify-stop',
        title: 'Verify stop offers it',
        description: 'The stop’s answers, “Move to a follow-up” among them, before “Stop here”.',
        render: () =>
          frame(
            <ParkBlock
              run={SPLIT_FEATURE_RUN}
              managerLine={undefined}
              onChoose={noop}
              onChangeProof={noop}
              onSplitFollowUp={noop}
              onAnswerRequest={noop}
              onDelegate={resolved}
              onDrill={noop}
            />,
          ),
      },
      {
        id: 'start',
        title: 'Picking points',
        description: 'Nothing picked yet: it asks for a point first.',
        render: () => editor('start'),
      },
      {
        id: 'picked',
        title: 'Edge cases picked, follow-up named',
        description: 'Four of six points move; two stay. Ready to send.',
        render: () => editor('picked'),
      },
      {
        id: 'proof',
        title: 'Changing the proof too',
        description:
          'The proof editor opens under the switch, with the same rules as “Change what proves it”: the video stays on a change that shows on screen.',
        render: () => editor('proof'),
      },
      {
        id: 'every-point',
        title: 'Every point picked',
        description: 'Refused before sending: at least one point stays on the feature.',
        render: () => editor('every-point'),
      },
      {
        id: 'unchecked',
        title: 'Unchecked Verify, no proof change',
        description: 'A Verify that could not judge it offers the points alone.',
        render: () => editor('unchecked'),
      },
      {
        id: 'alternatives',
        title: 'Alternatives',
        description: 'Switches · Moves / stays rows, switched here on the real editor.',
        render: () => <PointLookAlternatives />,
      },
    ],
  },
]
