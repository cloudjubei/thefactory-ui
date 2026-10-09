import { describe, expect, it } from 'vitest'
import {
  canAutoDispatch,
  chatDraftStorageKey,
  editPendingMessage,
  enqueueMessage,
  isComposerBlocked,
  isEmptyChatDraft,
  mergeOutgoing,
  parseChatDraft,
  pendingSendNowMode,
  pendingStackView,
  pendingTurnStep,
  removePendingMessage,
  restoreUnsent,
  serializeChatDraft,
  takeOutgoing,
  takePending,
} from './chatDraft'
import {
  PENDING_SEND_NOW_HINT,
  PENDING_STACK_TEXT,
  CHAT_DRAFT_MAX_AGE_MS,
  CHAT_DRAFT_STORAGE_PREFIX,
  EMPTY_CHAT_DRAFT,
} from './chatDraftConstants'
import type {
  ChatComposerBlockers,
  ChatDraft,
  PendingAutoDispatchInput,
  PendingChatMessage,
} from './chatDraftTypes'

const NOW = 1_800_000_000_000
const identity = (text: string) => text

function draft(patch: Partial<ChatDraft> = {}): ChatDraft {
  return { ...EMPTY_CHAT_DRAFT, ...patch }
}

function item(id: string, text: string, attachments: string[] = []): PendingChatMessage {
  return { id, text, attachments }
}

const NO_BLOCKERS: ChatComposerBlockers = {
  askShown: false,
  approvalShown: false,
  historyLocked: false,
  inputOverridden: false,
  inputHidden: false,
}

describe('chatDraftStorageKey', () => {
  it('namespaces the chat key', () => {
    expect(chatDraftStorageKey('/projects/p1')).toBe(`${CHAT_DRAFT_STORAGE_PREFIX}/projects/p1`)
  })
})

describe('isEmptyChatDraft', () => {
  it('is empty with nothing typed, attached or queued', () => {
    expect(isEmptyChatDraft(EMPTY_CHAT_DRAFT)).toBe(true)
  })

  it('treats whitespace-only text as empty', () => {
    expect(isEmptyChatDraft(draft({ text: '  \n ' }))).toBe(true)
  })

  it('is not empty with text, an attachment or a queued message', () => {
    expect(isEmptyChatDraft(draft({ text: 'hi' }))).toBe(false)
    expect(isEmptyChatDraft(draft({ attachments: ['a.png'] }))).toBe(false)
    expect(isEmptyChatDraft(draft({ pending: [item('1', 'x')] }))).toBe(false)
  })

  it('ignores the paused flag alone', () => {
    expect(isEmptyChatDraft(draft({ paused: true }))).toBe(true)
  })
})

describe('serializeChatDraft / parseChatDraft', () => {
  it('round-trips a full draft', () => {
    const full = draft({
      text: 'hello',
      attachments: ['.factory/attachments/x/a.png'],
      pending: [item('1', 'first', ['b.txt']), item('2', 'second')],
      paused: true,
    })
    const raw = serializeChatDraft(full, NOW)
    expect(raw).not.toBeNull()
    expect(parseChatDraft(raw, NOW)).toEqual(full)
  })

  it('serializes an empty draft as nothing, so its entry is removed', () => {
    expect(serializeChatDraft(draft({ text: '   ' }), NOW)).toBeNull()
  })

  it('reads nothing from a missing, blank or broken entry', () => {
    expect(parseChatDraft(null, NOW)).toBeNull()
    expect(parseChatDraft('', NOW)).toBeNull()
    expect(parseChatDraft('{not json', NOW)).toBeNull()
    expect(parseChatDraft('[]', NOW)).toBeNull()
    expect(parseChatDraft('"text"', NOW)).toBeNull()
  })

  it('drops a draft with no save time', () => {
    expect(parseChatDraft(JSON.stringify({ text: 'x' }), NOW)).toBeNull()
  })

  it('drops a draft older than the max age and keeps one just inside it', () => {
    const raw = serializeChatDraft(draft({ text: 'x' }), NOW)
    expect(parseChatDraft(raw, NOW + CHAT_DRAFT_MAX_AGE_MS + 1)).toBeNull()
    expect(parseChatDraft(raw, NOW + CHAT_DRAFT_MAX_AGE_MS)).toEqual(draft({ text: 'x' }))
  })

  it('keeps only well-formed fields from a hand-edited entry', () => {
    const raw = JSON.stringify({
      savedAt: NOW,
      text: 42,
      attachments: ['ok.txt', 7, null],
      pending: [
        { id: 'a', text: 'kept', attachments: ['p.png', {}] },
        { id: 'b', text: '', attachments: [] },
        { text: 'no id' },
        'junk',
      ],
      paused: 'yes',
    })
    expect(parseChatDraft(raw, NOW)).toEqual(
      draft({ text: '', attachments: ['ok.txt'], pending: [item('a', 'kept', ['p.png'])] }),
    )
  })

  it('reads a stored draft that sanitizes down to nothing as no draft', () => {
    expect(parseChatDraft(JSON.stringify({ savedAt: NOW, text: '  ' }), NOW)).toBeNull()
  })
})

