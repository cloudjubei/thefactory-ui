import type { CliRun, CliRunTranscriptEntry } from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID } from './projects'

const AT = 1_761_386_400_000

const said = (text: string): CliRunTranscriptEntry => ({
  at: AT,
  kind: 'assistant',
  payload: { message: { content: [{ type: 'text', text }] } },
})

const called = (
  id: string,
  name: string,
  input: Record<string, unknown>,
): CliRunTranscriptEntry[] => [
  {
    at: AT,
    kind: 'assistant',
    payload: { message: { content: [{ type: 'tool_use', id, name, input }] } },
  },
  {
    at: AT,
    kind: 'tool-result',
    payload: {
      message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Read.' }] },
    },
  },
]

/** A finished CLI turn: a line, three tool calls in a row, then its reply. */
export const FAKE_CLI_RUN: CliRun = {
  id: 'cli-run-reads',
  projectId: FAKE_PROJECT_ID,
  status: 'succeeded',
  prompt: 'Where is the chat message list drawn?',
  policy: { network: 'none' },
  policyHistory: [],
  transcript: [
    said('Looking through the chat folder.'),
    ...called('c1', 'Read', { file_path: 'src/web/compound/chat/MessageList.tsx' }),
    ...called('c2', 'Grep', { pattern: 'ToolStepsFold' }),
    ...called('c3', 'Read', { file_path: 'src/web/compound/chat/CliRunMessages.tsx' }),
    said('The list is MessageList, and a CLI turn draws its rows in CliRunMessages.'),
  ],
  pendingActions: [],
  approvedActions: [],
  artifacts: [],
  createdAt: AT,
  updatedAt: AT,
}
