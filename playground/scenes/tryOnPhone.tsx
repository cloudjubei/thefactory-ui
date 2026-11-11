import type { ReactNode } from 'react'
import {
  processCleanupHeadline,
  processTryBuildDisplay,
  type UseProcessCleanup,
} from 'thefactory-ui/headless'
import { ProcessTryBuildPanel, RunCarriedOutChanges } from 'thefactory-ui/web'
import { ProcessCleanupBody } from '../../src/web/compound/process/signoff/ProcessCleanupCard'
import { PROCESS_CLEANUP_COPY } from '../../src/headless/utils/processCleanupViewConstants'
import type { Scene, SceneState } from '../showcase/types'
import {
  CARRIED_OUT_RUN,
  DEVICE_CLEANUP,
  TRY_BUILD_API_BASE,
  TRY_BUILD_STATES,
  type TryBuildState,
} from './tryOnPhoneFixtures'

function Column({ children }: { children: ReactNode }) {
  return <div className="max-w-2xl p-4">{children}</div>
}

function TryIt({ state }: { state: TryBuildState }) {
  const display = processTryBuildDisplay(TRY_BUILD_STATES[state], TRY_BUILD_API_BASE)
  if (!display) return null
  return (
    <Column>
      <ProcessTryBuildPanel display={display} />
    </Column>
  )
}

function CarriedOut() {
  return (
    <div className="max-w-2xl pb-4">
      <RunCarriedOutChanges run={CARRIED_OUT_RUN} />
    </div>
  )
}

function DeviceCleanup({ cleanup }: { cleanup: UseProcessCleanup }) {
  return (
    <Column>
      <section className="flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-5 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-[14px] font-semibold text-(--text-primary)">
            {PROCESS_CLEANUP_COPY.title}
          </div>
          <div className="text-[12.5px] text-(--text-secondary)">
            {processCleanupHeadline(cleanup.list!)}
          </div>
        </div>
        <ProcessCleanupBody cleanup={cleanup} />
      </section>
    </Column>
  )
}

const TRY_STATES: Array<{ id: TryBuildState; title: string; description: string }> = [
  {
    id: 'building',
    title: 'Building',
    description: 'The run reached its sign-off and the phone build is on its way.',
  },
  {
    id: 'ready-qr',
    title: 'Ready, with a QR code',
    description: 'Built and reachable from the Wi-Fi: scan it, or download it here.',
  },
  {
    id: 'ready-download',
    title: 'Ready, download only',
    description: 'Built, but the backend is not reachable from a phone: no QR, only the download.',
  },
  {
    id: 'failed',
    title: 'Build failed',
    description: 'The build failed, and says why.',
  },
  {
    id: 'unavailable',
    title: 'Not made',
    description: 'No phone build for this app, with the plain reason.',
  },
]

export const TRY_ON_PHONE_SCENES: Scene[] = [
  {
    id: 'try-on-phone',
    title: 'Try it on your phone',
    component: 'ProcessTryBuildPanel',
    group: 'Process',
    description:
      'On a run’s sign-off, above More about this run: the run’s head built in the app’s everyday variant, to install on your own phone, with what to check and that it talks to the real services.',
    states: TRY_STATES.map(
      ({ id, title, description }): SceneState => ({
        id,
        title,
        description,
        render: () => <TryIt state={id} />,
      }),
    ),
  },
  {
    id: 'run-carried-out',
    title: 'Already carried out',
    component: 'RunCarriedOutChanges',
    group: 'Process',
    description:
      'On a run’s sign-off, beside the changes still waiting: the feature edits the run carried out itself, oldest first.',
    states: [
      {
        id: 'two-edits',
        title: 'Two edits',
        description: 'A feature reworked and a feature added, each by its number.',
        render: () => <CarriedOut />,
      },
    ],
  },
  {
    id: 'cleanup-device',
    title: 'Cleanup with a device',
    component: 'ProcessCleanupBody',
    group: 'Process',
    description:
      'The cleanup list with an emulator the run started: its cleanup stops it, and the outcome says so.',
    states: [
      {
        id: 'before',
        title: 'Before the step',
        description: 'The emulator is ticked to stop once you approve.',
        render: () => <DeviceCleanup cleanup={DEVICE_CLEANUP.before} />,
      },
      {
        id: 'after',
        title: 'After the step',
        description: 'Stopped, and one simulator it could not stop.',
        render: () => <DeviceCleanup cleanup={DEVICE_CLEANUP.after} />,
      },
    ],
  },
]
