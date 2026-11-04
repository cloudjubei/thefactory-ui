import { VIDEO_TOOL_FIXES, VIDEO_WHISPER_MODELS } from 'thefactory-tools/constants'
import type {
  VideoInstallableTool,
  VideoToolCheck,
  VideoToolId,
  VideoToolsReadiness,
} from 'thefactory-tools/types'
import {
  VIDEO_SETUP_OUTPUT_MAX_CHARS,
  VIDEO_SETUP_ROW_LABELS,
  VIDEO_SETUP_TEXT,
} from './videoSetupConstants'
import type {
  VideoInstallJob,
  VideoModelsJob,
  VideoSetupGroup,
  VideoSetupJobs,
  VideoSetupProgress,
  VideoSetupRow,
  VideoSetupRunningJob,
  VideoSetupStopTarget,
  VideoSetupView,
} from './videoSetupTypes'

const BYTES_PER_MB = 1_000_000

const MODELS_MB = Math.round(
  VIDEO_WHISPER_MODELS.reduce((sum, model) => sum + model.bytes, 0) / BYTES_PER_MB,
)

export const NO_VIDEO_SETUP_JOBS: VideoSetupJobs = { install: {} }

const keepTail = (text: string): string =>
  text.length > VIDEO_SETUP_OUTPUT_MAX_CHARS ? text.slice(-VIDEO_SETUP_OUTPUT_MAX_CHARS) : text

const stopStateAfter = (
  job: VideoInstallJob | VideoModelsJob | undefined,
  progress: VideoSetupProgress,
): Pick<VideoModelsJob, 'stopping' | 'stopped'> => ({
  ...(job?.stopping && !progress.done ? { stopping: true } : {}),
  ...(progress.stopped ? { stopped: true } : {}),
})

function nextInstall(
  job: VideoInstallJob | undefined,
  progress: VideoSetupProgress,
): VideoInstallJob {
  const output = keepTail(`${job?.output ?? ''}${progress.output ?? ''}`)
  return {
    running: !progress.done,
    output,
    ...stopStateAfter(job, progress),
    ...(progress.error ? { error: progress.error } : {}),
  }
}

function nextModels(job: VideoModelsJob | undefined, progress: VideoSetupProgress): VideoModelsJob {
  const receivedBytes = progress.receivedBytes ?? job?.receivedBytes
  const totalBytes = progress.totalBytes ?? job?.totalBytes
  return {
    running: !progress.done,
    ...stopStateAfter(job, progress),
    ...(receivedBytes !== undefined ? { receivedBytes } : {}),
    ...(totalBytes !== undefined ? { totalBytes } : {}),
    ...(progress.error ? { error: progress.error } : {}),
  }
}

/** The jobs after one `videoSetup:progress` event, whoever began the job: this panel, or an agent. */
export function applyVideoSetupProgress(
  jobs: VideoSetupJobs,
  progress: VideoSetupProgress,
): VideoSetupJobs {
  if (progress.kind === 'models') return { ...jobs, models: nextModels(jobs.models, progress) }
  const { tool } = progress
  if (!tool) return jobs
  return {
    ...jobs,
    install: { ...jobs.install, [tool]: nextInstall(jobs.install[tool], progress) },
  }
}

/**
 * The jobs after reading what the machine has running, so a job begun while this
 * client was away shows, with its Stop. One already heard of is left: its reports
 * are newer than this read.
 */
export function withRunningVideoJobs(
  jobs: VideoSetupJobs,
  running: readonly VideoSetupRunningJob[],
): VideoSetupJobs {
  return running.reduce<VideoSetupJobs>((seen, job) => {
    if (job.kind === 'models') {
      if (seen.models?.running) return seen
      const { receivedBytes, totalBytes } = job
      const bytes = {
        ...(receivedBytes !== undefined ? { receivedBytes } : {}),
        ...(totalBytes !== undefined ? { totalBytes } : {}),
      }
      return { ...seen, models: { running: true, ...bytes } }
    }
    const { tool } = job
    if (!tool || seen.install[tool]?.running) return seen
    const install = { running: true, output: keepTail(job.output ?? '') }
    return { ...seen, install: { ...seen.install, [tool]: install } }
  }, jobs)
}

/** A job begun from this client, shown as under way before the first report comes. */
export function beginVideoInstall(
  jobs: VideoSetupJobs,
  tool: VideoInstallableTool,
): VideoSetupJobs {
  return { ...jobs, install: { ...jobs.install, [tool]: { running: true, output: '' } } }
}

export function beginVideoModels(jobs: VideoSetupJobs): VideoSetupJobs {
  return { ...jobs, models: { running: true } }
}

