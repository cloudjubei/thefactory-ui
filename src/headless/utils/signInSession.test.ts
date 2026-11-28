import { describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'
import {
  signInBrowserApi,
  signInBrowserSessionOf,
  signInEndedNotice,
  signInSessionChangeOf,
  signInSessionView,
} from './signInSession'
import {
  SIGN_IN_BROWSER_CONTEXT,
  SIGN_IN_SESSION_TEXT as TEXT,
  SIGN_IN_STREAM_SCOPE,
} from './signInSessionConstants'
import type { SignInSessionsApi } from './signInSessionTypes'

const PAGE: SignInSessionState = {
  id: 's1',
  kind: 'recording-site',
  subject: 'loom',
  title: 'Sign in to Loom',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-26T10:00:00.000Z',
  expiresAt: '2026-11-26T10:15:00.000Z',
}
const PROMPT: SignInSessionState = {
  ...PAGE,
  id: 's2',
  kind: 'cli',
  subject: 'some-tool',
  title: 'Sign in to Some Tool',
  surface: {
    kind: 'prompt',
    message: 'Open the link, then paste the code.',
    url: 'https://auth.example/device',
    input: { label: 'Code', secret: true },
  },
}

describe('signInSessionChangeOf', () => {
  it('reads the session an event tells, a page’s and a prompt’s', () => {
    expect(signInSessionChangeOf({ session: PAGE })).toEqual(PAGE)
    expect(signInSessionChangeOf({ session: PROMPT })).toEqual(PROMPT)
    expect(signInSessionChangeOf({ session: { ...PAGE, status: 'failed', error: 'why' } })).toEqual(
      { ...PAGE, status: 'failed', error: 'why' },
    )
  })

  it('reads a prompt’s code to copy', () => {
    const told = {
      ...PROMPT,
      surface: { kind: 'prompt' as const, url: 'https://a.example', code: 'AB-12' },
    }
    expect(signInSessionChangeOf({ session: told })).toEqual(told)
    expect(
      signInSessionChangeOf({ session: { ...PROMPT, surface: { kind: 'prompt', code: 7 } } })
        ?.surface,
    ).toEqual({ kind: 'prompt' })
  })

  it('reads a prompt with nothing shown yet', () => {
    expect(signInSessionChangeOf({ session: { ...PROMPT, surface: { kind: 'prompt' } } })).toEqual({
      ...PROMPT,
      surface: { kind: 'prompt' },
    })
  })

  it('keeps only what a session carries', () => {
    const told = {
      session: { ...PROMPT, extra: 1, surface: { ...PROMPT.surface, typed: 'secret' } },
    }
    expect(signInSessionChangeOf(told)).toEqual(PROMPT)
  })

  it.each([
    ['nothing', undefined],
    ['no session', {}],
    ['a session that is no object', { session: 'x' }],
    ['no id', { session: { ...PAGE, id: '' } }],
    ['no title', { session: { ...PAGE, title: 4 } }],
    ['an unknown status', { session: { ...PAGE, status: 'paused' } }],
    ['no surface', { session: { ...PAGE, surface: undefined } }],
    ['an unknown surface', { session: { ...PAGE, surface: { kind: 'hologram' } } }],
    ['no kind', { session: { ...PAGE, kind: undefined } }],
    ['no subject', { session: { ...PAGE, subject: undefined } }],
  ])('reads %s as no session', (_what, data) => {
    expect(signInSessionChangeOf(data)).toBeUndefined()
  })
})

describe('signInBrowserSessionOf', () => {
  it('is the session’s page as the remote browser lists a browser of the person’s', () => {
    expect(signInBrowserSessionOf(PAGE)).toEqual({
      sessionId: 's1',
      url: '',
      title: 'Sign in to Loom',
      holder: { kind: 'person' },
      createdAt: Date.parse(PAGE.startedAt),
    })
  })
})

function fakeApi(): SignInSessionsApi {
  return {
    list: vi.fn(async () => []),
    close: vi.fn(async () => {}),
    input: vi.fn(async (id) => ({ sessionId: id, ok: true, url: 'u', title: 't' })),
    resize: vi.fn(async (id) => ({ sessionId: id, ok: true, url: 'u', title: 't' })),
    answer: vi.fn(async () => {}),
  }
}

describe('signInBrowserApi', () => {
  it('lists the one page, and sends input, size and closing to the session’s own routes', async () => {
    const api = fakeApi()
    const browser = signInBrowserApi(PAGE, api)
    expect(await browser.list(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT)).toEqual([
      signInBrowserSessionOf(PAGE),
    ])
    await browser.input(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1', {
      kind: 'text',
      text: 'a',
    })
    expect(api.input).toHaveBeenCalledWith('s1', { kind: 'text', text: 'a' })
    await browser.resize(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1', {
      width: 390,
      height: 700,
    })
    expect(api.resize).toHaveBeenCalledWith('s1', { width: 390, height: 700 })
    await browser.close(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1')
    expect(api.close).toHaveBeenCalledWith('s1')
  })

  it('opens no other page, and takes no picks or marks', async () => {
    const browser = signInBrowserApi(PAGE, fakeApi())
    await expect(
      browser.open(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, { url: 'https://x.example' }),
    ).rejects.toThrow(TEXT.onlyThisPage)
    await expect(
      browser.pick(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1', { x: 1, y: 1 }),
    ).rejects.toThrow(TEXT.onlyThisPage)
    await expect(
      browser.mark(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1', {
        x: 1,
        y: 1,
        width: 9,
        height: 9,
      }),
    ).rejects.toThrow(TEXT.onlyThisPage)
  })
})

