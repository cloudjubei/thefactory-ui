import { useState, type FormEvent, type ReactNode } from 'react'
import { SIGN_IN_SESSION_TEXT as TEXT, type SignInSessionView } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'
import { CopyButton } from '../CopyButton'

export type SignInSessionPanelProps = {
  view: SignInSessionView
  /** The live page, for a session that shows one: its own, or its prompt's address. */
  page?: ReactNode
  onClose: () => void
  /** Takes the value a prompt asks for. */
  onAnswer: (text: string) => void
  className?: string
}

function Fields({ view, onAnswer }: Pick<SignInSessionPanelProps, 'view' | 'onAnswer'>) {
  const [typed, setTyped] = useState('')
  const waiting = !view.page && !view.input && !view.code
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!typed || view.answering) return
    onAnswer(typed)
    setTyped('')
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {view.message ? (
        <p className="m-0 flex items-center gap-2 text-sm text-(--text-primary)">
          {waiting ? <Spinner size={16} className="shrink-0 text-(--text-muted)" /> : null}
          <span className="min-w-0 whitespace-pre-wrap break-words">{view.message}</span>
        </p>
      ) : null}
      {view.code ? (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12.5px] text-(--text-secondary)">{TEXT.codeLabel}</span>
          <div className="flex min-w-0 items-center gap-2">
            <code
              aria-label={TEXT.codeLabel}
              className="min-w-0 select-all break-all rounded-md border border-(--border-subtle) bg-(--surface-muted) px-3 py-1.5 font-mono text-xl font-semibold tracking-wider text-(--text-primary)"
            >
              {view.code}
            </code>
            <CopyButton text={view.code} label={TEXT.copyCode} title={TEXT.copyCode} />
          </div>
        </div>
      ) : null}
      {view.input ? (
        <form className="flex min-w-0 items-end gap-2" onSubmit={submit}>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12.5px] text-(--text-secondary)">
            {view.input.label}
            <Input
              type={view.input.secret ? 'password' : 'text'}
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            loading={!!view.answering}
            disabled={!typed || !!view.answering}
          >
            {TEXT.send}
          </Button>
        </form>
      ) : null}
      {view.error ? <Alert>{view.error}</Alert> : null}
    </div>
  )
}

function PromptWithPage({
  view,
  page,
  onAnswer,
}: Pick<SignInSessionPanelProps, 'view' | 'page' | 'onAnswer'>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 overflow-y-auto border-b border-(--border-subtle) p-3 sm:order-2 sm:w-80 sm:border-b-0 sm:border-l sm:p-4">
        <Fields view={view} onAnswer={onAnswer} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:order-1">
        <div
          title={view.address}
          className="shrink-0 truncate border-b border-(--border-subtle) bg-(--surface-muted) px-3 py-1 font-mono text-[11.5px] text-(--text-muted)"
        >
          {view.address}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{page}</div>
      </div>
    </div>
  )
}

/**
 * A sign-in to an outside service, shown inside the app: what is being signed
 * in to, that it closes by itself once the person is signed in, a way to
 * close it by hand, and what the session shows — its live page, or a prompt
 * with the live page of its address beside it, a code to copy onto that page
 * and a value to give back. The same for every sign-in; nothing opens outside
 * the app.
 */
export default function SignInSessionPanel({
  view,
  page,
  onClose,
  onAnswer,
  className,
}: SignInSessionPanelProps) {
  return (
    <section
      aria-label={view.title}
      className={`flex min-h-0 min-w-0 flex-1 flex-col bg-(--surface-base) ${className ?? ''}`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm text-(--text-primary)">{view.title}</b>
          <span className="text-[12px] text-(--text-secondary)">{view.hint}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onClose}>
          {TEXT.close}
        </Button>
      </header>
      {view.surface === 'browser' ? (
        <div className="flex min-h-0 flex-1 flex-col">{page}</div>
      ) : view.page ? (
        <PromptWithPage view={view} page={page} onAnswer={onAnswer} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-6">
          <div className="flex w-full max-w-md">
            <Fields view={view} onAnswer={onAnswer} />
          </div>
        </div>
      )}
    </section>
  )
}
