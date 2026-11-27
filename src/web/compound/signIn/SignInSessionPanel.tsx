import { useState, type FormEvent, type ReactNode } from 'react'
import { SIGN_IN_SESSION_TEXT as TEXT, type SignInSessionView } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import Spinner from '../../primitives/Spinner'

export type SignInSessionPanelProps = {
  view: SignInSessionView
  /** The live page, for a session that shows one. */
  page?: ReactNode
  onClose: () => void
  /** Takes the value a prompt asks for. */
  onAnswer: (text: string) => void
  /** Opens a prompt's link in the person's own browser. */
  onOpenLink: (url: string) => void
  className?: string
}

function Prompt({
  view,
  onAnswer,
  onOpenLink,
}: Pick<SignInSessionPanelProps, 'view' | 'onAnswer' | 'onOpenLink'>) {
  const [typed, setTyped] = useState('')
  const waiting = !view.link && !view.input
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!typed || view.answering) return
    onAnswer(typed)
    setTyped('')
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        {view.message ? (
          <p className="m-0 flex items-center gap-2 text-sm text-(--text-primary)">
            {waiting ? <Spinner size={16} className="shrink-0 text-(--text-muted)" /> : null}
            <span className="min-w-0 whitespace-pre-wrap break-words">{view.message}</span>
          </p>
        ) : null}
        {view.link ? (
          <div className="flex min-w-0 flex-col gap-2">
            <code className="block max-h-24 overflow-y-auto break-all rounded-md border border-(--border-subtle) bg-(--surface-muted) px-2 py-1.5 text-[12px] text-(--text-secondary)">
              {view.link}
            </code>
            <div>
              <Button size="sm" variant="primary" onClick={() => onOpenLink(view.link!)}>
                {TEXT.openLink}
              </Button>
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
    </div>
  )
}

/**
 * A sign-in to an outside service, shown inside the app: what is being signed
 * in to, that it closes by itself once the person is signed in, a way to
 * close it by hand, and what the session shows — its live page, or a prompt
 * with a link to open and a value to give back. The same for every sign-in.
 */
export default function SignInSessionPanel({
  view,
  page,
  onClose,
  onAnswer,
  onOpenLink,
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
      ) : (
        <Prompt view={view} onAnswer={onAnswer} onOpenLink={onOpenLink} />
      )}
    </section>
  )
}
