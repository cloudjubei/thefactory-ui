import type { VideoInstallableTool } from 'thefactory-tools/types'
import type { ChatVideoDigest } from '../utils/videoAttachmentTypes'
import type {
  VideoSetupChat,
  VideoSetupState,
  VideoSetupStopTarget,
} from '../utils/videoSetupTypes'
import { client } from './generated/client.gen'
import { stopVideoSetupJob as sendVideoSetupStop, type ChatContext } from './generated'

/** How a chat's video stands. Written by hand until the SDK is generated from these routes. */
export async function readChatVideoDigest(
  context: ChatContext,
  path: string,
): Promise<ChatVideoDigest> {
  const { data } = await client.get({
    url: '/api/v1/chat-attachments/digest',
    query: { path, context: JSON.stringify(context) },
    throwOnError: true,
  })
  return data as ChatVideoDigest
}

export async function readVideoSetup(): Promise<VideoSetupState> {
  const { data } = await client.get({ url: '/api/v1/video/setup', throwOnError: true })
  return data as VideoSetupState
}

export async function installVideoSetupTool(tool: VideoInstallableTool): Promise<void> {
  await client.post({
    url: '/api/v1/video/setup/install',
    body: { tool },
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
}

export async function downloadVideoSetupModels(): Promise<void> {
  await client.post({ url: '/api/v1/video/setup/models', throwOnError: true })
}

/** `stopped` is false when that job was not running: nothing was done, and no report will come. */
export async function stopVideoSetupJob(
  target: VideoSetupStopTarget,
): Promise<{ stopped: boolean }> {
  const { data } = await sendVideoSetupStop({ body: target, throwOnError: true })
  return data
}

export async function openVideoSetupChat(): Promise<VideoSetupChat> {
  const { data } = await client.post({
    url: '/api/v1/video/setup/agent-chat',
    throwOnError: true,
  })
  return data as VideoSetupChat
}
