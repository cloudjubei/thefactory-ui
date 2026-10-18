import { useCallback, useState } from 'react'
import type { LaunchSetupSuggestion, WorkLaunchMode } from 'thefactory-tools/types'
import { projectWorkLaunchMode } from 'thefactory-tools/utils'
import { useLLMConfigs } from '../contexts/LLMConfigsContext'
import { useProjects } from '../contexts/ProjectsContext'
import { startStoryWork, suggestLaunchSetup } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import { launchSuggestionBody } from '../utils/workLaunchView'
import type { LaunchSuggestionInput, WorkLaunchChoice } from '../utils/workLaunchViewTypes'

/** Where a story's work went once started from its page. */
export interface StoryWorkStarted {
  mode: 'process' | 'chat'
  /** The chat the run reports into, or the chat doing the work. */
  chatContextId: string
  processRunId?: string
  turnStarted?: boolean
}

/** Start a story's work — or one feature's — the way chosen, from its page. */
export async function startStoryWorkRequest(input: {
  projectId: string
  storyId: string
  featureIds?: readonly string[]
  choice: WorkLaunchChoice
}): Promise<StoryWorkStarted> {
  const res = await startStoryWork({
    path: { projectId: input.projectId, storyId: input.storyId },
    body: {
      mode: input.choice.mode,
      ...(input.featureIds && input.featureIds.length > 0
        ? { featureIds: [...input.featureIds] }
        : {}),
      ...(input.choice.decision ? { decision: input.choice.decision } : {}),
    },
    throwOnError: true,
  })
  return res.data as StoryWorkStarted
}

export interface LaunchSuggestionState {
  suggestion: LaunchSetupSuggestion | undefined
  /** The model — or CLI and model — that suggested it. */
  answeredBy: string | undefined
  busy: boolean
  error: string | undefined
  /** Ask the agent — one short turn, nothing launched. */
  ask: () => void
  dismiss: () => void
}

/**
 * The launch card's "Suggest setup": one short, read-only turn over the story, its
 * features and the project, on the agent the launch runs on — the CLI picked, or
 * the API model — answering a setting per row with why. A CLI that cannot answer
 * says why. The person applies or dismisses it; nothing launches from here.
 */
export function useLaunchSuggestion(input: LaunchSuggestionInput): LaunchSuggestionState {
  const [suggestion, setSuggestion] = useState<LaunchSetupSuggestion>()
  const [answeredBy, setAnsweredBy] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const { projectId, storyId } = input

  const ask = useCallback(() => {
    if (!projectId || !storyId) return
    setBusy(true)
    setError(undefined)
    void suggestLaunchSetup({
      body: launchSuggestionBody({ ...input, projectId, storyId }),
      throwOnError: true,
    })
      .then(({ data }) => {
        setSuggestion(data.suggestion as LaunchSetupSuggestion)
        setAnsweredBy(data.answeredBy)
      })
      .catch((err: unknown) => setError(extractErrorMessage(err, 'No setup was suggested.')))
      .finally(() => setBusy(false))
  }, [
    projectId,
    storyId,
    input.runner,
    input.featureIds,
    input.processId,
    input.featureProcessId,
    input.baseBranch,
    input.cliTool,
    input.model,
    input.cliCredentialId,
    input.chatContextId,
    input.models,
    input.turnLimit,
  ])

  const dismiss = useCallback(() => {
    setSuggestion(undefined)
    setAnsweredBy(undefined)
    setError(undefined)
  }, [])

  return { suggestion, answeredBy, busy, error, ask, dismiss }
}

/** How a project starts work: the way it last went there, and the agent the person's chats run on. */
export function useProjectWorkLaunch(projectId: string | undefined): {
  defaultMode: WorkLaunchMode
  chatRunner: 'api' | 'cli'
  /** The agent work started in a chat runs on — the person's active one — as a launch carries it. */
  chatAgent: Record<string, unknown>
} {
  const { projects } = useProjects()
  const { activeRunnerKind, activeAgentRunCliModel } = useLLMConfigs()
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined
  const cli = activeRunnerKind === 'cli' ? activeAgentRunCliModel : null
  return {
    defaultMode: projectWorkLaunchMode(
      project?.metadata as { workLaunchMode?: unknown } | undefined,
    ),
    chatRunner: activeRunnerKind,
    chatAgent: cli
      ? {
          runner: 'cli',
          cliTool: cli.cli,
          ...(cli.modelId ? { cliModel: cli.modelId } : {}),
          ...(cli.credentialId ? { cliCredentialId: cli.credentialId } : {}),
        }
      : { runner: 'api' },
  }
}