export function failVideoInstall(
  jobs: VideoSetupJobs,
  tool: VideoInstallableTool,
  error: string,
): VideoSetupJobs {
  const job = jobs.install[tool]
  return {
    ...jobs,
    install: { ...jobs.install, [tool]: { running: false, output: job?.output ?? '', error } },
  }
}

export function failVideoModels(jobs: VideoSetupJobs, error: string): VideoSetupJobs {
  return { ...jobs, models: { running: false, error } }
}

function changeVideoJob(
  jobs: VideoSetupJobs,
  target: VideoSetupStopTarget,
  change: <Job extends VideoInstallJob | VideoModelsJob>(job: Job) => Job,
): VideoSetupJobs {
  if (target.kind === 'models') {
    return jobs.models ? { ...jobs, models: change(jobs.models) } : jobs
  }
  const job = jobs.install[target.tool]
  return job ? { ...jobs, install: { ...jobs.install, [target.tool]: change(job) } } : jobs
}

/** A stop asked for from this client, shown as under way until the job's last report comes. */
export function beginVideoJobStop(
  jobs: VideoSetupJobs,
  target: VideoSetupStopTarget,
): VideoSetupJobs {
  return changeVideoJob(jobs, target, (job) => ({ ...job, stopping: true, error: undefined }))
}

/** The stop never reached the machine, so the job is still running there. */
export function failVideoJobStop(
  jobs: VideoSetupJobs,
  target: VideoSetupStopTarget,
  error: string,
): VideoSetupJobs {
  return changeVideoJob(jobs, target, (job) => ({ ...job, stopping: false, error }))
}

/** The machine has nothing running for this job, so no last report is coming. */
export function endVideoJob(jobs: VideoSetupJobs, target: VideoSetupStopTarget): VideoSetupJobs {
  return changeVideoJob(jobs, target, (job) => ({ ...job, running: false, stopping: false }))
}

const checkOf = (readiness: VideoToolsReadiness, id: VideoToolId): VideoToolCheck | undefined =>
  readiness.checks.find((check) => check.id === id)

function installRow(
  id: VideoToolId,
  check: VideoToolCheck | undefined,
  tool: VideoInstallableTool,
  job: VideoInstallJob | undefined,
  {
    canInstall = true,
    note,
    actionLabel = VIDEO_SETUP_TEXT.install,
  }: { canInstall?: boolean; note?: string; actionLabel?: string } = {},
): VideoSetupRow {
  const label = VIDEO_SETUP_ROW_LABELS[id]
  const output = job?.output ? { output: job.output } : {}
  if (check?.present)
    return { id, label, state: 'ok', status: VIDEO_SETUP_TEXT.installed, ...output }
  if (job?.running) {
    return {
      id,
      label,
      state: 'busy',
      status: job.stopping ? VIDEO_SETUP_TEXT.stopping : VIDEO_SETUP_TEXT.installing,
      ...(job.stopping
        ? {}
        : {
            stop: {
              target: { kind: 'install' as const, tool },
              ask: VIDEO_SETUP_TEXT.stopInstallAsk,
              label: VIDEO_SETUP_TEXT.stopInstallLabel(VIDEO_SETUP_ROW_LABELS[tool]),
            },
          }),
      ...output,
      ...(job.error ? { error: job.error } : {}),
    }
  }
  return {
    id,
    label,
    state: 'missing',
    ...(job?.stopped ? { status: VIDEO_SETUP_TEXT.stopped } : {}),
    ...(note ? { note } : {}),
    ...(canInstall
      ? {
          action: {
            kind: 'install' as const,
            tool,
            label: job?.error ? VIDEO_SETUP_TEXT.tryAgain : actionLabel,
          },
        }
      : {}),
    ...output,
    ...(job?.error ? { error: job.error } : {}),
  }
}

/** ffprobe has no install of its own: a run for it is ffmpeg's, shown on the row whose button began it. */
function ffmpegRow(
  readiness: VideoToolsReadiness,
  job: VideoInstallJob | undefined,
): VideoSetupRow {
  const check = checkOf(readiness, 'ffmpeg')
  const noDrawText = check?.fix === VIDEO_TOOL_FIXES.ffmpegText
  const ranForFfprobe = !!check?.present && !checkOf(readiness, 'ffprobe')?.present
  return installRow('ffmpeg', check, 'ffmpeg', ranForFfprobe ? undefined : job, {
    ...(noDrawText ? { note: VIDEO_SETUP_TEXT.noDrawText } : {}),
  })
}

