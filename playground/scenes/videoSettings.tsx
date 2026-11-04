import { useEffect, useRef, type ReactNode } from 'react'
import { VIDEO_TOOL_FIXES } from 'thefactory-tools/constants'
import type { VideoToolCheck, VideoToolsReadiness } from 'thefactory-tools/types'
import { NO_VIDEO_SETUP_JOBS, videoSetupView, type VideoSetupJobs } from 'thefactory-ui/headless'
import { VideoSettingsPanel } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}

const OK: VideoToolCheck[] = [
  { id: 'ffmpeg', present: true },
  { id: 'ffprobe', present: true },
  { id: 'whisper', present: true },
  { id: 'models', present: true },
]

const NO_FFMPEG: VideoToolCheck = { id: 'ffmpeg', present: false, fix: VIDEO_TOOL_FIXES.ffmpeg }
const NO_FFPROBE: VideoToolCheck = { id: 'ffprobe', present: false, fix: VIDEO_TOOL_FIXES.ffprobe }
const NO_WHISPER: VideoToolCheck = { id: 'whisper', present: false, fix: VIDEO_TOOL_FIXES.whisper }
const NO_MODELS: VideoToolCheck = { id: 'models', present: false, fix: VIDEO_TOOL_FIXES.models }

function machine(...missing: VideoToolCheck[]): VideoToolsReadiness {
  const checks = OK.map((check) => missing.find((m) => m.id === check.id) ?? check)
  const has = (id: string) => !!checks.find((c) => c.id === id)?.present
  const canDigest = has('ffmpeg') && has('ffprobe')
  return { canDigest, canTranscribe: canDigest && has('whisper') && has('models'), checks }
}

const INSTALL_OUTPUT = [
  '==> Fetching dependencies for whisper-cpp: ggml',
  '==> Fetching ggml',
  '==> Downloading https://ghcr.io/v2/homebrew/core/ggml/manifests/0.9.4',
  '######################################################################## 100.0%',
  '==> Pouring whisper-cpp--1.8.2.arm64_sonoma.bottle.tar.gz',
].join('\n')

function Panel({
  state,
  jobs = NO_VIDEO_SETUP_JOBS,
  width = 720,
  agentError,
  agentStarting,
}: {
  state: VideoToolsReadiness
  jobs?: VideoSetupJobs
  width?: number
  agentError?: string
  agentStarting?: boolean
}): ReactNode {
  return (
    <div
      className="max-w-full rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-4"
      style={{ width }}
    >
      <VideoSettingsPanel
        view={videoSetupView(state, jobs)}
        checking={false}
        {...(agentError ? { agentError } : {})}
        {...(agentStarting ? { agentStarting } : {})}
        onRecheck={noop}
        onInstall={noop}
        onDownloadModels={noop}
        onStop={noop}
        onAskAgent={noop}
      />
    </div>
  )
}

/** The panel once the person has pressed Stop, as the confirm is the row's own. */
function AskingStop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label^="Stop "]')?.click()
  }, [])
  return <div ref={ref}>{children}</div>
}

const STILLS_ONLY = machine(NO_WHISPER, NO_MODELS)

const INSTALLING: VideoSetupJobs = {
  install: { whisper: { running: true, output: INSTALL_OUTPUT } },
}

const DOWNLOADING: VideoSetupJobs = {
  install: {},
  models: { running: true, receivedBytes: 310_000_000, totalBytes: 574_926_293 },
}

