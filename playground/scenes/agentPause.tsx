import { useEffect, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FilesProvider, useApi } from 'thefactory-ui/headless'
import ProcessPipeline from '../../src/web/compound/process/ProcessPipeline'
import type { Scene, SceneState } from '../showcase/types'
import {
  BACK_RUN,
  PAUSED_RUN_ID,
  agentPauseRoutes,
  type AgentPauseCase,
} from './agentPauseFixtures'
import { Click } from './clickOnce'
import { OnFixtures } from './onFixtures'

type ListenedSocket = { onMessage: (message: { data: string }) => void }

/** The server's push once the run's page has read it: the agent came back by itself. */
function BackLater({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const socket = ws as unknown as ListenedSocket
      socket.onMessage({
        data: JSON.stringify({
          event: 'process:run-update',
          data: { runId: PAUSED_RUN_ID, run: BACK_RUN },
        }),
      })
    }, 600)
    return () => window.clearTimeout(timer)
  }, [ws])
  return children
}

const CLICKS: Partial<Record<AgentPauseCase, string>> = {
  resuming: 'Resume',
  'stop-confirm': 'Stop run',
}

function Run({ which, phone }: { which: AgentPauseCase; phone: boolean }) {
  const page = (
    <Click label={CLICKS[which]}>
      <ProcessPipeline runId={PAUSED_RUN_ID} narrow={phone} />
    </Click>
  )
  return (
    <OnFixtures routes={agentPauseRoutes(which)}>
      <FilesProvider>
        <MemoryRouter>
          <div
            className={`${phone ? 'h-[860px] w-[390px]' : 'h-[760px] w-full max-w-[1180px]'} overflow-auto`}
          >
            {which === 'cleared' ? <BackLater>{page}</BackLater> : page}
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

const CASES: { id: AgentPauseCase; title: string }[] = [
  { id: 'can-resume', title: 'Paused, its session kept: Resume, Retry step, Stop run' },
  { id: 'cannot-resume', title: 'Paused, its session lost: Retry step, Stop run' },
  { id: 'resuming', title: 'Resume pressed: running again at once' },
  { id: 'cleared', title: 'The agent came back by itself' },
  { id: 'stop-confirm', title: 'Stop run asked again in place' },
]

const states: SceneState[] = CASES.flatMap((one) => [
  { id: one.id, title: one.title, render: () => <Run which={one.id} phone={false} /> },
  {
    id: `${one.id}-phone`,
    title: `${one.title}, phone`,
    render: () => <Run which={one.id} phone />,
  },
])

export const AGENT_PAUSE_SCENES: Scene[] = [
  {
    id: 'agent-pause',
    title: 'A paused agent on its step',
    component: 'ProcessPipeline (AgentPausePanel)',
    group: 'Process',
    wide: true,
    description:
      'When a step’s agent pauses — the computer slept, its CLI stopped, or the host lost it — the step itself says so: the pause mark, “Paused · <cause>”, and under it why, with Resume (only when its session is kept), Retry step and Stop run, Stop asked again in place. The run’s pill reads Needs you and the strip marks the step paused. Resume or Retry shows the step running again at once and sends behind; a refusal puts the pause back with its reason. When the agent comes back by itself the step says so for a moment, then reads running.',
    states,
  },
]
