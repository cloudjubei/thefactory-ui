import { describe, expect, it } from 'vitest'
import type { ChatMessageLike } from './chatTypes'
import { TOOL_STEPS_LABEL } from './toolStepGroupsConstants'
import {
  foldedRowWindowStart,
  isFoldableToolStep,
  toolStepFoldKey,
  toolStepLayout,
  toolStepRowEnd,
  toolStepStartOf,
} from './toolStepGroups'

const tool = (name: string, extra: Partial<ChatMessageLike> = {}): ChatMessageLike => ({
  role: 'tool',
  content: '',
  toolCall: { toolCallId: name, name },
  toolResult: { type: 'success' },
  ...extra,
})

const person = (n: number): ChatMessageLike => ({ role: 'user', content: `ask ${n}` })
const reply = (n: number): ChatMessageLike => ({ role: 'assistant', content: `reply ${n}` })

describe('TOOL_STEPS_LABEL', () => {
  it('reads as N steps', () => {
    expect(TOOL_STEPS_LABEL(1)).toBe('1 step')
    expect(TOOL_STEPS_LABEL(4)).toBe('4 steps')
  })
})

describe('toolStepFoldKey', () => {
  it('differs between chats, so a fold opened in one is closed in the next', () => {
    expect(toolStepFoldKey('chat-a', 4)).not.toBe(toolStepFoldKey('chat-b', 4))
  })

  it('holds for one fold of one chat, and differs between folds of it', () => {
    expect(toolStepFoldKey('chat-a', 4)).toBe(toolStepFoldKey('chat-a', 4))
    expect(toolStepFoldKey('chat-a', 4)).not.toBe(toolStepFoldKey('chat-a', 9))
  })

  it('still numbers the folds of a list with no chat', () => {
    expect(toolStepFoldKey(undefined, 4)).not.toBe(toolStepFoldKey(undefined, 9))
  })
})

describe('isFoldableToolStep', () => {
  it('folds an ordinary tool call, including one named through MCP', () => {
    expect(isFoldableToolStep(tool('readPaths'))).toBe(true)
    expect(isFoldableToolStep(tool('mcp__thefactory__grepFiles'))).toBe(true)
  })

  it('reads a tool by its clean name, as the rest of the chat does', () => {
    expect(isFoldableToolStep(tool('mcp__thefactory__setupProjectGitRepo'))).toBe(false)
    expect(isFoldableToolStep(tool('thefactory-setupProjectGitRepo'))).toBe(false)
    expect(isFoldableToolStep(tool('thefactory__stopActivity'))).toBe(false)
  })

  it('keeps milestones, asks, run cards and card-rows', () => {
    expect(isFoldableToolStep(tool('commitGitChanges'))).toBe(false)
    expect(isFoldableToolStep(tool('setupProjectGitRepo'))).toBe(false)
    expect(isFoldableToolStep(tool('stopActivity'))).toBe(false)
    expect(isFoldableToolStep(tool('submitFeatureQuestionAnswer'))).toBe(false)
    expect(isFoldableToolStep(tool('mcp__thefactory__askUser'))).toBe(false)
    expect(isFoldableToolStep(tool('startFeatureWork'))).toBe(false)
    expect(isFoldableToolStep(tool('startGroupWork'))).toBe(false)
    expect(isFoldableToolStep(tool('sendChatMessage'))).toBe(false)
    expect(isFoldableToolStep(tool('showStoredSecret'))).toBe(false)
    expect(
      isFoldableToolStep(tool('writeFile', { toolResult: { type: 'require_confirmation' } })),
    ).toBe(false)
    expect(
      isFoldableToolStep(
        tool('readPaths', {
          toolCall: { toolCallId: 'w', name: 'readPaths', awaitingDecision: true },
        }),
      ),
    ).toBe(false)
    expect(isFoldableToolStep(tool('readPaths', { processRunId: 'run-1' }))).toBe(false)
    expect(isFoldableToolStep(tool('readPaths', { processGroupRunId: 'group-1' }))).toBe(false)
    expect(isFoldableToolStep(tool('readPaths', { answersHandoffFrom: 'manager' }))).toBe(false)
    expect(isFoldableToolStep(reply(0))).toBe(false)
  })
})