describe('signInBrowserApi input order', () => {
  const key = (text: string) => ({ kind: 'text' as const, text })
  const send = (
    browser: ReturnType<typeof signInBrowserApi>,
    input: Parameters<SignInSessionsApi['input']>[1],
  ) => browser.input(SIGN_IN_STREAM_SCOPE, SIGN_IN_BROWSER_CONTEXT, 's1', input)

  function slowApi() {
    const api = fakeApi()
    const waiting: Array<() => void> = []
    const sent: unknown[] = []
    api.input = vi.fn(async (id, input) => {
      sent.push(input)
      await new Promise<void>((resolve) => waiting.push(resolve))
      return { sessionId: id, ok: true, url: 'u', title: 't' }
    })
    const settle = async () => {
      await Promise.resolve()
      await Promise.resolve()
    }
    return { api, sent, release: () => waiting.shift()?.(), settle }
  }

  it('sends one input at a time, in the order typed, so a password arrives as typed', async () => {
    const { api, sent, release, settle } = slowApi()
    const browser = signInBrowserApi(PAGE, api)
    const first = send(browser, key('p'))
    const enter = send(browser, { kind: 'key', key: 'Enter' })
    const click = send(browser, { kind: 'click', x: 1, y: 2 })
    await settle()
    expect(sent).toEqual([key('p')])
    release()
    await first
    await settle()
    expect(sent).toEqual([key('p'), { kind: 'key', key: 'Enter' }])
    release()
    await enter
    await settle()
    expect(sent).toHaveLength(3)
    release()
    expect((await click).ok).toBe(true)
  })

  it('sends the letters typed while one is on its way together, in order, each answered', async () => {
    const { api, sent, release, settle } = slowApi()
    const browser = signInBrowserApi(PAGE, api)
    const typed = ['h', 'u', 'n', 't', 'e', 'r'].map((letter) => send(browser, key(letter)))
    const enter = send(browser, { kind: 'key', key: 'Enter' })
    const after = send(browser, key('2'))
    await settle()
    expect(sent).toEqual([key('h')])
    release()
    await settle()
    expect(sent).toEqual([key('h'), key('unter')])
    release()
    await settle()
    release()
    await settle()
    release()
    const results = await Promise.all([...typed, enter, after])
    expect(results.every((result) => result.ok)).toBe(true)
    expect(sent).toEqual([key('h'), key('unter'), { kind: 'key', key: 'Enter' }, key('2')])
  })

  it('carries on after an input the backend refused, which alone hears of it', async () => {
    const api = fakeApi()
    api.input = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ sessionId: 's1', ok: true, url: 'u', title: 't' })
    const browser = signInBrowserApi(PAGE, api)
    const lost = send(browser, key('a'))
    const kept = send(browser, { kind: 'key', key: 'Tab' })
    await expect(lost).rejects.toThrow('offline')
    expect((await kept).ok).toBe(true)
  })
})

