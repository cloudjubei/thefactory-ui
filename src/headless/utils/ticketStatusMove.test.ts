import { describe, expect, it } from 'vitest'
import { isTicketStatusMoveTool, ticketStatusMoveView } from './ticketStatusMove'
import { TICKET_STATUS_MOVE_OUTCOME, TICKET_STATUS_MOVE_TEXT } from './ticketStatusMoveConstants'

const URL = 'https://acme.atlassian.net/browse/ZNR-780'
const ARGS = { issueKey: 'ZNR-780', transition: 'Done' }
const RESULT = {
  key: 'ZNR-780',
  id: '10042',
  summary: 'Sign-in loops on expired sessions',
  url: URL,
  from: { status: 'In Review', statusCategory: 'indeterminate' },
  to: { status: 'Done', statusCategory: 'done' },
  transition: 'Finish',
}

describe('isTicketStatusMoveTool', () => {
  it.each([
    ['transitionJiraIssue', true],
    ['mcp__thefactory__transitionJiraIssue', true],
    ['TransitionJiraIssue', false],
    ['listJiraTransitions', false],
    ['transitionJiraIssueLater', false],
    [undefined, false],
  ])('%s → %s', (name, expected) => {
    expect(isTicketStatusMoveTool(name)).toBe(expected)
  })
})

