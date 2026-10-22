import { parseResourceLink } from 'thefactory-tools/utils'
import type { ResourceLink } from 'thefactory-tools/types'

import {
  chatTitleFromContextId,
  type SendChatMessageView,
} from '../../../headless/utils/sendChatMessageView'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import SendChatMessagePreview, { type SendChatMessagePreviewProps } from './SendChatMessagePreview'

export type SendChatMessageCardProps = {
  view: SendChatMessageView
  /** The source chat's name as the host knows it — the chat the ask was raised in. */
  sourceChatTitle?: string
  /** Route the card's `overseer://projects/<id>` link. Omitted ⇒ the target is plain text. */
  onResourceLink?: (link: ResourceLink) => void
} & Pick<SendChatMessagePreviewProps, 'defaultExpanded' | 'defaultRawOpen'>

type ProjectNames = {
  project: (projectId: string | undefined) => { title?: string; iconKey?: string } | undefined
  title: (projectId: string) => string | undefined
}

/** Project titles and icons from the loaded projects, when there are any. */
function useProjectNames(): ProjectNames {
  const projects = useProjectsOptional()?.projects
  const project: ProjectNames['project'] = (projectId) => {
    const found = projectId ? projects?.find((p) => p.id === projectId) : undefined
    if (!found) return undefined
    const icon = (found as { metadata?: { icon?: unknown } }).metadata?.icon
    return {
      ...(found.title ? { title: found.title } : {}),
      ...(typeof icon === 'string' ? { iconKey: icon } : {}),
    }
  }
  return { project, title: (projectId) => project(projectId)?.title }
}

/**
 * {@link SendChatMessagePreview} filled in from what the app knows: the target
 * project's title and icon, the source and target chats named from their ids
 * when the payload left the names out, and the target link routed through the
 * host's `onResourceLink`.
 */
export default function SendChatMessageCard({
  view,
  sourceChatTitle,
  onResourceLink,
  ...defaults
}: SendChatMessageCardProps) {
  const names = useProjectNames()
  const project = names.project(view.target.projectId)
  const source =
    view.source.chatTitle ??
    sourceChatTitle ??
    chatTitleFromContextId(view.source.chatContextId, names.title)
  const targetChatTitle =
    view.target.chatTitle ?? chatTitleFromContextId(view.target.chatContextId, names.title)
  const parsed = view.link && onResourceLink ? parseResourceLink(view.link) : undefined
  return (
    <SendChatMessagePreview
      view={
        targetChatTitle ? { ...view, target: { ...view.target, chatTitle: targetChatTitle } } : view
      }
      {...(project ? { project } : {})}
      {...(source ? { sourceChatTitle: source } : {})}
      {...(parsed && onResourceLink ? { onOpenTarget: () => onResourceLink(parsed) } : {})}
      {...defaults}
    />
  )
}