describe('enqueueMessage', () => {
  it('moves the composer into the queue and clears it', () => {
    const next = enqueueMessage(draft({ text: 'typed', attachments: ['a.txt'] }), 'q1', {
      text: 'typed',
      attachments: ['a.txt'],
    })
    expect(next).toEqual(draft({ pending: [item('q1', 'typed', ['a.txt'])] }))
  })

  it('appends after messages already queued', () => {
    const next = enqueueMessage(draft({ pending: [item('q1', 'one')] }), 'q2', {
      text: 'two',
      attachments: [],
    })
    expect(next.pending.map((p) => p.id)).toEqual(['q1', 'q2'])
  })

  it('trims the queued text', () => {
    const next = enqueueMessage(draft(), 'q1', { text: '  spaced \n', attachments: [] })
    expect(next.pending[0].text).toBe('spaced')
  })

  it('queues an attachments-only message', () => {
    const next = enqueueMessage(draft(), 'q1', { text: '', attachments: ['a.png'] })
    expect(next.pending).toEqual([item('q1', '', ['a.png'])])
  })

  it('ignores an empty message', () => {
    const before = draft({ text: '  ', pending: [item('q1', 'one')] })
    expect(enqueueMessage(before, 'q2', { text: '  ', attachments: [] })).toBe(before)
  })

  it('keeps the queue paused when it was', () => {
    const next = enqueueMessage(draft({ paused: true }), 'q1', { text: 'x', attachments: [] })
    expect(next.paused).toBe(true)
  })

  it('de-duplicates the queued attachments', () => {
    const next = enqueueMessage(draft(), 'q1', { text: 'x', attachments: ['a', 'b', 'a'] })
    expect(next.pending[0].attachments).toEqual(['a', 'b'])
  })
})

describe('editPendingMessage', () => {
  it('moves the item back into an empty composer', () => {
    const next = editPendingMessage(
      draft({ pending: [item('q1', 'one', ['a.txt']), item('q2', 'two')] }),
      'q1',
    )
    expect(next).toEqual(
      draft({ text: 'one', attachments: ['a.txt'], pending: [item('q2', 'two')] }),
    )
  })

  it('appends to text already in the composer after a blank line', () => {
    const next = editPendingMessage(
      draft({
        text: 'current',
        attachments: ['c.txt'],
        pending: [item('q1', 'queued', ['q.txt'])],
      }),
      'q1',
    )
    expect(next.text).toBe('current\n\nqueued')
    expect(next.attachments).toEqual(['c.txt', 'q.txt'])
  })

  it('does not add a separator after whitespace-only composer text', () => {
    const next = editPendingMessage(draft({ text: '  ', pending: [item('q1', 'queued')] }), 'q1')
    expect(next.text).toBe('queued')
  })

  it('de-duplicates attachments shared by composer and item', () => {
    const next = editPendingMessage(
      draft({ attachments: ['a', 'b'], pending: [item('q1', 'x', ['b', 'c'])] }),
      'q1',
    )
    expect(next.attachments).toEqual(['a', 'b', 'c'])
  })

  it('leaves the draft alone for an unknown id', () => {
    const before = draft({ pending: [item('q1', 'one')] })
    expect(editPendingMessage(before, 'nope')).toBe(before)
  })

  it('un-pauses once the queue is emptied', () => {
    const next = editPendingMessage(draft({ paused: true, pending: [item('q1', 'one')] }), 'q1')
    expect(next.paused).toBe(false)
  })
})

