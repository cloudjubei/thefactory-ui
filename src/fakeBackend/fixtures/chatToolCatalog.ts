import type { ListChatToolCatalogResponse } from '../../headless/api/generated/types.gen'
import type { FakeChatToolScope } from '../fakeBackendTypes'

type ChatToolRow = ListChatToolCatalogResponse[number]

const builtin = (name: string, category: string, description: string): ChatToolRow => ({
  name,
  description,
  category,
  alwaysOn: false,
  everyRunner: true,
})

const host = (name: string, category: string, description: string): ChatToolRow => ({
  name,
  description,
  category,
  alwaysOn: true,
  everyRunner: true,
})

const READ_PATHS = builtin('readPaths', 'files', 'Read files and folders in the project.')
const GIT_DIFF = builtin('gitDiff', 'git', 'Show what changed in the working copy.')

export const FAKE_TRANSPORT_TOOLS: Record<'api' | 'cli', ChatToolRow[]> = {
  api: [
    READ_PATHS,
    GIT_DIFF,
    builtin('writeFile', 'files', 'Write a file in the project.'),
    { ...builtin('webSearch', 'web', 'Search the web.'), everyRunner: false },
  ],
  cli: [
    READ_PATHS,
    GIT_DIFF,
    { ...builtin('spawnAgent', 'agents', 'Start a helper agent.'), everyRunner: false },
    { ...host('askUser', 'chat', 'Ask the person a question.'), everyRunner: false },
  ],
}

export const FAKE_CHAT_TOOLS_BY_SCOPE: Record<FakeChatToolScope, ChatToolRow[]> = {
  common: [
    host('askUser', 'chat', 'Ask the person a question.'),
    host('requestGitCredentials', 'credentials', 'Ask the person for git credentials.'),
    host('listToolCallSlips', 'diagnostics', 'List the tool calls agents got wrong.'),
  ],
  messaging: [
    host('listChatTargets', 'chat', 'List the chats this one can message.'),
    host('sendChatMessage', 'chat', 'Send a message to another chat.'),
  ],
  global: [
    host('createProject', 'projects', 'Add a project.'),
    builtin('startGroupWork', 'work', 'Start work across a group’s projects.'),
  ],
  group: [
    host('listGroupNotes', 'notes', 'List the notes the group keeps.'),
    host('readMemberProjectFile', 'files', 'Read a file in one of the group’s projects.'),
    builtin('startGroupWork', 'work', 'Start work across the group’s projects.'),
  ],
  project: [
    host('listProjectNotes', 'notes', 'List the project’s notes.'),
    host('readProjectNote', 'notes', 'Read one of the project’s notes.'),
    host('requestProjectFeature', 'work', 'Ask another project for a feature.'),
  ],
  work: [builtin('startFeatureWork', 'work', 'Start work on the features of a story.')],
  run: [
    host('readRunStanding', 'runs', 'Read where this run stands.'),
    host('proposeRunChange', 'runs', 'Propose a change to this run.'),
  ],
}
