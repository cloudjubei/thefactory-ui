import type { VideoToolId } from 'thefactory-tools/types'

/** The most of an install's output kept: enough to read back, never the whole of a long build. */
export const VIDEO_SETUP_OUTPUT_MAX_CHARS = 64_000

export const VIDEO_SETUP_ROW_LABELS: Record<VideoToolId, string> = {
  ffmpeg: 'ffmpeg',
  ffprobe: 'ffprobe',
  whisper: 'whisper.cpp',
  models: 'Speech models',
}

export const VIDEO_SETUP_TEXT = {
  title: 'Video',
  lead: 'Agents read a video as stills and a transcript, made on the machine that runs Overseer. Nothing leaves it.',
  ready: 'Ready',
  noTranscript: 'No transcript',
  notSetUp: 'Not set up',
  missing: 'Missing',
  installed: 'Installed',
  installing: 'Installing…',
  downloading: 'Downloading…',
  stopping: 'Stopping…',
  stopped: 'Stopped',
  stop: 'Stop',
  keep: 'Keep',
  stopInstallAsk: 'Stop install?',
  stopDownloadAsk: 'Stop download?',
  stopInstallLabel: (name: string) => `Stop install of ${name}`,
  stopDownloadLabel: (name: string) => `Stop download of ${name}`,
  install: 'Install',
  downloadModels: 'Download models',
  tryAgain: 'Try again',
  recheck: 'Check again',
  checking: 'Checking…',
  offline: 'Videos work offline.',
  stillsTitle: 'Stills and sheets',
  stillsNote: 'Every video needs these.',
  transcriptTitle: 'Transcript',
  transcriptNote: 'Without these, agents see the video but not what was said.',
  agentNote: 'An agent goes through what is missing and runs each step. It asks before installing.',
  agentStarting: 'Starting…',
  modelsNote: (megabytes: number) => `About ${megabytes} MB, once. Then everything runs offline.`,
  modelsLine: (receivedMb: number, totalMb: number, percent: number) =>
    `${receivedMb} of ${totalMb} MB · ${percent}% · keeps going if you leave`,
  comesWithFfmpeg: 'Comes with ffmpeg.',
  noDrawText: 'This ffmpeg cannot draw text.',
  whisperOld: 'This whisper.cpp is too old to detect speech.',
  update: 'Update',
  outputLabel: 'Install output',
  loadFailed: 'Could not read what this machine has.',
  jobFailed: 'That could not be started.',
  stopFailed: 'That could not be stopped.',
  agentFailed: 'The agent could not be started.',
} as const
