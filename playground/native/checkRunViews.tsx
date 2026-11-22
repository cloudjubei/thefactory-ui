import { ScrollView, View } from 'react-native'
import CliRunArtifactPanel from '../../src/native/compound/chat/CliRunArtifactPanel'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  CHECK_RUN_RUN,
  checkRunCase,
  checkRunRoutes,
  checkRunSteps,
  type CheckRunCase,
} from '../scenes/checkRunFixtures'
import { Acted, OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

/** The real sign-off panel on a phone, on a run's fixtures, Run pressed where the case says. */
function Panel({ which }: { which: CheckRunCase }) {
  const { theme } = useNativeTheme()
  return (
    <OnFixtures routes={checkRunRoutes(which)}>
      <Acted steps={checkRunSteps(which)}>
        <ScrollView style={{ backgroundColor: theme.surface.base }}>
          <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>
            <CliRunArtifactPanel runId={CHECK_RUN_RUN.id} projectId={CHECK_RUN_RUN.projectId} />
          </View>
        </ScrollView>
      </Acted>
    </OnFixtures>
  )
}

export const CHECK_RUN_VIEWS: readonly NativeView[] = [
  {
    id: 'review-check-run',
    title: 'Review — run one check (?state=idle|running|merged, ?theme=dark)',
    render: (address) => <Panel which={checkRunCase(address.get('state'))} />,
  },
]
