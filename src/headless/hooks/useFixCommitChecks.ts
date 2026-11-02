import { useCallback } from 'react'

import type { ChatContext } from 'thefactory-tools/types'
import { useChats } from '../contexts/createChatsContext'
import { useActiveProject } from '../contexts/ProjectsContext'
import { commitChecksFixBrief } from '../utils/commitChecksFix'
import { COMMIT_CHECKS_FIX_TOPIC_TITLE } from '../utils/commitChecksFixConstants'

/**
 * Start a chat that fixes the commit checks that stopped a commit: a new topic
 * in the active project, sent the brief. Its turns work in a copy of the
 * checkout that holds the staged files, and its change comes back to apply.
 * Resolves with the chat to open as soon as it exists — the brief is sent
 * without waiting for the reply, so a long first answer never holds the screen.
 */
export function useFixCommitChecks(): (input: {
  output: string
  stagedFiles: readonly string[]
  message: string
}) => Promise<ChatContext> {
  const { createProjectTopic, sendMessage } = useChats()
  const { projectId } = useActiveProject()
  return useCallback(
    async (input) => {
      if (!projectId) throw new Error('No active project')
      const chat = await createProjectTopic(projectId, COMMIT_CHECKS_FIX_TOPIC_TITLE)
      void sendMessage(chat.context, commitChecksFixBrief(input)).catch(() => {})
      return chat.context
    },
    [createProjectTopic, projectId, sendMessage],
  )
}
