import { VIDEO_TOOL_FIXES } from 'thefactory-tools/constants'
import type { VideoToolCheck, VideoToolsReadiness } from 'thefactory-tools/types'
import { describe, expect, it } from 'vitest'
import {
  NO_VIDEO_SETUP_JOBS,
  applyVideoSetupProgress,
  beginVideoInstall,
  beginVideoJobStop,
  beginVideoModels,
  endVideoJob,
  failVideoInstall,
  failVideoJobStop,
  failVideoModels,
  videoSetupView,
  withRunningVideoJobs,
} from './videoSetup'
import { VIDEO_SETUP_OUTPUT_MAX_CHARS } from './videoSetupConstants'
import type { VideoSetupJobs, VideoSetupRow } from './videoSetupTypes'

const OK: VideoToolCheck[] = [
  { id: 'ffmpeg', present: true },
  { id: 'ffprobe', present: true },
  { id: 'whisper', present: true },
  { id: 'models', present: true },
]

function readiness(...missing: VideoToolCheck[]): VideoToolsReadiness {
  const checks = OK.map((check) => missing.find((m) => m.id === check.id) ?? check)
  const has = (id: string) => !!checks.find((c) => c.id === id)?.present
  const canDigest = has('ffmpeg') && has('ffprobe')
  return { canDigest, canTranscribe: canDigest && has('whisper') && has('models'), checks }
}

const NO_FFMPEG: VideoToolCheck = { id: 'ffmpeg', present: false, fix: VIDEO_TOOL_FIXES.ffmpeg }
const NO_FFPROBE: VideoToolCheck = { id: 'ffprobe', present: false, fix: VIDEO_TOOL_FIXES.ffprobe }
const NO_WHISPER: VideoToolCheck = { id: 'whisper', present: false, fix: VIDEO_TOOL_FIXES.whisper }
const NO_MODELS: VideoToolCheck = { id: 'models', present: false, fix: VIDEO_TOOL_FIXES.models }

function rowOf(
  state: VideoToolsReadiness,
  id: string,
  jobs: VideoSetupJobs = NO_VIDEO_SETUP_JOBS,
): VideoSetupRow {
  const row = videoSetupView(state, jobs)
    .groups.flatMap((group) => group.rows)
    .find((r) => r.id === id)
  if (!row) throw new Error(`no row ${id}`)
  return row
}