describe('removePendingMessage', () => {
  it('drops just that item', () => {
    const next = removePendingMessage(
      draft({ text: 'keep', pending: [item('q1', 'one'), item('q2', 'two')] }),
      'q1',
    )
    expect(next).toEqual(draft({ text: 'keep', pending: [item('q2', 'two')] }))
  })

  it('leaves the draft alone for an unknown id', () => {
    const before = draft({ pending: [item('q1', 'one')] })
    expect(removePendingMessage(before, 'nope')).toBe(before)
  })

  it('un-pauses once the queue is emptied, and stays paused while items remain', () => {
    expect(
      removePendingMessage(draft({ paused: true, pending: [item('q1', 'one')] }), 'q1').paused,
    ).toBe(false)
    expect(
      removePendingMessage(
        draft({ paused: true, pending: [item('q1', 'one'), item('q2', 'two')] }),
        'q1',
      ).paused,
    ).toBe(true)
  })
})

describe('mergeOutgoing', () => {
  it('joins texts in order with a blank line', () => {
    expect(
      mergeOutgoing(
        [
          { text: 'first', attachments: [] },
          { text: 'second', attachments: [] },
          { text: 'third', attachments: [] },
        ],
        identity,
      ).text,
    ).toBe('first\n\nsecond\n\nthird')
  })

  it('skips empty texts but keeps their attachments', () => {
    expect(
      mergeOutgoing(
        [
          { text: 'a', attachments: ['1'] },
          { text: '   ', attachments: ['2'] },
          { text: 'b', attachments: [] },
        ],
        identity,
      ),
    ).toEqual({ text: 'a\n\nb', attachments: ['1', '2'] })
  })

  it('de-duplicates attachments, keeping first-seen order', () => {
    expect(
      mergeOutgoing(
        [
          { text: 'a', attachments: ['x', 'y'] },
          { text: 'b', attachments: ['y', 'z', 'x'] },
        ],
        identity,
      ).attachments,
    ).toEqual(['x', 'y', 'z'])
  })

  it('canonicalizes each item on its own', () => {
    const seen: string[] = []
    const canonicalize = (text: string) => {
      seen.push(text)
      return text.toUpperCase()
    }
    expect(
      mergeOutgoing(
        [
          { text: 'one', attachments: [] },
          { text: 'two', attachments: [] },
        ],
        canonicalize,
      ).text,
    ).toBe('ONE\n\nTWO')
    expect(seen).toEqual(['one', 'two'])
  })

  it('is empty for no items', () => {
    expect(mergeOutgoing([], identity)).toEqual({ text: '', attachments: [] })
  })
})

describe('takeOutgoing', () => {
  it('sends the queue first, then the composer, and clears everything', () => {
    const before = draft({
      text: 'composer',
      attachments: ['c'],
      pending: [item('q1', 'queued', ['q'])],
      paused: true,
    })
    const { message, rest, taken } = takeOutgoing(before, identity)
    expect(message).toEqual({ text: 'queued\n\ncomposer', attachments: ['q', 'c'] })
    expect(rest).toEqual(EMPTY_CHAT_DRAFT)
    expect(taken).toEqual({
      pending: [item('q1', 'queued', ['q'])],
      composer: { text: 'composer', attachments: ['c'] },
    })
  })

  it('takes no composer when it is empty', () => {
    const { taken, message } = takeOutgoing(draft({ pending: [item('q1', 'x')] }), identity)
    expect(taken.composer).toBeNull()
    expect(message.text).toBe('x')
  })
})

