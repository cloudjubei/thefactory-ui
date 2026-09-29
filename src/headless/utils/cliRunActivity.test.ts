import { describe, expect, it } from 'vitest'
import {
  appendCliRunTranscript,
  blockedOnFromGrants,
  blockedToolNames,
  describeCliRunActivity,
  formatCliElapsed,
  lastCliActionAtMs,
  mergeCliRunTranscript,
  runningCliToolNames,
} from './cliRunActivity'
import {
  CLI_BLOCKED_SUBLABEL,
  CLI_BOOT_SUBLABEL,
  CLI_QUESTION_SUBLABEL,
} from './cliRunActivityConstants'
import type { CliRunActivityInput, CliRunBlockedOn } from './cliRunActivityTypes'
import type { CliRunTranscriptEntry } from '../api/generated'
import type { ChatMessageLike, PendingToolGrantData } from './chatTypes'

const entry = (
  at: number,
  kind: CliRunTranscriptEntry['kind'] = 'assistant',
): CliRunTranscriptEntry => ({
  at,
  kind,
  payload: undefined,
})

const toolMessage = (name: string, type: string): ChatMessageLike => ({
  role: 'tool',
  content: '',
  toolCall: { toolCallId: `${name}-1`, name },
  toolResult: { type },
})

const activityInput = (over: Partial<CliRunActivityInput> = {}): CliRunActivityInput => ({
  runningToolNames: [],
  booting: false,
  coldStart: false,
  sinceLastActionMs: 0,
  blocked: [],
  ...over,
})

describe('mergeCliRunTranscript', () => {
  it('keeps the live transcript when the fetched record is shorter', () => {
    const live = [entry(1), entry(2), entry(3)]
    expect(mergeCliRunTranscript(live, [])).toBe(live)
  })

  it('takes the fetched record when it has more entries', () => {
    const fetched = [entry(1), entry(2)]
    expect(mergeCliRunTranscript([entry(1)], fetched)).toBe(fetched)
  })

  it('prefers the fetched record at equal length so a terminal refetch reconciles', () => {
    const fetched = [entry(1)]
    expect(mergeCliRunTranscript([entry(1)], fetched)).toBe(fetched)
  })
})

describe('appendCliRunTranscript', () => {
  it('appends entries newer than the last held one', () => {
    expect(appendCliRunTranscript([entry(1)], [entry(2)])).toEqual([entry(1), entry(2)])
  })

  it('keeps an entry sharing the newest timestamp (same-millisecond bursts)', () => {
    expect(appendCliRunTranscript([entry(5)], [entry(5)])).toHaveLength(2)
  })

  it('drops an entry older than the newest held one', () => {
    const current = [entry(9)]
    expect(appendCliRunTranscript(current, [entry(4)])).toBe(current)
  })

  it('drops only the stale entries from a mixed batch', () => {
    expect(appendCliRunTranscript([entry(9)], [entry(4), entry(10)])).toEqual([entry(9), entry(10)])
  })

  it('returns the same array identity for an empty batch so no re-render is forced', () => {
    const current = [entry(1)]
    expect(appendCliRunTranscript(current, [])).toBe(current)
  })

  it('accepts any entry into an empty transcript', () => {
    expect(appendCliRunTranscript([], [entry(-5)])).toEqual([entry(-5)])
  })
})

describe('runningCliToolNames', () => {
  it('collects tool rows still in flight', () => {
    expect(runningCliToolNames([toolMessage('readPaths', 'running')])).toEqual(['readPaths'])
  })

  it('excludes a tool awaiting approval — it is blocked, not executing', () => {
    expect(
      runningCliToolNames([toolMessage('inspectProjectPath', 'require_confirmation')]),
    ).toEqual([])
  })

  it('excludes a completed tool', () => {
    expect(runningCliToolNames([toolMessage('readPaths', 'success')])).toEqual([])
  })

  it('ignores assistant messages', () => {
    expect(runningCliToolNames([{ role: 'assistant', content: 'hi' }])).toEqual([])
  })

  it('skips a running row with no tool name', () => {
    expect(
      runningCliToolNames([{ role: 'tool', content: '', toolResult: { type: 'running' } }]),
    ).toEqual([])
  })
})