describe('videoSetupView', () => {
  it('reads Ready with nothing to do', () => {
    const view = videoSetupView(readiness(), NO_VIDEO_SETUP_JOBS)
    expect(view).toMatchObject({
      overall: { label: 'Ready', tone: 'done' },
      canAskAgent: false,
      ready: true,
    })
    expect(view.groups.map((g) => g.badge)).toEqual(['Ready', 'Ready'])
  })

  it('reads No transcript when only stills work', () => {
    const view = videoSetupView(readiness(NO_WHISPER, NO_MODELS), NO_VIDEO_SETUP_JOBS)
    expect(view.overall).toEqual({ label: 'No transcript', tone: 'working' })
    expect(view.canAskAgent).toBe(true)
    expect(view.groups.map((g) => g.badge)).toEqual(['Ready', 'Missing'])
  })

  it('reads Not set up without ffmpeg, even if the transcript side is there', () => {
    const view = videoSetupView(readiness(NO_FFMPEG, NO_FFPROBE), NO_VIDEO_SETUP_JOBS)
    expect(view.overall).toEqual({ label: 'Not set up', tone: 'stuck' })
    expect(view.groups.map((g) => g.badge)).toEqual(['Missing', 'Ready'])
  })

  it('groups the pieces by what they give', () => {
    const view = videoSetupView(readiness(), NO_VIDEO_SETUP_JOBS)
    expect(view.groups.map((g) => [g.id, g.rows.map((r) => r.id)])).toEqual([
      ['stills', ['ffmpeg', 'ffprobe']],
      ['transcript', ['whisper', 'models']],
    ])
  })

  it('offers a button for each missing piece and never shows a command', () => {
    const state = readiness(NO_FFMPEG, NO_FFPROBE, NO_WHISPER, NO_MODELS)
    const rows = videoSetupView(state, NO_VIDEO_SETUP_JOBS).groups.flatMap((g) => g.rows)
    expect(rowOf(state, 'ffmpeg').action).toEqual({
      kind: 'install',
      tool: 'ffmpeg',
      label: 'Install',
    })
    expect(rowOf(state, 'whisper').action).toMatchObject({ kind: 'install', tool: 'whisper' })
    expect(rowOf(state, 'models').action).toMatchObject({
      kind: 'models',
      label: 'Download models',
      note: 'About 575 MB, once. Then everything runs offline.',
    })
    expect(JSON.stringify(rows)).not.toContain('brew')
  })

  it('has one Install for ffmpeg and ffprobe when both are missing', () => {
    const state = readiness(NO_FFMPEG, NO_FFPROBE)
    expect(rowOf(state, 'ffprobe')).toMatchObject({ note: 'Comes with ffmpeg.' })
    expect(rowOf(state, 'ffprobe')).not.toHaveProperty('action')
  })

  it('offers ffmpeg’s install on the ffprobe row when ffprobe alone is missing', () => {
    expect(rowOf(readiness(NO_FFPROBE), 'ffprobe').action).toMatchObject({ tool: 'ffmpeg' })
  })

  it('says why a present ffmpeg will not do, and installs a full build', () => {
    const state = readiness({ id: 'ffmpeg', present: false, fix: VIDEO_TOOL_FIXES.ffmpegText })
    expect(rowOf(state, 'ffmpeg')).toMatchObject({
      note: 'This ffmpeg cannot draw text.',
      action: { tool: 'ffmpeg' },
    })
  })

  it('offers Update for an old whisper.cpp, as an install brings it up to date', () => {
    const state = readiness({ id: 'whisper', present: false, fix: VIDEO_TOOL_FIXES.whisperOld })
    const row = rowOf(state, 'whisper')
    expect(row.note).toContain('too old')
    expect(row.action).toMatchObject({ kind: 'install', tool: 'whisper', label: 'Update' })
  })

  it('shows an install under way with its output, on the row that began it', () => {
    const jobs = applyVideoSetupProgress(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg'), {
      kind: 'install',
      tool: 'ffmpeg',
      output: '==> Pouring',
    })
    const both = readiness(NO_FFMPEG, NO_FFPROBE)
    expect(rowOf(both, 'ffmpeg', jobs)).toMatchObject({
      state: 'busy',
      status: 'Installing…',
      output: '==> Pouring',
    })
    expect(rowOf(both, 'ffmpeg', jobs)).not.toHaveProperty('action')
    expect(rowOf(both, 'ffprobe', jobs)).not.toHaveProperty('output')
  })

  it('shows ffprobe’s install on its own row, not on a present ffmpeg’s', () => {
    const jobs = beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg')
    const running = applyVideoSetupProgress(jobs, { kind: 'install', tool: 'ffmpeg', output: 'x' })
    const state = readiness(NO_FFPROBE)
    expect(rowOf(state, 'ffprobe', running)).toMatchObject({ state: 'busy', output: 'x' })
    expect(rowOf(state, 'ffmpeg', running)).not.toHaveProperty('output')
  })

  it('keeps the output on the row after the install is done', () => {
    const jobs = applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, {
      kind: 'install',
      tool: 'ffmpeg',
      output: 'done',
    })
    expect(rowOf(readiness(), 'ffmpeg', jobs)).toMatchObject({ state: 'ok', output: 'done' })
  })

  it('offers another go after a failed install, with why', () => {
    const jobs = failVideoInstall(
      beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'),
      'whisper',
      'No brew.',
    )
    expect(rowOf(readiness(NO_WHISPER), 'whisper', jobs)).toMatchObject({
      state: 'missing',
      error: 'No brew.',
      action: { label: 'Try again' },
    })
  })

  it('shows the models download with its progress', () => {
    const jobs = applyVideoSetupProgress(beginVideoModels(NO_VIDEO_SETUP_JOBS), {
      kind: 'models',
      receivedBytes: 300_000_000,
      totalBytes: 575_000_000,
    })
    const row = rowOf(readiness(NO_MODELS), 'models', jobs)
    expect(row).toMatchObject({
      state: 'busy',
      status: 'Downloading…',
      progress: { percent: 52, line: '300 of 575 MB · 52% · keeps going if you leave' },
    })
    expect(row).not.toHaveProperty('action')
  })

  it('shows a download with no figures yet as under way', () => {
    const row = rowOf(readiness(NO_MODELS), 'models', beginVideoModels(NO_VIDEO_SETUP_JOBS))
    expect(row).toMatchObject({ state: 'busy' })
    expect(row).not.toHaveProperty('progress')
  })

  it('offers the download again after it failed', () => {
    const jobs = failVideoModels(NO_VIDEO_SETUP_JOBS, 'a.bin could not be downloaded (503).')
    expect(rowOf(readiness(NO_MODELS), 'models', jobs)).toMatchObject({
      error: 'a.bin could not be downloaded (503).',
      action: { label: 'Try again' },
    })
  })

  it('offers Stop on a running install, asking first in words of its own', () => {
    const jobs = beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper')
    expect(rowOf(readiness(NO_WHISPER), 'whisper', jobs).stop).toEqual({
      target: { kind: 'install', tool: 'whisper' },
      ask: 'Stop install?',
      label: 'Stop install of whisper.cpp',
    })
  })

  it('offers Stop on a running download, asking first in words of its own', () => {
    const jobs = beginVideoModels(NO_VIDEO_SETUP_JOBS)
    expect(rowOf(readiness(NO_MODELS), 'models', jobs).stop).toEqual({
      target: { kind: 'models' },
      ask: 'Stop download?',
      label: 'Stop download of Speech models',
    })
  })

  it('stops ffmpeg’s install from the ffprobe row that shows it', () => {
    const jobs = beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg')
    const onlyFfprobe = readiness(NO_FFPROBE)
    expect(rowOf(onlyFfprobe, 'ffprobe', jobs).stop?.target).toEqual({
      kind: 'install',
      tool: 'ffmpeg',
    })
    expect(rowOf(onlyFfprobe, 'ffmpeg', jobs)).not.toHaveProperty('stop')
  })

  it('offers one Stop for ffmpeg and ffprobe when both are coming', () => {
    const jobs = beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg')
    const both = readiness(NO_FFMPEG, NO_FFPROBE)
    expect(rowOf(both, 'ffmpeg', jobs)).toHaveProperty('stop')
    expect(rowOf(both, 'ffprobe', jobs)).not.toHaveProperty('stop')
  })

  it('offers no Stop where nothing is running', () => {
    const missing = readiness(NO_WHISPER, NO_MODELS)
    expect(rowOf(missing, 'whisper')).not.toHaveProperty('stop')
    expect(rowOf(missing, 'models')).not.toHaveProperty('stop')
  })

  it('shows a job on its way to stopping, with no second Stop', () => {
    const install = beginVideoJobStop(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'), {
      kind: 'install',
      tool: 'whisper',
    })
    const models = beginVideoJobStop(beginVideoModels(NO_VIDEO_SETUP_JOBS), { kind: 'models' })
    const whisperRow = rowOf(readiness(NO_WHISPER), 'whisper', install)
    const modelsRow = rowOf(readiness(NO_MODELS), 'models', models)
    for (const row of [whisperRow, modelsRow]) {
      expect(row).toMatchObject({ state: 'busy', status: 'Stopping…' })
      expect(row).not.toHaveProperty('stop')
      expect(row).not.toHaveProperty('action')
    }
  })

  it('offers Stop again with why, when the stop could not be sent', () => {
    const target = { kind: 'install', tool: 'whisper' } as const
    const jobs = failVideoJobStop(
      beginVideoJobStop(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'), target),
      target,
      'That could not be stopped.',
    )
    expect(rowOf(readiness(NO_WHISPER), 'whisper', jobs)).toMatchObject({
      state: 'busy',
      status: 'Installing…',
      stop: { target },
      error: 'That could not be stopped.',
    })
  })

  it('offers Stop on a download again with why, when the stop could not be sent', () => {
    const target = { kind: 'models' } as const
    const jobs = failVideoJobStop(
      beginVideoJobStop(beginVideoModels(NO_VIDEO_SETUP_JOBS), target),
      target,
      'That could not be stopped.',
    )
    expect(rowOf(readiness(NO_MODELS), 'models', jobs)).toMatchObject({
      state: 'busy',
      status: 'Downloading…',
      stop: { target },
      error: 'That could not be stopped.',
    })
  })

  it('drops why the last stop failed once it is tried again', () => {
    const target = { kind: 'models' } as const
    const failed = failVideoJobStop(beginVideoModels(NO_VIDEO_SETUP_JOBS), target, 'no')
    const row = rowOf(readiness(NO_MODELS), 'models', beginVideoJobStop(failed, target))
    expect(row.status).toBe('Stopping…')
    expect(row).not.toHaveProperty('error')
  })

  it('goes back to Install after a stopped install, saying so and keeping its output', () => {
    const jobs = applyVideoSetupProgress(
      {
        install: { whisper: { running: true, output: '==> Fetching', stopping: true } },
      },
      { kind: 'install', tool: 'whisper', done: true, stopped: true },
    )
    const row = rowOf(readiness(NO_WHISPER), 'whisper', jobs)
    expect(row).toMatchObject({
      state: 'missing',
      status: 'Stopped',
      action: { kind: 'install', label: 'Install' },
      output: '==> Fetching',
    })
    expect(row).not.toHaveProperty('error')
    expect(row).not.toHaveProperty('stop')
  })

  it('goes back to Download after a stopped download, saying so', () => {
    const jobs = applyVideoSetupProgress(beginVideoModels(NO_VIDEO_SETUP_JOBS), {
      kind: 'models',
      done: true,
      stopped: true,
    })
    const row = rowOf(readiness(NO_MODELS), 'models', jobs)
    expect(row).toMatchObject({
      state: 'missing',
      status: 'Stopped',
      action: { kind: 'models', label: 'Download models' },
    })
    expect(row).not.toHaveProperty('error')
  })

  it('stops saying Stopped once the job is begun again', () => {
    const stopped = applyVideoSetupProgress(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'), {
      kind: 'install',
      tool: 'whisper',
      done: true,
      stopped: true,
    })
    const again = beginVideoInstall(stopped, 'whisper')
    expect(rowOf(readiness(NO_WHISPER), 'whisper', again).status).toBe('Installing…')
    const byAgent = applyVideoSetupProgress(stopped, {
      kind: 'install',
      tool: 'whisper',
      output: 'a',
    })
    expect(byAgent.install.whisper).not.toHaveProperty('stopped')
  })

  it('says nothing of a stop on a row with no job in its way', () => {
    expect(rowOf(readiness(NO_WHISPER), 'whisper').status).toBeUndefined()
    expect(rowOf(readiness(NO_MODELS), 'models').status).toBeUndefined()
  })
})