describe('ticketStatusMoveView', () => {
  it('shows a finished move as the ticket and the statuses it moved between', () => {
    expect(ticketStatusMoveView({ args: ARGS, result: RESULT, resultType: 'success' })).toEqual({
      key: 'ZNR-780',
      url: URL,
      title: 'Sign-in loops on expired sessions',
      from: { label: 'In Review', tone: 'progress' },
      to: { label: 'Done', tone: 'done' },
      outcome: 'moved',
      note: TICKET_STATUS_MOVE_OUTCOME.moved,
      line: 'In Review → Done',
    })
  })

  it('names the ticket by the key Jira answered, over the one the agent wrote', () => {
    const view = ticketStatusMoveView({
      args: { issueKey: 'znr-780', transition: 'done' },
      result: RESULT,
      resultType: 'success',
    })
    expect(view.key).toBe('ZNR-780')
    expect(view.to).toEqual({ label: 'Done', tone: 'done' })
  })

  it('shows the comment that went with the move', () => {
    const view = ticketStatusMoveView({
      args: { ...ARGS, comment: '  Shipped in 4.2  ' },
      result: RESULT,
      resultType: 'success',
    })
    expect(view.comment).toBe('Shipped in 4.2')
  })

  it('shows where it went alone when Jira could not say where it was', () => {
    const { from: _from, summary: _summary, ...partial } = RESULT
    const view = ticketStatusMoveView({ args: ARGS, result: partial, resultType: 'success' })
    expect(view.from).toBeUndefined()
    expect(view.title).toBeUndefined()
    expect(view.to).toEqual({ label: 'Done', tone: 'done' })
    expect(view.line).toBe(`→ Done`)
  })

  it.each([
    ['the old answer', { ok: true }],
    ['no answer at all', undefined],
    ['an answer that is text', 'ok'],
    ['an answer that is a list', [RESULT]],
  ])('keeps an older row with %s: the key and the target the agent asked for', (_name, result) => {
    expect(ticketStatusMoveView({ args: ARGS, result, resultType: 'success' })).toEqual({
      key: 'ZNR-780',
      to: { label: 'Done', tone: 'unknown' },
      outcome: 'moved',
      note: TICKET_STATUS_MOVE_OUTCOME.moved,
      line: '→ Done',
    })
  })

  it('names a target that is a transition id as one', () => {
    const view = ticketStatusMoveView({
      args: { issueKey: 'ZNR-780', transition: '31' },
      resultType: 'success',
    })
    expect(view.to).toEqual({ label: TICKET_STATUS_MOVE_TEXT.transitionId('31'), tone: 'unknown' })
  })

  it('shows an ask as the key and the target, nothing having moved', () => {
    expect(ticketStatusMoveView({ args: ARGS, resultType: 'require_confirmation' })).toEqual({
      key: 'ZNR-780',
      to: { label: 'Done', tone: 'unknown' },
      outcome: 'asking',
      note: TICKET_STATUS_MOVE_OUTCOME.asking,
      line: '→ Done',
    })
  })

  it.each([[undefined], ['pending']])(
    'reads a call with result type %s as asking',
    (resultType) => {
      expect(
        ticketStatusMoveView({ args: ARGS, ...(resultType ? { resultType } : {}) }).outcome,
      ).toBe('asking')
    },
  )

  it('fills an ask in from the ticket’s preview once it is read: title, link and where it stands', () => {
    const view = ticketStatusMoveView({
      args: ARGS,
      resultType: 'require_confirmation',
      preview: {
        key: 'ZNR-780',
        summary: 'Sign-in loops on expired sessions',
        url: URL,
        status: 'In Review',
        statusCategory: 'indeterminate',
      },
    })
    expect(view).toMatchObject({
      url: URL,
      title: 'Sign-in loops on expired sessions',
      from: { label: 'In Review', tone: 'progress' },
      to: { label: 'Done', tone: 'unknown' },
      line: 'In Review → Done',
    })
  })

  it('links an ask to the ticket on the chat’s Jira site before any preview is read', () => {
    const view = ticketStatusMoveView({
      args: ARGS,
      resultType: 'require_confirmation',
      siteUrl: 'https://acme.atlassian.net',
    })
    expect(view.url).toBe(URL)
  })

  it('links nothing for a key that is not a key', () => {
    const view = ticketStatusMoveView({
      args: { issueKey: '../admin', transition: 'Done' },
      resultType: 'require_confirmation',
      siteUrl: 'https://acme.atlassian.net',
    })
    expect(view.url).toBeUndefined()
    expect(view.key).toBe('../admin')
  })

  it('shows a running move as moving', () => {
    const view = ticketStatusMoveView({ args: ARGS, resultType: 'running' })
    expect(view.outcome).toBe('moving')
    expect(view.note).toBe(TICKET_STATUS_MOVE_OUTCOME.moving)
    expect(view.to).toEqual({ label: 'Done', tone: 'unknown' })
  })

  it.each([
    ['an errored call', 'errored', 'Jira said no'],
    ['an errored call with a message', 'errored', { message: 'Jira said no' }],
    ['a refusal answered as a result', 'success', { error: 'Jira said no' }],
    ['a refusal while still shown as waiting', 'require_confirmation', { error: 'Jira said no' }],
  ])('shows %s as the error alone, no statuses', (_name, resultType, result) => {
    expect(
      ticketStatusMoveView({
        args: { ...ARGS, comment: 'Shipped' },
        result,
        resultType,
        preview: { key: 'ZNR-780', summary: 'Title', url: URL, status: 'In Review' },
      }),
    ).toEqual({
      key: 'ZNR-780',
      url: URL,
      title: 'Title',
      outcome: 'failed',
      note: TICKET_STATUS_MOVE_OUTCOME.failed,
      error: 'Jira said no',
    })
  })

  it('shows a failure with no words as not moved', () => {
    expect(ticketStatusMoveView({ args: ARGS, resultType: 'errored' })).toEqual({
      key: 'ZNR-780',
      outcome: 'failed',
      note: TICKET_STATUS_MOVE_OUTCOME.failed,
    })
  })

  it('never shows statuses from an answer that also carries an error', () => {
    const view = ticketStatusMoveView({
      args: ARGS,
      result: { ...RESULT, error: 'Transition refused' },
      resultType: 'success',
    })
    expect(view.from).toBeUndefined()
    expect(view.to).toBeUndefined()
    expect(view.line).toBeUndefined()
    expect(view.error).toBe('Transition refused')
  })

  it('shows a declined move with the reason given', () => {
    expect(
      ticketStatusMoveView({ args: ARGS, resultType: 'not_allowed', result: 'Not yet' }),
    ).toEqual({
      key: 'ZNR-780',
      outcome: 'declined',
      note: TICKET_STATUS_MOVE_OUTCOME.declined,
      error: 'Not yet',
    })
  })

  it('shows a cancelled move', () => {
    expect(ticketStatusMoveView({ args: ARGS, resultType: 'aborted' })).toEqual({
      key: 'ZNR-780',
      outcome: 'cancelled',
      note: TICKET_STATUS_MOVE_OUTCOME.cancelled,
    })
  })

  it.each([
    ['no arguments', undefined],
    ['arguments that are text', 'ZNR-780'],
    ['an empty key', { issueKey: ' ', transition: 'Done' }],
  ])('says the ticket is unknown for %s', (_name, args) => {
    expect(ticketStatusMoveView({ args, resultType: 'require_confirmation' }).key).toBe(
      TICKET_STATUS_MOVE_TEXT.unknownTicket,
    )
  })

  it('shows no target when the agent named none', () => {
    const view = ticketStatusMoveView({ args: { issueKey: 'ZNR-780' }, resultType: 'pending' })
    expect(view.to).toBeUndefined()
    expect(view.line).toBeUndefined()
  })

  it('drops a link Jira answered that is not a web page', () => {
    const view = ticketStatusMoveView({
      args: ARGS,
      result: { ...RESULT, url: 'javascript:alert(1)' },
      resultType: 'success',
    })
    expect(view.url).toBeUndefined()
  })
})
