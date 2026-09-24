import { describe, expect, it } from 'vitest'
import { ZERO_BADGE_COUNTS, computeBadgeCounts } from './useBadgeCountsCore'

describe('computeBadgeCounts — processes channel', () => {
  it('reports running and waiting root runs separately', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 2, waiting: 1 } })
    expect(out.processesRunning).toBe(2)
    expect(out.processesWaiting).toBe(1)
  })

  it('keeps a waiting-only scope from reading as running', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 0, waiting: 1 } })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(1)
  })

  it('zeroes both when the processes badge is turned off', () => {
    const out = computeBadgeCounts({
      chats: [],
      processes: { running: 3, waiting: 2 },
      enabled: { processes: false },
    })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(0)
  })

  it('zeroes both when no process input is given', () => {
    expect(computeBadgeCounts({ chats: [] })).toEqual(ZERO_BADGE_COUNTS)
  })

  it('does not let another channel toggle gate processes', () => {
    const out = computeBadgeCounts({
      chats: [{ unreadMessages: 2, isThinking: true }],
      processes: { running: 1, waiting: 1 },
      enabled: { chat: false, activity: false },
    })
    expect(out.chat).toBe(0)
    expect(out.chatThinking).toBe(false)
    expect(out.processesRunning).toBe(1)
    expect(out.processesWaiting).toBe(1)
  })
})