describe('lastCliActionAtMs', () => {
  it('reads the newest transcript entry, not the run start', () => {
    expect(lastCliActionAtMs([entry(1_000), entry(4_000, 'tool-call')], 500)).toBe(4_000)
  })

  it('takes the latest timestamp even when entries arrive out of order', () => {
    expect(lastCliActionAtMs([entry(7_000), entry(6_000, 'tool-result')], 500)).toBe(7_000)
  })

  it('falls back to the run start while there is no transcript yet', () => {
    expect(lastCliActionAtMs([], 500)).toBe(500)
  })

  it('is unknown with neither a transcript nor a run start', () => {
    expect(lastCliActionAtMs([], undefined)).toBeUndefined()
  })
})

describe('blockedOnFromGrants', () => {
  const grant = (over: Partial<PendingToolGrantData> = {}): PendingToolGrantData => ({
    id: 'a1',
    source: 'cli',
    label: 'Inspect host path',
    ...over,
  })

  it('carries the tool name through when the action names one', () => {
    expect(blockedOnFromGrants([grant({ toolName: 'inspectProjectPath' })])).toEqual([
      { toolName: 'inspectProjectPath', label: 'Inspect host path' },
    ])
  })

  it('omits the tool name key when the action names none', () => {
    expect(blockedOnFromGrants([grant()])).toEqual([{ label: 'Inspect host path' }])
  })

  it('flags an askUser question', () => {
    const question = grant({ question: { question: 'Which branch?' } })
    expect(blockedOnFromGrants([question])[0].isQuestion).toBe(true)
  })

  it('returns nothing for an undefined feed', () => {
    expect(blockedOnFromGrants(undefined)).toEqual([])
  })
})

describe('blockedToolNames', () => {
  it('names the tools awaiting approval', () => {
    expect(blockedToolNames([{ toolName: 'cloneProjectFromGit', label: 'Clone' }])).toEqual([
      'cloneProjectFromGit',
    ])
  })

  it('excludes a question — there is no tool row to badge', () => {
    const blocked: CliRunBlockedOn[] = [
      { toolName: 'askUser', label: 'Question', isQuestion: true },
    ]
    expect(blockedToolNames(blocked)).toEqual([])
  })

  it('excludes an action that names no tool', () => {
    expect(blockedToolNames([{ label: 'Network unlock' }])).toEqual([])
  })
})

describe('formatCliElapsed', () => {
  it('renders whole seconds under a minute', () => {
    expect(formatCliElapsed(12_400)).toBe('12s')
  })

  it('renders minutes with zero-padded seconds beyond a minute', () => {
    expect(formatCliElapsed(65_000)).toBe('1m 05s')
  })

  it('reads as zero for a non-finite duration', () => {
    expect(formatCliElapsed(Number.NaN)).toBe('0s')
  })

  it('reads as zero for a negative duration', () => {
    expect(formatCliElapsed(-1)).toBe('0s')
  })
})

