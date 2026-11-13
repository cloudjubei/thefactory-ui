import { Text, View } from 'react-native'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import PlanWindowChip from '../../src/native/compound/chips/PlanWindowChip'
import { RunModelChip } from '../../src/native/compound/chat/signoff'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { processRunModelChipView } from 'thefactory-ui/headless'
import { OnFixtures } from '../scenes/onFixtures'
import {
  PLAN_WINDOW_CASES,
  PLAN_WINDOW_SCENE_ID,
  planWindowCase,
  planWindowRun,
  planWindowView,
  type PlanWindowCase,
} from '../scenes/planWindowFixtures'
import type { NativeView } from './views'

/** The real run pipeline on a phone, its model chip with the plan-window chip beside it. */
function RunWithChip({ item }: { item: PlanWindowCase }) {
  const run = planWindowRun(item)
  const model = processRunModelChipView(run).model
  return (
    <OnFixtures routes={{ '/api/v1/process-runs/{runId}': () => run }}>
      <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
        <ProcessPipeline
          runId={run.id}
          renderModelChip={() => (
            <>
              <RunModelChip model={model} />
              <PlanWindowChip view={planWindowView(item)} />
            </>
          )}
        />
      </View>
    </OnFixtures>
  )
}

/** Every case's chip in one list. */
function Board() {
  const { theme } = useNativeTheme()
  return (
    <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 10 }}>
      {PLAN_WINDOW_CASES.map((c) => (
        <View key={c.id} style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{c.label}</Text>
          <PlanWindowChip view={planWindowView(c)} />
        </View>
      ))}
    </View>
  )
}

/**
 * The plan-window chip on a phone: `?state=board` for every case, else the real run pipeline on a
 * case (`?state=codex-free`, `codex-paid`, `claude-allowed`, `claude-near`, `claude-reached`,
 * `cursor`).
 */
export const PLAN_WINDOW_VIEWS: NativeView[] = [
  {
    id: PLAN_WINDOW_SCENE_ID,
    title: 'Plan window chip',
    render: (address) =>
      address.get('state') === 'board' ? (
        <Board />
      ) : (
        <RunWithChip item={planWindowCase(address.get('state'))} />
      ),
  },
]
