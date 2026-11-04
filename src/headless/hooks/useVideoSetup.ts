import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VideoInstallableTool, VideoToolsReadiness } from 'thefactory-tools/types'
import { extractErrorMessage, useApi, type ChatContext } from '../api'
import {
  downloadVideoSetupModels,
  installVideoSetupTool,
  openVideoSetupChat,
  readVideoSetup,
  stopVideoSetupJob,
} from '../api/videoApi'
import {
  NO_VIDEO_SETUP_JOBS,
  applyVideoSetupProgress,
  withRunningVideoJobs,
  beginVideoInstall,
  beginVideoJobStop,
  beginVideoModels,
  endVideoJob,
  failVideoInstall,
  failVideoJobStop,
  failVideoModels,
  videoSetupView,
} from '../utils/videoSetup'
import { VIDEO_SETUP_TEXT } from '../utils/videoSetupConstants'
import type {
  VideoSetupProgress,
  VideoSetupStopTarget,
  VideoSetupView,
} from '../utils/videoSetupTypes'
import { useOnWsReopen } from './useOnWsReopen'

export type UseVideoSetup = {
  view: VideoSetupView | undefined
  checking: boolean
  loadError: string | undefined
  /** A step of the agent being started went wrong. */
  agentError: string | undefined
  agentStarting: boolean
  recheck: () => void
  install: (tool: VideoInstallableTool) => void
  downloadModels: () => void
  stop: (target: VideoSetupStopTarget) => void
  /** Open the chat whose agent goes through the setup; `onOpen` takes the person there. */
  askAgent: (onOpen: (context: ChatContext) => void) => void
}

/**
 * What a video needs on the machine that runs Overseer, and doing what is
 * missing there. Progress is heard whoever began the job, so an install an
 * agent is running in a chat shows here too.
 */
export function useVideoSetup(): UseVideoSetup {
  const { ws } = useApi()
  const [readiness, setReadiness] = useState<VideoToolsReadiness | undefined>()
  const [jobs, setJobs] = useState(NO_VIDEO_SETUP_JOBS)
  const [checking, setChecking] = useState(true)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [agentError, setAgentError] = useState<string | undefined>()
  const [agentStarting, setAgentStarting] = useState(false)
  const liveRef = useRef(true)

  const recheck = useCallback(() => {
    setChecking(true)
    readVideoSetup()
      .then((next) => {
        if (!liveRef.current) return
        setReadiness(next)
        setJobs((prev) => withRunningVideoJobs(prev, next.runningJobs ?? []))
        setLoadError(undefined)
      })
      .catch((err: unknown) => {
        if (liveRef.current) setLoadError(extractErrorMessage(err, VIDEO_SETUP_TEXT.loadFailed))
      })
      .finally(() => {
        if (liveRef.current) setChecking(false)
      })
  }, [])

  useEffect(() => {
    liveRef.current = true
    recheck()
    return () => {
      liveRef.current = false
    }
  }, [recheck])

  useEffect(
    () =>
      ws.on<VideoSetupProgress>('videoSetup:progress', (progress) => {
        setJobs((prev) => applyVideoSetupProgress(prev, progress))
        if (progress.done && !progress.error) recheck()
      }),
    [ws, recheck],
  )

  useOnWsReopen(recheck)

  const install = useCallback((tool: VideoInstallableTool) => {
    setJobs((prev) => beginVideoInstall(prev, tool))
    installVideoSetupTool(tool).catch((err: unknown) => {
      const reason = extractErrorMessage(err, VIDEO_SETUP_TEXT.jobFailed)
      if (liveRef.current) setJobs((prev) => failVideoInstall(prev, tool, reason))
    })
  }, [])

  const downloadModels = useCallback(() => {
    setJobs(beginVideoModels)
    downloadVideoSetupModels().catch((err: unknown) => {
      const reason = extractErrorMessage(err, VIDEO_SETUP_TEXT.jobFailed)
      if (liveRef.current) setJobs((prev) => failVideoModels(prev, reason))
    })
  }, [])

  const stop = useCallback(
    (target: VideoSetupStopTarget) => {
      setJobs((prev) => beginVideoJobStop(prev, target))
      stopVideoSetupJob(target)
        .then(({ stopped }) => {
          if (stopped || !liveRef.current) return
          setJobs((prev) => endVideoJob(prev, target))
          recheck()
        })
        .catch((err: unknown) => {
          const reason = extractErrorMessage(err, VIDEO_SETUP_TEXT.stopFailed)
          if (liveRef.current) setJobs((prev) => failVideoJobStop(prev, target, reason))
        })
    },
    [recheck],
  )

  const askAgent = useCallback((onOpen: (context: ChatContext) => void) => {
    setAgentError(undefined)
    setAgentStarting(true)
    openVideoSetupChat()
      .then(({ context }) => onOpen(context))
      .catch((err: unknown) => {
        if (liveRef.current) setAgentError(extractErrorMessage(err, VIDEO_SETUP_TEXT.agentFailed))
      })
      .finally(() => {
        if (liveRef.current) setAgentStarting(false)
      })
  }, [])

  const view = useMemo(
    () => (readiness ? videoSetupView(readiness, jobs) : undefined),
    [readiness, jobs],
  )

  return {
    view,
    checking,
    loadError,
    agentError,
    agentStarting,
    recheck,
    install,
    downloadModels,
    stop,
    askAgent,
  }
}