describe('stopping a job', () => {
  it('leaves the jobs as they are when there is none to stop', () => {
    const install = { kind: 'install', tool: 'ffmpeg' } as const
    const models = { kind: 'models' } as const
    for (const target of [install, models]) {
      expect(beginVideoJobStop(NO_VIDEO_SETUP_JOBS, target)).toBe(NO_VIDEO_SETUP_JOBS)
      expect(failVideoJobStop(NO_VIDEO_SETUP_JOBS, target, 'no')).toBe(NO_VIDEO_SETUP_JOBS)
      expect(endVideoJob(NO_VIDEO_SETUP_JOBS, target)).toBe(NO_VIDEO_SETUP_JOBS)
    }
  })

  it('touches only the job it names', () => {
    const both = beginVideoModels(
      beginVideoInstall(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg'), 'whisper'),
    )
    const jobs = beginVideoJobStop(both, { kind: 'install', tool: 'whisper' })
    expect(jobs.install.whisper).toMatchObject({ stopping: true })
    expect(jobs.install.ffmpeg).toEqual(both.install.ffmpeg)
    expect(jobs.models).toEqual(both.models)
  })

  it('stays stopping through what the install still prints, until its last report', () => {
    const stopping = beginVideoJobStop(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'), {
      kind: 'install',
      tool: 'whisper',
    })
    const printing = applyVideoSetupProgress(stopping, {
      kind: 'install',
      tool: 'whisper',
      output: 'bye',
    })
    expect(printing.install.whisper).toEqual({ running: true, output: 'bye', stopping: true })
    const ended = applyVideoSetupProgress(printing, {
      kind: 'install',
      tool: 'whisper',
      done: true,
      stopped: true,
    })
    expect(ended.install.whisper).toEqual({ running: false, output: 'bye', stopped: true })
  })

  it('stays stopping through what the download still reports, until its last report', () => {
    const stopping = beginVideoJobStop(beginVideoModels(NO_VIDEO_SETUP_JOBS), { kind: 'models' })
    const moving = applyVideoSetupProgress(stopping, {
      kind: 'models',
      receivedBytes: 1,
      totalBytes: 2,
    })
    expect(moving.models).toEqual({
      running: true,
      stopping: true,
      receivedBytes: 1,
      totalBytes: 2,
    })
    const ended = applyVideoSetupProgress(moving, { kind: 'models', done: true, stopped: true })
    expect(ended.models).toEqual({
      running: false,
      stopped: true,
      receivedBytes: 1,
      totalBytes: 2,
    })
  })

  it('ends a job the machine says is no longer running, offering its button again', () => {
    const install = { kind: 'install', tool: 'whisper' } as const
    const models = { kind: 'models' } as const
    const running = beginVideoModels(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper'))
    const jobs = endVideoJob(
      endVideoJob(beginVideoJobStop(beginVideoJobStop(running, install), models), install),
      models,
    )
    const state = readiness(NO_WHISPER, NO_MODELS)
    const whisperRow = rowOf(state, 'whisper', jobs)
    const modelsRow = rowOf(state, 'models', jobs)
    expect(whisperRow).toMatchObject({ state: 'missing', action: { label: 'Install' } })
    expect(modelsRow).toMatchObject({ state: 'missing', action: { label: 'Download models' } })
    expect(whisperRow.status).toBeUndefined()
    expect(modelsRow.status).toBeUndefined()
  })
})

describe('applyVideoSetupProgress', () => {
  it('adds up an install’s output and ends it on done', () => {
    let jobs = applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, {
      kind: 'install',
      tool: 'whisper',
      output: 'a',
    })
    jobs = applyVideoSetupProgress(jobs, { kind: 'install', tool: 'whisper', output: 'b' })
    expect(jobs.install.whisper).toEqual({ running: true, output: 'ab' })
    jobs = applyVideoSetupProgress(jobs, {
      kind: 'install',
      tool: 'whisper',
      done: true,
      error: 'failed',
    })
    expect(jobs.install.whisper).toEqual({ running: false, output: 'ab', error: 'failed' })
  })

  it('keeps only the end of a long output', () => {
    const jobs = applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, {
      kind: 'install',
      tool: 'ffmpeg',
      output: `start${'x'.repeat(VIDEO_SETUP_OUTPUT_MAX_CHARS)}`,
    })
    expect(jobs.install.ffmpeg?.output).toHaveLength(VIDEO_SETUP_OUTPUT_MAX_CHARS)
    expect(jobs.install.ffmpeg?.output.startsWith('start')).toBe(false)
  })

  it('takes up a download it did not begin, as an agent’s', () => {
    const jobs = applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, {
      kind: 'models',
      receivedBytes: 1,
      totalBytes: 2,
    })
    expect(jobs.models).toEqual({ running: true, receivedBytes: 1, totalBytes: 2 })
  })

  it('keeps the figures when a report brings none', () => {
    let jobs = applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, {
      kind: 'models',
      receivedBytes: 1,
      totalBytes: 2,
    })
    jobs = applyVideoSetupProgress(jobs, { kind: 'models', done: true })
    expect(jobs.models).toEqual({ running: false, receivedBytes: 1, totalBytes: 2 })
  })

  it('ignores an install report that names no tool', () => {
    expect(applyVideoSetupProgress(NO_VIDEO_SETUP_JOBS, { kind: 'install', output: 'x' })).toBe(
      NO_VIDEO_SETUP_JOBS,
    )
  })
})

