import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({ listToolCallSlips: vi.fn(), getToolCallSlipStats: vi.fn() }))

import { getToolCallSlipStats, listToolCallSlips } from './generated'
import { dispatchToolCallsBridge, toolCallSlipQueryOf } from './toolCallsBridge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asMock = (fn: unknown) => fn as any

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dispatchToolCallsBridge', () => {
  it('lists the slips the app asked for', async () => {
    asMock(listToolCallSlips).mockResolvedValue({ data: [{ toolName: 'askKnowledge' }] })
    expect(
      await dispatchToolCallsBridge({
        type: 'overseer:toolCalls.slips',
        id: 'a',
        payload: { sinceDays: 30, toolName: 'askKnowledge', limit: 50 },
      }),
    ).toEqual([{ toolName: 'askKnowledge' }])
    expect(listToolCallSlips).toHaveBeenCalledWith({
      query: { sinceDays: 30, toolName: 'askKnowledge', limit: 50 },
      throwOnError: true,
    })
  })

  it('counts them per tool', async () => {
    asMock(getToolCallSlipStats).mockResolvedValue({ data: { total: 3 } })
    expect(
      await dispatchToolCallsBridge({
        type: 'overseer:toolCalls.stats',
        payload: { kind: 'failed' },
      }),
    ).toEqual({ total: 3 })
    expect(getToolCallSlipStats).toHaveBeenCalledWith({
      query: { kind: 'failed' },
      throwOnError: true,
    })
  })

  it("lifts the backend's message when the read fails", async () => {
    asMock(getToolCallSlipStats).mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 500, data: { error: 'store unreadable' } },
      }),
    )
    await expect(dispatchToolCallsBridge({ type: 'overseer:toolCalls.stats' })).rejects.toThrow(
      'store unreadable',
    )
  })

  it('passes other messages through', async () => {
    expect(await dispatchToolCallsBridge({ type: 'overseer:user.current' })).toBeUndefined()
    expect(listToolCallSlips).not.toHaveBeenCalled()
  })
})

describe('toolCallSlipQueryOf', () => {
  it('keeps each field only when it is of its own kind', () => {
    expect(
      toolCallSlipQueryOf({
        sinceDays: '7',
        toolName: '',
        kind: 'wrong',
        agent: 'codex',
        limit: 2.5,
        extra: true,
      }),
    ).toEqual({ agent: 'codex' })
  })

  it('reads no payload as no filter', () => {
    expect(toolCallSlipQueryOf(undefined)).toEqual({})
  })
})
