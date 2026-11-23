import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { FilesProvider, useProjects } from 'thefactory-ui/headless'
import ApprovalPanel from '../../src/native/compound/chat/ApprovalPanel'
import GroupStoryRunDialog from '../../src/native/compound/groupStories/GroupStoryRunDialog'
import StoryReadinessBadge from '../../src/native/compound/stories/StoryReadinessBadge'
import QueuePanel from '../../src/native/compound/supervisor/QueuePanel'
import SupervisorPanel from '../../src/native/compound/supervisor/SupervisorPanel'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import { fakeDataGroupPreview } from '../scenes/fakeDataInProductFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import {
  QUEUE_CANDIDATES,
  planFirstCase,
  planFirstGrant,
  planFirstLaunchRoutes,
  planFirstSentLine,
  queueCase,
  readinessCase,
  readinessFixture,
  supervisorCase,
  useBoardSupervisor,
  useBoardWorkQueue,
  type PlanFirstCase,
  type QueueCase,
  type SupervisorCase,
} from '../scenes/supervisorQueueFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView style={{ backgroundColor: theme.surface.base }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12 }}>{children}</View>
    </ScrollView>
  )
}

function Queue({ which }: { which: QueueCase }) {
  const queue = useBoardWorkQueue(which)
  return (
    <Phone>
      <QueuePanel queue={queue} candidates={QUEUE_CANDIDATES} onOpen={noop} />
    </Phone>
  )
}

function Supervisor({ which }: { which: SupervisorCase }) {
  const supervisor = useBoardSupervisor(which)
  return (
    <Phone>
      <SupervisorPanel supervisor={supervisor} onOpenRun={noop} onOpenChat={noop} onAnswer={noop} />
    </Phone>
  )
}

function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

function LaunchCard({ which }: { which: PlanFirstCase }) {
  const { theme } = useNativeTheme()
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures routes={planFirstLaunchRoutes(which)}>
      <FilesProvider>
        <InProject>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ width: 390, maxWidth: '100%' }}>
              <ApprovalPanel
                grant={planFirstGrant(which, (metadata) => setSent(planFirstSentLine(metadata)))}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
              />
              {sent !== undefined ? (
                <Text
                  testID="sent"
                  style={{ fontSize: 11, paddingHorizontal: 12, color: theme.text.muted }}
                >
                  {sent}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </InProject>
      </FilesProvider>
    </OnFixtures>
  )
}

export const SUPERVISOR_QUEUE_VIEWS: readonly NativeView[] = [
  {
    id: 'work-queue-panel',
    title: 'Queue panel (?state=empty|mixed|cap-reached, ?theme=dark)',
    render: (address) => {
      const which = queueCase(address.get('state'))
      return <Queue key={which} which={which} />
    },
  },
  {
    id: 'supervisor-panel',
    title: 'Supervisor panel (?state=on|off|quiet, ?theme=dark)',
    render: (address) => {
      const which = supervisorCase(address.get('state'))
      return <Supervisor key={which} which={which} />
    },
  },
  {
    id: 'story-readiness-badge',
    title: 'Story readiness badge (?state=ready|problems, ?theme=dark)',
    render: (address) => (
      <Phone>
        <StoryReadinessBadge
          view={readinessFixture(readinessCase(address.get('state')))}
          onOpenFeature={noop}
        />
      </Phone>
    ),
  },
  {
    id: 'launch-plan-first',
    title: 'Launch: plan first (?state=on|off|not-offered|group-dialog, ?theme=dark)',
    render: (address) =>
      address.get('state') === 'group-dialog' ? (
        <GroupStoryRunDialog
          isOpen
          onClose={noop}
          title="Read receipts"
          preview={fakeDataGroupPreview('none-offered')}
          basePicks={{}}
          onPickBase={noop}
          onStart={async (body) => ({
            groupRunId: 'group-run-1',
            message: planFirstSentLine(body as Record<string, unknown>),
          })}
          onOpenRun={noop}
        />
      ) : (
        <LaunchCard which={planFirstCase(address.get('state'))} />
      ),
  },
]