function ffprobeRow(
  readiness: VideoToolsReadiness,
  job: VideoInstallJob | undefined,
): VideoSetupRow {
  const ffmpegMissing = !checkOf(readiness, 'ffmpeg')?.present
  return installRow(
    'ffprobe',
    checkOf(readiness, 'ffprobe'),
    'ffmpeg',
    ffmpegMissing ? undefined : job,
    { canInstall: !ffmpegMissing, note: VIDEO_SETUP_TEXT.comesWithFfmpeg },
  )
}

function whisperRow(
  readiness: VideoToolsReadiness,
  job: VideoInstallJob | undefined,
): VideoSetupRow {
  const check = checkOf(readiness, 'whisper')
  const old = check?.fix === VIDEO_TOOL_FIXES.whisperOld
  return installRow(
    'whisper',
    check,
    'whisper',
    job,
    old ? { note: VIDEO_SETUP_TEXT.whisperOld, actionLabel: VIDEO_SETUP_TEXT.update } : {},
  )
}

function modelsRow(readiness: VideoToolsReadiness, job: VideoModelsJob | undefined): VideoSetupRow {
  const id = 'models'
  const label = VIDEO_SETUP_ROW_LABELS[id]
  if (checkOf(readiness, id)?.present) {
    return { id, label, state: 'ok', status: VIDEO_SETUP_TEXT.installed }
  }
  if (job?.running) {
    const total = job.totalBytes
    const received = job.receivedBytes ?? 0
    return {
      id,
      label,
      state: 'busy',
      status: job.stopping ? VIDEO_SETUP_TEXT.stopping : VIDEO_SETUP_TEXT.downloading,
      ...(job.stopping
        ? {}
        : {
            stop: {
              target: { kind: 'models' as const },
              ask: VIDEO_SETUP_TEXT.stopDownloadAsk,
              label: VIDEO_SETUP_TEXT.stopDownloadLabel(label),
            },
          }),
      ...(job.error ? { error: job.error } : {}),
      ...(total
        ? {
            progress: {
              percent: Math.min(100, Math.floor((received / total) * 100)),
              line: VIDEO_SETUP_TEXT.modelsLine(
                Math.round(received / BYTES_PER_MB),
                Math.round(total / BYTES_PER_MB),
                Math.min(100, Math.floor((received / total) * 100)),
              ),
            },
          }
        : {}),
    }
  }
  return {
    id,
    label,
    state: 'missing',
    ...(job?.stopped ? { status: VIDEO_SETUP_TEXT.stopped } : {}),
    action: {
      kind: 'models',
      label: job?.error ? VIDEO_SETUP_TEXT.tryAgain : VIDEO_SETUP_TEXT.downloadModels,
      note: VIDEO_SETUP_TEXT.modelsNote(MODELS_MB),
    },
    ...(job?.error ? { error: job.error } : {}),
  }
}

/** The setup panel, grouped by what each piece gives. */
export function videoSetupView(
  readiness: VideoToolsReadiness,
  jobs: VideoSetupJobs,
): VideoSetupView {
  const { canDigest, canTranscribe } = readiness
  const hears = !!checkOf(readiness, 'whisper')?.present && !!checkOf(readiness, 'models')?.present
  const groups: VideoSetupGroup[] = [
    {
      id: 'stills',
      title: VIDEO_SETUP_TEXT.stillsTitle,
      note: VIDEO_SETUP_TEXT.stillsNote,
      badge: canDigest ? VIDEO_SETUP_TEXT.ready : VIDEO_SETUP_TEXT.missing,
      tone: canDigest ? 'done' : 'stuck',
      rows: [ffmpegRow(readiness, jobs.install.ffmpeg), ffprobeRow(readiness, jobs.install.ffmpeg)],
    },
    {
      id: 'transcript',
      title: VIDEO_SETUP_TEXT.transcriptTitle,
      note: VIDEO_SETUP_TEXT.transcriptNote,
      badge: hears ? VIDEO_SETUP_TEXT.ready : VIDEO_SETUP_TEXT.missing,
      tone: hears ? 'done' : 'working',
      rows: [whisperRow(readiness, jobs.install.whisper), modelsRow(readiness, jobs.models)],
    },
  ]
  const ready = canDigest && canTranscribe
  return {
    overall: ready
      ? { label: VIDEO_SETUP_TEXT.ready, tone: 'done' }
      : canDigest
        ? { label: VIDEO_SETUP_TEXT.noTranscript, tone: 'working' }
        : { label: VIDEO_SETUP_TEXT.notSetUp, tone: 'stuck' },
    groups,
    canAskAgent: !ready,
    ready,
  }
}