describe('takePending', () => {
  it('sends only the queue and leaves the composer as typed', () => {
    const before = draft({
      text: 'typing',
      attachments: ['c'],
      pending: [item('q1', 'a'), item('q2', 'b')],
    })
    const { message, rest, taken } = takePending(before, identity)
    expect(message).toEqual({ text: 'a\n\nb', attachments: [] })
    expect(rest).toEqual(draft({ text: 'typing', attachments: ['c'] }))
    expect(taken).toEqual({ pending: before.pending, composer: null })
  })
})

describe('restoreUnsent', () => {
  it('puts a failed composer send back in front of anything typed since', () => {
    const next = restoreUnsent(draft({ text: 'new', attachments: ['n'] }), {
      pending: [],
      composer: { text: 'failed', attachments: ['f'] },
    })
    expect(next.text).toBe('failed\n\nnew')
    expect(next.attachments).toEqual(['f', 'n'])
    expect(next.paused).toBe(false)
  })

  it('restores into an empty composer without a separator', () => {
    const next = restoreUnsent(draft(), {
      pending: [],
      composer: { text: 'failed', attachments: [] },
    })
    expect(next.text).toBe('failed')
  })

  it('puts failed queued items back at the front of the queue, paused', () => {
    const next = restoreUnsent(draft({ pending: [item('q3', 'later')] }), {
      pending: [item('q1', 'a'), item('q2', 'b')],
      composer: null,
    })
    expect(next.pending.map((p) => p.id)).toEqual(['q1', 'q2', 'q3'])
    expect(next.paused).toBe(true)
  })

  it('changes nothing when nothing was taken', () => {
    const before = draft({ text: 'x' })
    expect(restoreUnsent(before, { pending: [], composer: null })).toBe(before)
  })
})

describe('isComposerBlocked', () => {
  it('is free with no blockers', () => {
    expect(isComposerBlocked(NO_BLOCKERS)).toBe(false)
  })

  it.each(Object.keys(NO_BLOCKERS) as (keyof ChatComposerBlockers)[])('is blocked by %s', (key) => {
    expect(isComposerBlocked({ ...NO_BLOCKERS, [key]: true })).toBe(true)
  })
})

describe('canAutoDispatch', () => {
  const ready: PendingAutoDispatchInput = {
    pendingCount: 2,
    busy: false,
    paused: false,
    turnEnded: true,
    blockers: NO_BLOCKERS,
  }

  it('sends once a turn has ended with messages queued and the composer free', () => {
    expect(canAutoDispatch(ready)).toBe(true)
  })

  it('waits with nothing queued', () => {
    expect(canAutoDispatch({ ...ready, pendingCount: 0 })).toBe(false)
  })

  it('waits while the turn is still running', () => {
    expect(canAutoDispatch({ ...ready, busy: true })).toBe(false)
  })

  it('waits for the person when paused', () => {
    expect(canAutoDispatch({ ...ready, paused: true })).toBe(false)
  })

  it('does not send a queue no turn was seen ending for (e.g. restored after a reload)', () => {
    expect(canAutoDispatch({ ...ready, turnEnded: false })).toBe(false)
  })

  it.each(Object.keys(NO_BLOCKERS) as (keyof ChatComposerBlockers)[])('waits while %s', (key) => {
    expect(canAutoDispatch({ ...ready, blockers: { ...NO_BLOCKERS, [key]: true } })).toBe(false)
  })
})

describe('pendingSendNowMode', () => {
  it('queues behind the running turn in a CLI chat', () => {
    expect(pendingSendNowMode(true)).toBe('queued-behind-turn')
  })

  it('interrupts the running turn in an API chat', () => {
    expect(pendingSendNowMode(false)).toBe('interrupts-turn')
  })
})