describe('withRunningVideoJobs', () => {
  it('shows an install begun while this client was away, with what it printed', () => {
    const jobs = withRunningVideoJobs(NO_VIDEO_SETUP_JOBS, [
      { kind: 'install', tool: 'ffmpeg', output: '==> Pouring' },
    ])
    expect(jobs.install.ffmpeg).toEqual({ running: true, output: '==> Pouring' })
  })

  it('shows a download with how far it is', () => {
    const jobs = withRunningVideoJobs(NO_VIDEO_SETUP_JOBS, [
      { kind: 'models', receivedBytes: 5, totalBytes: 10 },
    ])
    expect(jobs.models).toEqual({ running: true, receivedBytes: 5, totalBytes: 10 })
  })

  it('leaves a job it has heard from, as its reports are newer', () => {
    const heard = beginVideoJobStop(beginVideoInstall(NO_VIDEO_SETUP_JOBS, 'ffmpeg'), {
      kind: 'install',
      tool: 'ffmpeg',
    })
    const jobs = withRunningVideoJobs(heard, [{ kind: 'install', tool: 'ffmpeg', output: 'old' }])
    expect(jobs.install.ffmpeg?.stopping).toBe(true)
  })

  it('leaves a download it has heard from', () => {
    const heard = applyVideoSetupProgress(beginVideoModels(NO_VIDEO_SETUP_JOBS), {
      kind: 'models',
      receivedBytes: 9,
      totalBytes: 10,
    })
    const jobs = withRunningVideoJobs(heard, [{ kind: 'models', receivedBytes: 1 }])
    expect(jobs.models?.receivedBytes).toBe(9)
  })

  it('takes up a job that failed here but is running again', () => {
    const failed = failVideoInstall(NO_VIDEO_SETUP_JOBS, 'whisper', 'no')
    const jobs = withRunningVideoJobs(failed, [{ kind: 'install', tool: 'whisper' }])
    expect(jobs.install.whisper).toEqual({ running: true, output: '' })
  })

  it('has nothing to do when nothing runs', () => {
    expect(withRunningVideoJobs(NO_VIDEO_SETUP_JOBS, [])).toBe(NO_VIDEO_SETUP_JOBS)
  })

  it('ignores an install that names no tool', () => {
    expect(withRunningVideoJobs(NO_VIDEO_SETUP_JOBS, [{ kind: 'install' }])).toBe(
      NO_VIDEO_SETUP_JOBS,
    )
  })
})
