import { useMemo } from 'react'
import { useChats } from "../../../headless"
import { useStories } from "../../../headless"
import { useActiveProject } from "../../../headless"
import { useProjectsGroups } from "../../../headless"
import { buildChatPromptVariables, interpolatePrompt } from "../../../headless"
import type { ChatContext } from "../../../headless/api"
import { SystemPromptViewerModal } from "../.."

export type SystemPromptViewerConnectedProps = {
  isOpen: boolean
  onClose: () => void
  context: ChatContext
}

/**
 * Web wrapper around the shared `SystemPromptViewerModal`. Pulls the
 * stored template off `ChatsContext.getEffectiveChatSettings` and
 * interpolates `{{project_title}}` / `{{story_title}}` / etc. with the
 * current project/story/feature so the modal shows what the agent will
 * actually receive — mirrors desktop's `effectivePrompt` flow.
 */
export default function SystemPromptViewerConnected({
  isOpen,
  onClose,
  context,
}: SystemPromptViewerConnectedProps) {
  const { getEffectiveChatSettings } = useChats()
  const { project } = useActiveProject()
  const { getStory, getFeature } = useStories()
  const { getGroupById } = useProjectsGroups()

  const prompt = useMemo(() => {
    if (!isOpen) return ''
    const template = getEffectiveChatSettings(context).systemPrompt ?? ''
    if (!template) return ''
    // Share the exact variable resolution the send path (`buildToolSettings`) uses, so the viewer can
    // never drift from what the agent actually receives.
    const vars = buildChatPromptVariables(context, { project, getStory, getFeature, getGroupById })
    return interpolatePrompt(template, vars)
  }, [isOpen, context, getEffectiveChatSettings, project, getStory, getFeature, getGroupById])

  if (!isOpen) return null
  return <SystemPromptViewerModal isOpen onClose={onClose} title="System Prompt" prompt={prompt} />
}
