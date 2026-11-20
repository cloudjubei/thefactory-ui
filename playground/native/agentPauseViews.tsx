import { useEffect, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { FilesProvider, useApi } from 'thefactory-ui/headless'
import ProcessPipeline from '../../src/native/compound/process/ProcessPipeline'
import {
  BACK_RUN,
  PAUSED_RUN_ID,
  agentPauseRoutes,
  type AgentPauseCase,
} from '../scenes/agentPauseFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import type { NativeView } from './views'

type ListenedSocket = { onMessage: (message: { data: string }) => void }

/** The server's push once the run's screen has read it: the agent came back by itself. */
function BackLater({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  useEffect(() => {
    const timer = window.setTimeout(() => {
      ;(ws as unknown as ListenedSocket).onMessage({
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

/** Presses one button of the screen by its words once it has drawn, as a person would. */
function Press({ label, children }: { label: string | undefined; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!host || !label) return undefined
    const timer = window.setInterval(() => {
      const found = [...host.querySelectorAll('[role="button"],button')].find(
        (el) => el.textContent === label,
      )
      if (found) {
        ;(found as HTMLElement).click()
        window.clearInterval(timer)
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [host, label])
  return (
    <View ref={(node) => setHost(node as unknown as HTMLElement | null)} style={{ flex: 1 }}>
      {children}
    </View>
  )
}

const PRESSES: Partial<Record<AgentPauseCase, string>> = {
  resuming: 'Resume',
  'stop-confirm': 'Stop run',
}

const CASES: readonly AgentPauseCase[] = [
  'can-resume',
  'cannot-resume',
  'resuming',
  'cleared',
  'stop-confirm',
]

function Run({ which }: { which: AgentPauseCase }) {
  const page = (
    <Press label={PRESSES[which]}>
      <ProcessPipeline runId={PAUSED_RUN_ID} />
    </Press>
  )
  return (
    <OnFixtures routes={agentPauseRoutes(which)}>
      <FilesProvider>
        <View style={{ flex: 1, width: 390, maxWidth: '100%' }}>
          {which === 'cleared' ? <BackLater>{page}</BackLater> : page}
        </View>
      </FilesProvider>
    </OnFixtures>
  )
}

export const AGENT_PAUSE_VIEWS: readonly NativeView[] = [
  {
    id: 'agent-pause',
    title:
      'A paused agent on its step (?state=can-resume|cannot-resume|resuming|cleared|stop-confirm, ?theme=dark)',
    render: (address) => {
      const asked = address.get('state') as AgentPauseCase | null
      return <Run which={asked && CASES.includes(asked) ? asked : 'can-resume'} />
    },
  },
]
