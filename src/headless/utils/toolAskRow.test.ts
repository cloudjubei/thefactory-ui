import { describe, expect, it } from 'vitest'
import { RUN_PROPOSAL_STOP } from './runProposalViewConstants'
import { TOOL_ASK_COPY } from './toolAskCardConstants'
import { toolAskRowView } from './toolAskRow'

const commitCard = {
  operation: 'commit',
  headline: 'Commit 2 files to work',
  projectId: 'p1',
  repoPath: '/Users/me/repo',
  branch: 'work',
  warning: 'This changes your real repository at /Users/me/repo',
  facts: [],
}

describe('toolAskRowView', () => {
  it('reads a git change by the headline the host wrote on its card', () => {
    expect(
      toolAskRowView({
        label: 'commitGitChanges',
        toolName: 'commitGitChanges',
        args: { message: 'm' },
        detail: { tool: 'commitGitChanges', args: {}, detail: commitCard },
      }),
    ).toEqual({ headline: 'Commit 2 files to work', tone: 'ask' })
  })

  it('marks a git change that throws work away as one that cannot be undone', () => {
    expect(
      toolAskRowView({
        label: 'resetGitChanges',
        toolName: 'resetGitChanges',
        detail: {
          tool: 'resetGitChanges',
          detail: { ...commitCard, operation: 'reset', headline: 'Reset work', danger: true },
        },
      }),
    ).toEqual({ headline: 'Reset work', tone: 'danger', tag: TOOL_ASK_COPY.cannotUndo })
  })

  it('reads a run action by the run it acts on', () => {
    expect(
      toolAskRowView({
        label: 'stopProcessRun',
        toolName: 'stopProcessRun',
        args: { runId: 'r1' },
        detail: { tool: 'stopProcessRun', args: {}, detail: { runTitle: 'Read PDFs' } },
      })?.headline,
    ).toBe('Read PDFs')
    expect(toolAskRowView({ label: 'stopProcessRun', toolName: 'stopProcessRun' })?.headline).toBe(
      RUN_PROPOSAL_STOP.untitled,
    )
  })

  it('reads stopping an activity as a stop that cannot be undone', () => {
    expect(
      toolAskRowView({
        label: 'stopActivity',
        toolName: 'stopActivity',
        args: { activityId: 'act-123456789' },
      }),
    ).toMatchObject({ tone: 'danger', tag: TOOL_ASK_COPY.cannotUndo })
  })

  it('reads putting a project on GitHub by its plan', () => {
    expect(
      toolAskRowView({
        label: 'setupProjectGitRepo',
        toolName: 'setupProjectGitRepo',
        args: { repoName: 'demo' },
      }),
    ).toEqual({ headline: 'Put this project on GitHub', tone: 'ask' })
  })

  it('reads a host file read by the path it opens', () => {
    expect(
      toolAskRowView({
        label: 'requestHostFileRead',
        toolName: 'requestHostFileRead',
        args: { path: '~/notes.txt' },
        detail: {
          tool: 'requestHostFileRead',
          args: { path: '~/notes.txt' },
          detail: { path: '/Users/me/notes.txt', size: '2 KB' },
        },
      }),
    ).toEqual({ headline: 'Read /Users/me/notes.txt', tone: 'ask' })
  })

  it('reads a sandbox ask by the host it opens', () => {
    expect(
      toolAskRowView({
        label: 'requestNetworkUnlock',
        toolName: 'requestNetworkUnlock',
        args: { host: 'registry.npmjs.org' },
      }),
    ).toEqual({ headline: 'Open registry.npmjs.org to the sandbox', tone: 'ask' })
  })

  it('reads a delete by the sentence the host wrote, as one that cannot be undone', () => {
    expect(
      toolAskRowView({
        label: 'deleteDesignApp',
        toolName: 'deleteDesignApp',
        detail: { tool: 'deleteDesignApp', detail: "Delete the app 'Viewer' (3 screens)" },
      }),
    ).toEqual({
      headline: "Delete the app 'Viewer' (3 screens)",
      tone: 'danger',
      tag: TOOL_ASK_COPY.cannotUndo,
    })
  })

  it('reads any other tool by the sentence the host wrote for it', () => {
    expect(
      toolAskRowView({
        label: 'applyDesignTidy',
        toolName: 'applyDesignTidy',
        detail: { tool: 'applyDesignTidy', detail: 'Apply 2 accepted moves of the tidy-up plan' },
      }),
    ).toEqual({ headline: 'Apply 2 accepted moves of the tidy-up plan', tone: 'ask' })
  })

  it('adds nothing to an ordinary call the host wrote no sentence for', () => {
    expect(
      toolAskRowView({
        label: 'addStory',
        toolName: 'addStory',
        args: { title: 'T' },
        detail: { tool: 'addStory', args: { title: 'T' } },
      }),
    ).toBeUndefined()
    expect(toolAskRowView({ label: 'Network unlock' })).toBeUndefined()
  })

  it('reads a git change whose card did not come as the card any tool shares', () => {
    expect(
      toolAskRowView({
        label: 'commitGitChanges',
        toolName: 'commitGitChanges',
        detail: { tool: 'commitGitChanges', detail: 'Commit 1 file' },
      }),
    ).toEqual({ headline: 'Commit 1 file', tone: 'ask' })
  })
})
