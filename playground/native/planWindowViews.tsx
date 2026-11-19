import { Text, View } from 'react-native'
import { CliConfigsProvider } from '../../src/headless/contexts/CliConfigsContext'
import CliConfigForm from '../../src/native/compound/settings/CliConfigForm'
import CliRunArtifactPanel from '../../src/native/compound/chat/CliRunArtifactPanel'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import {
  PERSISTED_PLAN_CASES,
  PERSISTED_PLAN_NOW,
  PLAN_WINDOW_FALLBACK_CASES,
  planSettingsRoutes,
  planWindowFallbackRun,
} from '../scenes/planWindowSettingsFixtures'
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
    id: 'cli-plan-windows',
    title: 'CLI settings plan windows',
    render: (address) => (
      <OnFixtures routes={planSettingsRoutes(address.get('state') === 'rejected')}>
        <CliConfigsProvider>
          <View style={{ width: 390, maxWidth: '100%' }}>
            <CliConfigForm planWindowNow={PERSISTED_PLAN_NOW} />
          </View>
        </CliConfigsProvider>
      </OnFixtures>
    ),
  },
  {
    id: 'cli-run-plan-window',
    title: 'CLI run header plan window',
    render: (address) => {
      const state = address.get('state')
      const fallback = PLAN_WINDOW_FALLBACK_CASES.find((item) => item.id === state)
      if (fallback) {
        const run = planWindowFallbackRun(fallback)
        const clock = { planWindowNow: PERSISTED_PLAN_NOW }
        return (
          <OnFixtures routes={{ '/api/v1/cli-runs/{runId}': () => run }}>
            <View style={{ width: 390, maxWidth: '100%' }}>
              <CliRunArtifactPanel runId={run.id} projectId={run.projectId} {...clock} />
            </View>
          </OnFixtures>
        )
      }
      const item = PERSISTED_PLAN_CASES.find((c) => c.id === state) ?? PERSISTED_PLAN_CASES[0]!
      const { subscription: _subscription, ...base } = FAKE_CLI_RUN
      const run = {
        ...base,
        id: `capture-${item.id}`,
        cli: { tool: item.cli, version: 'fixture' },
        artifacts: [
          {
            id: `capture-${item.id}-changes`,
            kind: 'files-emitted' as const,
            at: base.updatedAt,
            payload: {
              files: [
                {
                  path: 'plan-window-example.txt',
                  status: 'added' as const,
                  contentAfter: 'Captured plan-window example.\n',
                },
              ],
            },
          },
        ],
        ...(item.subscription ? { subscription: item.subscription } : {}),
      }
      return (
        <OnFixtures
          routes={{
            '/api/v1/cli-runs/{runId}': () => run,
            '/api/v1/cli-runs/{runId}/artifacts/{artifactId}/preview': () => ({
              files: [
                {
                  path: 'plan-window-example.txt',
                  status: 'added',
                  patch:
                    'diff --git a/plan-window-example.txt b/plan-window-example.txt\nnew file mode 100644\n--- /dev/null\n+++ b/plan-window-example.txt\n@@ -0,0 +1 @@\n+Captured plan-window example.\n',
                },
              ],
            }),
          }}
        >
          <View style={{ width: 390, maxWidth: '100%' }}>
            <CliRunArtifactPanel
              runId={run.id}
              projectId={run.projectId}
              planWindowNow={PERSISTED_PLAN_NOW}
            />
          </View>
        </OnFixtures>
      )
    },
  },
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