export const VIDEO_SETTINGS_SCENES: Scene[] = [
  {
    id: 'video-settings',
    title: 'Settings › Video',
    component: 'VideoSettings',
    group: 'Settings',
    description:
      'Decisions 8B and 9A: its own section, grouped by what each piece gives. No command is left for the person to type: each missing piece has a button that runs on the machine running Overseer, and an agent can go through the whole setup, on any client.',
    states: [
      {
        id: 'nothing-set-up',
        title: 'Nothing set up',
        description: 'One Install for ffmpeg and ffprobe, as ffprobe comes with it.',
        render: () => <Panel state={machine(NO_FFMPEG, NO_FFPROBE, NO_WHISPER, NO_MODELS)} />,
      },
      {
        id: 'stills-only',
        title: 'Stills only',
        description: 'Videos work; agents see them but do not hear them.',
        render: () => <Panel state={STILLS_ONLY} />,
      },
      {
        id: 'models-missing',
        title: 'Models missing',
        render: () => <Panel state={machine(NO_MODELS)} />,
      },
      {
        id: 'installing',
        title: 'Installing',
        description: 'The install’s output, live, on the row whose button began it, with its Stop.',
        render: () => <Panel state={STILLS_ONLY} jobs={INSTALLING} />,
      },
      {
        id: 'install-stop-ask',
        title: 'Stop install?',
        description:
          'Stop asks in place, as the upload strip does; nothing ends until the second Stop.',
        render: () => (
          <AskingStop>
            <Panel state={STILLS_ONLY} jobs={INSTALLING} />
          </AskingStop>
        ),
      },
      {
        id: 'install-stopping',
        title: 'Stopping install',
        description: 'Asked to stop, and not yet ended: no second Stop, the output still comes.',
        render: () => (
          <Panel
            state={STILLS_ONLY}
            jobs={{ install: { whisper: { ...INSTALLING.install.whisper!, stopping: true } } }}
          />
        ),
      },
      {
        id: 'install-stopped',
        title: 'Install stopped',
        description:
          'Stopped is not failed: no error and no Try again, just the Install it began from.',
        render: () => (
          <Panel
            state={STILLS_ONLY}
            jobs={{
              install: { whisper: { running: false, output: INSTALL_OUTPUT, stopped: true } },
            }}
          />
        ),
      },
      {
        id: 'stop-failed',
        title: 'Stop could not be sent',
        description: 'The install is still running, so Stop stays on offer, with why.',
        render: () => (
          <Panel
            state={STILLS_ONLY}
            jobs={{
              install: {
                whisper: {
                  running: true,
                  output: INSTALL_OUTPUT,
                  stopping: false,
                  error: 'That could not be stopped.',
                },
              },
            }}
          />
        ),
      },
      {
        id: 'install-failed',
        title: 'Install failed',
        description: 'Why, the output, and another go. The agent stays on offer.',
        render: () => (
          <Panel
            state={STILLS_ONLY}
            jobs={{
              install: {
                whisper: {
                  running: false,
                  output: '==> Fetching whisper-cpp\nError: no bottle available',
                  error: 'Installing whisper failed (exit 1).',
                },
              },
            }}
          />
        ),
      },
      {
        id: 'no-homebrew',
        title: 'No Homebrew',
        description: 'The machine cannot install on its own: the agent is the way forward.',
        render: () => (
          <Panel
            state={machine(NO_FFMPEG, NO_FFPROBE, NO_WHISPER, NO_MODELS)}
            jobs={{
              install: {
                ffmpeg: {
                  running: false,
                  output: '',
                  error:
                    'Installing needs Homebrew, which this machine does not have. Install it from brew.sh, or install this tool another way.',
                },
              },
            }}
          />
        ),
      },
      {
        id: 'downloading',
        title: 'Downloading models',
        description: 'Progress; it goes on if the person leaves, and Stop ends it.',
        render: () => <Panel state={machine(NO_MODELS)} jobs={DOWNLOADING} />,
      },
      {
        id: 'download-stop-ask',
        title: 'Stop download?',
        render: () => (
          <AskingStop>
            <Panel state={machine(NO_MODELS)} jobs={DOWNLOADING} />
          </AskingStop>
        ),
      },
      {
        id: 'download-stopping',
        title: 'Stopping download',
        render: () => (
          <Panel
            state={machine(NO_MODELS)}
            jobs={{ install: {}, models: { ...DOWNLOADING.models!, stopping: true } }}
          />
        ),
      },
      {
        id: 'download-stopped',
        title: 'Download stopped',
        description: 'Nothing partial is kept, so it is the same offer as before it began.',
        render: () => (
          <Panel
            state={machine(NO_MODELS)}
            jobs={{ install: {}, models: { running: false, stopped: true } }}
          />
        ),
      },
      {
        id: 'download-failed',
        title: 'Download failed',
        render: () => (
          <Panel
            state={machine(NO_MODELS)}
            jobs={{
              install: {},
              models: {
                running: false,
                error: 'ggml-large-v3-turbo-q5_0.bin could not be downloaded (503).',
              },
            }}
          />
        ),
      },
      {
        id: 'old-whisper',
        title: 'Old whisper.cpp',
        description: 'An install would leave it as it is, so the way forward is the agent.',
        render: () => (
          <Panel
            state={machine({
              id: 'whisper',
              present: false,
              fix: VIDEO_TOOL_FIXES.whisperOld,
            })}
          />
        ),
      },
      {
        id: 'ffmpeg-no-text',
        title: 'ffmpeg cannot draw text',
        render: () => (
          <Panel
            state={machine({ id: 'ffmpeg', present: false, fix: VIDEO_TOOL_FIXES.ffmpegText })}
          />
        ),
      },
      {
        id: 'agent-starting',
        title: 'Agent starting',
        render: () => <Panel state={STILLS_ONLY} agentStarting />,
      },
      {
        id: 'agent-failed',
        title: 'Agent could not start',
        render: () => <Panel state={STILLS_ONLY} agentError="The agent could not be started." />,
      },
      {
        id: 'ready',
        title: 'Ready',
        description: 'Nothing to do, so nothing on offer.',
        render: () => <Panel state={machine()} />,
      },
      {
        id: 'small-screen',
        title: 'Small screen',
        render: () => <Panel state={STILLS_ONLY} width={360} />,
      },
      {
        id: 'small-screen-download-stop-ask',
        title: 'Small screen, Stop download?',
        description: 'Too long for one line, so the question moves under the row’s name.',
        render: () => (
          <AskingStop>
            <Panel state={machine(NO_MODELS)} jobs={DOWNLOADING} width={360} />
          </AskingStop>
        ),
      },
      {
        id: 'small-screen-stop-ask',
        title: 'Small screen, Stop install?',
        render: () => (
          <AskingStop>
            <Panel state={STILLS_ONLY} jobs={INSTALLING} width={360} />
          </AskingStop>
        ),
      },
    ],
  },
]
