import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import ScreensTab from '../../src/web/compound/chat/signoff/ScreensTab'
import ComparisonOverlay from '../../src/web/compound/chat/signoff/ComparisonOverlay'
import { OnFixtures } from './onFixtures'
import {
  measuredScreenPairs,
  buildAwareScreenPairs,
  requestScreenPairImage,
  SCREEN_PAIRS_CAPTURED,
  SCREEN_PAIRS_PROJECT,
  SCREEN_PAIR_ROUTES,
} from './screenPairsFixtures'
import FeatureReviewSection from '../../src/web/compound/process/FeatureReviewSection'
import type { Scene } from '../showcase/types'
import { signoffChipRows } from './signoffChipsFixtures'

const noop = () => {}

/**
 * The Screens, Walkthrough and Report chips, from `buildStorySignoff`.
 *
 * Web, no login:
 * - /?scene=signoff-chips&state=replaced-only — those three filings were replaced.
 *   None of the three chips is passed.
 * - &state=one-current — one current of each as well. The lines read
 *   "1 screenshot captured", "1 recording captured", "A report was written".
 *
 * Native: ?view=signoff-chips&state=replaced-only|one-current
 */
function Chips({ current }: { current: boolean }): ReactNode {
  const rows = signoffChipRows(current)
  return (
    <div className="flex max-w-[720px] flex-col gap-3 p-4">
      <FeatureReviewSection
        projectId="p"
        kind="embedded"
        title="One"
        facts={{ costLabel: undefined, durationLabel: undefined }}
        agents={[]}
        rows={rows}
        verification={undefined}
        statusLine={{ tone: 'review', label: 'In review' }}
        pairs={[]}
        recordings={[]}
        reports={[]}
        emptyLabel=""
        onOpenPair={noop}
        onRequestImage={noop}
      />
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[12.5px] text-(--text-secondary)">
        {rows.map((row) => (
          <li key={row.id}>{row.detail}</li>
        ))}
      </ul>
    </div>
  )
}

/** Real strip and key-selected overlay on the same measured refs on both builds. */
function MeasuredScreens({
  initialKey,
  builds = false,
}: {
  initialKey?: string
  builds?: boolean
}) {
  const [openKey, setOpenKey] = useState(initialKey)
  const pairs = builds ? buildAwareScreenPairs() : measuredScreenPairs()
  return (
    <OnFixtures routes={SCREEN_PAIR_ROUTES}>
      <MemoryRouter>
        <div className="w-full p-4">
          <ScreensTab
            pairs={pairs}
            capturedLabel={SCREEN_PAIRS_CAPTURED}
            onOpen={setOpenKey}
            onRequestImage={requestScreenPairImage}
          />
          {openKey !== undefined ? (
            <ComparisonOverlay
              pairs={pairs}
              openKey={openKey}
              onClose={() => setOpenKey(undefined)}
              baseSha={undefined}
              headSha={undefined}
              projectId={SCREEN_PAIRS_PROJECT}
              onRequestImage={requestScreenPairImage}
            />
          ) : null}
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

export const SIGNOFF_CHIP_SCENES: Scene[] = [
  {
    id: 'measured-screen-pairs',
    title: 'Screens with filed pixel comparisons',
    component: 'ScreensTab / ComparisonOverlay',
    group: 'Process',
    wide: true,
    description:
      'Shared fixed refs through groupEvidence and screenPairs. Account is captured before Checkout; Gallery has an unavailable comparison and Legacy has none. Open any tile to check key-based selection after sorting.',
    states: [
      {
        id: 'builds',
        title: 'Build-aware pairing with a rejected base and earlier attempt',
        render: () => <MeasuredScreens builds />,
      },
      {
        id: 'strip',
        title: 'Measured Screens strip',
        render: () => <MeasuredScreens />,
      },
      {
        id: 'account-open',
        title: 'Account selected by key',
        overlay: true,
        render: () => <MeasuredScreens initialKey="Account" />,
      },
      {
        id: 'checkout-open',
        title: 'Checkout selected by key',
        overlay: true,
        render: () => <MeasuredScreens initialKey="Checkout" />,
      },
    ],
  },
  {
    id: 'signoff-chips',
    title: 'Sign-off chips ignore a replaced filing',
    component: 'CheckChipRow (FeatureReviewSection)',
    group: 'Process',
    description:
      'The Screens, Walkthrough and Report chips of a feature sign-off, from buildStorySignoff. A filing a fresh retry replaced does not pass them. One current filing of each does: "1 screenshot captured", "1 recording captured", "A report was written". Each state is its own address; nothing is clicked.',
    states: [
      {
        id: 'replaced-only',
        title: 'Only a replaced filing',
        description:
          'One screenshot, one recording and one report, each superseded by attempt-2. Screens, Walkthrough and Report are not passed.',
        render: () => <Chips current={false} />,
      },
      {
        id: 'one-current',
        title: 'One current filing of each',
        description:
          'The replaced filings, plus one current of each. The lines read "1 screenshot captured", "1 recording captured" and "A report was written".',
        render: () => <Chips current />,
      },
    ],
  },
]