describe('pendingTurnStep', () => {
  const idle = { wasBusy: false, turnEnded: false }
  const free = { failed: false, blocked: false, pendingCount: 1 }

  it('remembers a turn starting', () => {
    expect(pendingTurnStep(idle, { ...free, busy: true })).toEqual({
      wasBusy: true,
      turnEnded: false,
      pause: false,
    })
  })

  it('arms the queue when a running turn ends cleanly', () => {
    expect(pendingTurnStep({ wasBusy: true, turnEnded: false }, { ...free, busy: false })).toEqual({
      wasBusy: false,
      turnEnded: true,
      pause: false,
    })
  })

  it('pauses the queue when the turn ended in an error', () => {
    expect(
      pendingTurnStep({ wasBusy: true, turnEnded: false }, { ...free, busy: false, failed: true }),
    ).toEqual({ wasBusy: false, turnEnded: true, pause: true })
  })

  it('does not pause an empty queue on an error', () => {
    expect(
      pendingTurnStep(
        { wasBusy: true, turnEnded: false },
        { ...free, busy: false, failed: true, pendingCount: 0 },
      ).pause,
    ).toBe(false)
  })

  it('does not arm on an idle chat it never saw busy', () => {
    expect(pendingTurnStep(idle, { ...free, busy: false })).toEqual({ ...idle, pause: false })
  })

  it('disarms when the agent parks on an ask after the turn ended', () => {
    expect(
      pendingTurnStep({ wasBusy: false, turnEnded: true }, { ...free, busy: false, blocked: true }),
    ).toEqual({ wasBusy: false, turnEnded: false, pause: false })
  })

  it('arms a turn that ends straight into an ask only to disarm it, so the next turn end re-arms', () => {
    const ended = pendingTurnStep(
      { wasBusy: true, turnEnded: false },
      { ...free, busy: false, blocked: true },
    )
    expect(ended.turnEnded).toBe(false)
    const resumed = pendingTurnStep(ended, { ...free, busy: true, blocked: false })
    const finished = pendingTurnStep(resumed, { ...free, busy: false })
    expect(finished.turnEnded).toBe(true)
  })

  it('keeps an armed queue armed while nothing changes', () => {
    expect(
      pendingTurnStep({ wasBusy: false, turnEnded: true }, { ...free, busy: false }).turnEnded,
    ).toBe(true)
  })
})

describe('pendingStackView', () => {
  it('says the queue waits for the agent while a CLI turn runs, and that Send now queues behind it', () => {
    const view = pendingStackView({
      busy: true,
      paused: false,
      mode: 'queued-behind-turn',
      count: 2,
    })
    expect(view.status).toBe(PENDING_STACK_TEXT.waiting)
    expect(view.sendLabel).toBe(PENDING_STACK_TEXT.sendNow)
    expect(view.sendHint).toBe(PENDING_SEND_NOW_HINT['queued-behind-turn'])
    expect(view.title).toBe('2 pending')
  })

  it('warns that Send now interrupts a running API turn', () => {
    expect(
      pendingStackView({ busy: true, paused: false, mode: 'interrupts-turn', count: 1 }).sendHint,
    ).toBe(PENDING_SEND_NOW_HINT['interrupts-turn'])
  })

  it('shows a paused queue as waiting for the person, with a plain Send', () => {
    const view = pendingStackView({ busy: false, paused: true, mode: 'interrupts-turn', count: 1 })
    expect(view.status).toBe(PENDING_STACK_TEXT.paused)
    expect(view.sendLabel).toBe(PENDING_STACK_TEXT.send)
    expect(view.sendHint).toBe(PENDING_STACK_TEXT.sendIdleHint)
  })

  it('keeps the interrupt warning on a paused queue while a turn still runs', () => {
    const view = pendingStackView({ busy: true, paused: true, mode: 'interrupts-turn', count: 1 })
    expect(view.status).toBe(PENDING_STACK_TEXT.paused)
    expect(view.sendHint).toBe(PENDING_SEND_NOW_HINT['interrupts-turn'])
  })

  it('offers Send on an idle chat whose queue was restored', () => {
    const view = pendingStackView({
      busy: false,
      paused: false,
      mode: 'queued-behind-turn',
      count: 3,
    })
    expect(view.status).toBe(PENDING_STACK_TEXT.idle)
    expect(view.sendLabel).toBe(PENDING_STACK_TEXT.send)
    expect(view.title).toBe('3 pending')
  })
})
