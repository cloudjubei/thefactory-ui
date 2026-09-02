/**
 * Field-based identity checks for the two chats that must never be deleted:
 * a project's General chat and a group's General chat. FIELD-based, not
 * `type`-based, because chat storage paths are keyed off the fields — a
 * persisted context whose stamped `type` disagrees with its fields (observed:
 * an agent-run chat stamped 'PROJECT') would make a type guard refuse to
 * delete a chat that is not the General chat at all.
 */

/** The structural subset of ChatContext the guards need (generated API types are null-tolerant). */
export interface ChatContextFields {
  groupId?: string | null
  projectId?: string | null
  topicId?: string | null
  storyId?: string | null
  featureId?: string | null
  featureRequestId?: string | null
  agentRunId?: string | null
}

/** The project's General chat: a project id and nothing narrower. */
export function isGeneralProjectChat(ctx: ChatContextFields): boolean {
  return (
    !!ctx.projectId &&
    !ctx.groupId &&
    !ctx.topicId &&
    !ctx.storyId &&
    !ctx.featureId &&
    !ctx.featureRequestId &&
    !ctx.agentRunId
  )
}

/** The group's General chat: a group id and nothing narrower. */
export function isGeneralGroupChat(ctx: ChatContextFields): boolean {
  return !!ctx.groupId && !ctx.topicId
}