describe('describeCliRunActivity', () => {
  it('names the tool the run is blocked on', () => {
    const activity = describeCliRunActivity(
      activityInput({ blocked: [{ toolName: 'cloneProjectFromGit', label: 'Clone' }] }),
    )
    expect(activity).toEqual({
      tone: 'blocked',
      label: 'Waiting for your approval: cloneProjectFromGit',
      sublabel: CLI_BLOCKED_SUBLABEL,
    })
  })

  it('falls back to the action label when the blocked action names no tool', () => {
    const activity = describeCliRunActivity(
      activityInput({ blocked: [{ label: 'Network unlock' }] }),
    )
    expect(activity.label).toBe('Waiting for your approval: Network unlock')
  })

  it('asks for an answer rather than an approval for a question', () => {
    const activity = describeCliRunActivity(
      activityInput({ blocked: [{ label: 'Question', isQuestion: true }] }),
    )
    expect(activity).toEqual({
      tone: 'blocked',
      label: 'Waiting for your answer',
      sublabel: CLI_QUESTION_SUBLABEL,
    })
  })

  it('counts multiple blocking actions', () => {
    const activity = describeCliRunActivity(
      activityInput({ blocked: [{ label: 'A' }, { label: 'B' }] }),
    )
    expect(activity.label).toBe('Waiting for you on 2 actions')
  })

  it('uses the question sublabel when any of several blockers is a question', () => {
    const activity = describeCliRunActivity(
      activityInput({ blocked: [{ label: 'A' }, { label: 'B', isQuestion: true }] }),
    )
    expect(activity.sublabel).toBe(CLI_QUESTION_SUBLABEL)
  })

  it('blocks over a running tool — a parked run must not read as busy', () => {
    const activity = describeCliRunActivity(
      activityInput({
        runningToolNames: ['readPaths'],
        booting: true,
        coldStart: true,
        blocked: [{ toolName: 'inspectProjectPath', label: 'Inspect' }],
      }),
    )
    expect(activity.tone).toBe('blocked')
  })

  it('reassures about the cold start on the first run', () => {
    const activity = describeCliRunActivity(
      activityInput({ booting: true, coldStart: true, agentLabel: 'Claude Code' }),
    )
    expect(activity).toEqual({
      tone: 'booting',
      label: 'Preparing Claude Code…',
      sublabel: CLI_BOOT_SUBLABEL,
    })
  })

  it('names the agent generically when no label is known', () => {
    const activity = describeCliRunActivity(activityInput({ booting: true, coldStart: true }))
    expect(activity.label).toBe('Preparing the agent…')
  })

  it('does not claim a cold start on a warm turn', () => {
    const activity = describeCliRunActivity(
      activityInput({ booting: true, coldStart: false, agentLabel: 'Claude Code' }),
    )
    expect(activity).toEqual({ tone: 'booting', label: 'Starting the turn…' })
  })

  it('names a single running tool', () => {
    const activity = describeCliRunActivity(activityInput({ runningToolNames: ['readPaths'] }))
    expect(activity).toEqual({ tone: 'working', label: 'Running readPaths…' })
  })

  it('names the first of several running tools and counts the rest', () => {
    const activity = describeCliRunActivity(
      activityInput({ runningToolNames: ['readPaths', 'grepFiles', 'listStories'] }),
    )
    expect(activity.label).toBe('Running readPaths +2 more…')
  })

  it('falls back to a plain working line', () => {
    expect(describeCliRunActivity(activityInput()).label).toBe('Working…')
  })

  it('appends the time since the last action once a second has passed', () => {
    const activity = describeCliRunActivity(activityInput({ sinceLastActionMs: 65_000 }))
    expect(activity.label).toBe('Working… (1m 05s)')
  })

  it('times the running tool from the last action', () => {
    const activity = describeCliRunActivity(
      activityInput({ runningToolNames: ['readPaths'], sinceLastActionMs: 12_000 }),
    )
    expect(activity).toEqual({ tone: 'working', label: 'Running readPaths… (12s)' })
  })

  it('times the boot line too', () => {
    const activity = describeCliRunActivity(
      activityInput({ booting: true, coldStart: false, sinceLastActionMs: 3_000 }),
    )
    expect(activity.label).toBe('Starting the turn… (3s)')
  })

  it('suppresses the readout under a second so a fresh action never flashes zero', () => {
    const activity = describeCliRunActivity(activityInput({ sinceLastActionMs: 999 }))
    expect(activity.label).toBe('Working…')
  })

  it("drops the since-last-action readout while blocked — the clock is the user's, not the agent's", () => {
    // A ticking "(5s)" next to "Waiting for your approval" reads as the agent
    // still working against a clock, and the wait may legitimately be hours.
    // The suffix is agent-activity evidence; a parked run has none to show.
    const approval = describeCliRunActivity(
      activityInput({
        sinceLastActionMs: 5_000,
        blocked: [{ toolName: 'inspectProjectPath', label: 'x' }],
      }),
    )
    expect(approval.label).toBe('Waiting for your approval: inspectProjectPath')
    const question = describeCliRunActivity(
      activityInput({ sinceLastActionMs: 65_000, blocked: [{ label: 'q', isQuestion: true }] }),
    )
    expect(question.label).toBe('Waiting for your answer')
    const many = describeCliRunActivity(
      activityInput({
        sinceLastActionMs: 65_000,
        blocked: [
          { toolName: 'a', label: 'a' },
          { toolName: 'b', label: 'b' },
        ],
      }),
    )
    expect(many.label).toBe('Waiting for you on 2 actions')
  })
})
