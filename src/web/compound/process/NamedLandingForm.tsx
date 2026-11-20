import { useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  PROCESS_NAMED_LANDING_COPY,
  processNamedLandingConfirm,
  processNamedLandingInput,
  useProcessRunNamedLanding,
  type ProcessNamedLandingAction,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { ConfirmDialog } from '../../primitives/Modal'

export type NamedLandingFormProps = {
  action: ProcessNamedLandingAction
  /** Start open with this text — for a fixed showcase state. */
  initialText?: string
  /** Start on the confirm — for a fixed showcase state. */
  initialConfirming?: boolean
}

/**
 * "Merged another way?": finish a run as merged by the pull request that
 * brought its work in, or the commit on its base, once confirmed. Nothing is
 * merged or pushed. Native peer: `native/compound/process/NamedLandingForm`.
 */
export default function NamedLandingForm({
  action,
  initialText,
  initialConfirming = false,
}: NamedLandingFormProps) {
  const [open, setOpen] = useState(initialText !== undefined)
  const [text, setText] = useState(initialText ?? '')
  const [confirming, setConfirming] = useState(initialConfirming)
  const named = processNamedLandingInput(text)
  const ready = named !== undefined && !('error' in named)
  if (!open) {
    return (
      <div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          {PROCESS_NAMED_LANDING_COPY.open}
        </Button>
      </div>
    )
  }
  return (
    <form
      className="flex min-w-0 max-w-xl flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !action.busy) setConfirming(true)
      }}
    >
      <Field
        label={PROCESS_NAMED_LANDING_COPY.field}
        hint={PROCESS_NAMED_LANDING_COPY.hint}
        error={named && 'error' in named ? named.error : undefined}
      >
        <Input
          value={text}
          disabled={action.busy}
          spellCheck={false}
          className="font-mono"
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      {action.error ? <Alert variant="error">{action.error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!ready} loading={action.busy}>
          {action.busy ? PROCESS_NAMED_LANDING_COPY.finishing : PROCESS_NAMED_LANDING_COPY.finish}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={action.busy}
          onClick={() => setOpen(false)}
        >
          {PROCESS_NAMED_LANDING_COPY.cancel}
        </Button>
      </div>
      {confirming && ready ? (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirming(false)}
          title={PROCESS_NAMED_LANDING_COPY.confirmTitle}
          description={processNamedLandingConfirm(named)}
          confirmLabel={PROCESS_NAMED_LANDING_COPY.finish}
          cancelLabel={PROCESS_NAMED_LANDING_COPY.keep}
          onConfirm={() => {
            setConfirming(false)
            void action.onSettle(named)
          }}
        />
      ) : null}
    </form>
  )
}

/** "Merged another way?" on a run's page, wherever the run takes it; nothing elsewhere. */
export function RunNamedLandingPanel({ run }: { run: ProcessRun }) {
  const action = useProcessRunNamedLanding(run)
  if (!action) return null
  return (
    <div className="mx-auto w-full max-w-[1120px] px-3 pb-3 sm:px-6">
      <NamedLandingForm action={action} />
    </div>
  )
}
