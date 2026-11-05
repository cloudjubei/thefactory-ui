import { useEffect, useRef, type ReactNode } from 'react'
import { ProcessesView } from 'thefactory-ui/web'
import { OnFixtures } from './onFixtures'
import type { Scene } from '../showcase/types'

function Library({ children }: { children: ReactNode }) {
  return (
    <OnFixtures>
      <div className="h-[820px] overflow-hidden rounded-lg border border-(--border-subtle)">
        {children}
      </div>
    </OnFixtures>
  )
}

/** Presses the first step's "N tools" line once the steps are drawn, as a person would. */
function ToolsOpened({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = root.current
    if (!element) return
    const press = () => {
      const line = element.querySelector<HTMLButtonElement>('ol button[aria-expanded="false"]')
      if (!line) return
      observer.disconnect()
      line.click()
    }
    const observer = new MutationObserver(press)
    observer.observe(element, { childList: true, subtree: true })
    press()
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}

export const PROCESS_STEP_TOOL_SCENES: Scene[] = [
  {
    id: 'process-step-tools',
    title: 'Step tools and exit',
    component: 'ProcessesView',
    group: 'Process',
    wide: true,
    description:
      'Each step of a process says what ends it and which tools it is handed, read from the SDK’s step-kind metadata. The tools fold under one “N tools” line, as a chat’s steps do; a step that runs no agent says why it has none.',
    states: [
      {
        id: 'closed',
        title: 'Closed',
        description:
          'An agent type that is not a built-in role, a developer, a check, a judge and a gate.',
        render: () => (
          <Library>
            <ProcessesView selectedProcessId="story" />
          </Library>
        ),
      },
      {
        id: 'tools-open',
        title: 'Tools open',
        description: 'The line pressed: the names the role is handed, before a host withholds any.',
        render: () => (
          <Library>
            <ToolsOpened>
              <ProcessesView selectedProcessId="story" />
            </ToolsOpened>
          </Library>
        ),
      },
    ],
  },
]