describe('signInEndedNotice', () => {
  it('says why a sign-in that did not finish ended, and nothing for one that did or was closed by hand', () => {
    expect(signInEndedNotice({ ...PAGE, status: 'timed-out' })).toBe(TEXT.timedOut)
    expect(signInEndedNotice({ ...PAGE, status: 'failed', error: 'The browser closed.' })).toBe(
      'The browser closed.',
    )
    expect(signInEndedNotice({ ...PAGE, status: 'failed' })).toBe(TEXT.failed)
    expect(signInEndedNotice({ ...PAGE, status: 'finished' })).toBeUndefined()
    expect(signInEndedNotice({ ...PAGE, status: 'closed' })).toBeUndefined()
    expect(signInEndedNotice(PAGE)).toBeUndefined()
  })
})

describe('signInSessionView', () => {
  it('shows nothing while no session is shown', () => {
    expect(
      signInSessionView({ shown: undefined, answering: false, error: undefined }),
    ).toBeUndefined()
  })

  it('shows a page’s session as a live page', () => {
    expect(signInSessionView({ shown: PAGE, answering: false, error: undefined })).toEqual({
      id: 's1',
      title: 'Sign in to Loom',
      hint: TEXT.closesItself,
      surface: 'browser',
    })
  })

  it('shows a prompt’s message, its page beside it and its field, busy while an answer is on its way', () => {
    expect(signInSessionView({ shown: PROMPT, answering: true, error: 'Wrong code.' })).toEqual({
      id: 's2',
      title: 'Sign in to Some Tool',
      hint: TEXT.closesItself,
      surface: 'prompt',
      message: 'Open the link, then paste the code.',
      page: true,
      address: 'https://auth.example/device',
      input: { label: 'Code', secret: true },
      answering: true,
      error: 'Wrong code.',
    })
  })

  it('shows a prompt with nothing yet as waiting', () => {
    expect(
      signInSessionView({
        shown: { ...PROMPT, surface: { kind: 'prompt' } },
        answering: false,
        error: undefined,
      }),
    ).toEqual({
      id: 's2',
      title: 'Sign in to Some Tool',
      hint: TEXT.closesItself,
      surface: 'prompt',
      message: TEXT.starting,
      answering: false,
    })
  })

  it('shows a page only for a web address', () => {
    const shown: SignInSessionState = {
      ...PROMPT,
      surface: { kind: 'prompt', url: 'javascript:alert(1)' },
    }
    const view = signInSessionView({ shown, answering: false, error: undefined })
    expect(view?.page).toBeUndefined()
    expect(view?.address).toBeUndefined()
  })

  it('shows a code to copy onto the page', () => {
    const shown: SignInSessionState = {
      ...PROMPT,
      surface: {
        kind: 'prompt',
        message: 'Enter this code there.',
        url: 'https://auth.example/device',
        code: 'WDJB-MJHT',
      },
    }
    expect(signInSessionView({ shown, answering: false, error: undefined })).toEqual({
      id: 's2',
      title: 'Sign in to Some Tool',
      hint: TEXT.closesItself,
      surface: 'prompt',
      message: 'Enter this code there.',
      page: true,
      address: 'https://auth.example/device',
      code: 'WDJB-MJHT',
      answering: false,
    })
  })
})