describe('toolStepLayout', () => {
  it('folds a run of tool calls into one line and leaves a single call alone', () => {
    const messages = [person(0), tool('readPaths'), tool('grepFiles'), tool('readFile'), reply(1)]
    const layout = toolStepLayout(messages)
    expect([...layout.starts.keys()]).toEqual([1])
    expect(layout.starts.get(1)).toEqual({ start: 1, end: 4 })
    expect([...layout.hidden]).toEqual([2, 3])

    const one = toolStepLayout([person(0), tool('readPaths'), reply(1)])
    expect(one.starts.size).toBe(0)
    expect(one.hidden.size).toBe(0)
  })

  it('keeps a milestone, an ask and a run card on their own rows, splitting the steps around them', () => {
    const runCard: ChatMessageLike = {
      role: 'assistant',
      content: 'Started',
      processRunId: 'run-1',
    }
    const messages = [
      tool('readPaths'),
      tool('grepFiles'),
      tool('commitGitChanges'),
      tool('writeFile', { toolResult: { type: 'require_confirmation' } }),
      tool('readFile'),
      runCard,
      tool('listContents'),
      tool('grepFile'),
    ]
    const layout = toolStepLayout(messages)
    expect([...layout.starts.keys()]).toEqual([0, 6])
    expect(layout.starts.get(0)).toEqual({ start: 0, end: 2 })
    expect(layout.starts.get(6)).toEqual({ start: 6, end: 8 })
    expect(layout.hidden.has(2)).toBe(false)
    expect(layout.hidden.has(3)).toBe(false)
    expect(layout.hidden.has(4)).toBe(false)
    expect(layout.hidden.has(5)).toBe(false)
  })

  it('does not fold a run that is still being written, and skips rows drawn as something else', () => {
    const live = [tool('readPaths'), tool('grepFiles')]
    expect(toolStepLayout(live, { openTail: true }).starts.size).toBe(0)
    expect(toolStepLayout([...live, reply(0)], { openTail: true }).starts.get(0)).toEqual({
      start: 0,
      end: 2,
    })

    const messages = [tool('readPaths'), tool('grepFiles'), tool('readFile'), tool('listContents')]
    const layout = toolStepLayout(messages, { skip: new Set([2]) })
    expect(layout.starts.get(0)).toEqual({ start: 0, end: 2 })
    expect(layout.hidden.has(1)).toBe(true)
    expect(layout.starts.has(3)).toBe(false)
    expect(layout.hidden.has(3)).toBe(false)
  })

  it('points a step inside a fold at the fold, and ends the row after its last step', () => {
    const messages = [person(0), tool('readPaths'), tool('grepFiles'), reply(1)]
    const layout = toolStepLayout(messages)
    expect(toolStepStartOf(layout, 2)).toBe(1)
    expect(toolStepStartOf(layout, 3)).toBe(3)
    expect(toolStepStartOf(layout, null)).toBeNull()
    expect(toolStepRowEnd(layout, 1)).toBe(3)
    expect(toolStepRowEnd(layout, 3)).toBe(4)
  })
})

describe('foldedRowWindowStart', () => {
  it('counts a fold as one row and opens at its first step', () => {
    const hidden = new Set([2, 3, 4])
    expect(foldedRowWindowStart(hidden, 8, 3)).toBe(5)
    expect(foldedRowWindowStart(hidden, 8, 4)).toBe(1)
    expect(foldedRowWindowStart(new Set(), 4, 50)).toBe(0)
    expect(foldedRowWindowStart(new Set(), 0, 50)).toBe(0)
  })
})
