import { workStartEditable } from '../../headless/utils/appWorkStart'
import {
  APP_WORK_START_HEADING,
  APP_WORK_START_HINT,
  APP_WORK_START_LABELS,
  APP_WORK_START_ONE_FEATURE,
} from '../../headless/utils/appWorkStartConstants'
import type { AppWorkStartAsk, AppWorkStartDraft } from '../../headless/utils/appWorkStartTypes'
import Alert from '../primitives/Alert'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Modal } from '../primitives/Modal'
import { Textarea } from '../primitives/Textarea'

export type AppWorkStartDialogProps = {
  /** The app's `work.start` ask (`useAppWorkStart().ask`); nothing shows while `null`. */
  ask: AppWorkStartAsk | null
  onEdit: (draft: AppWorkStartDraft) => void
  onStart: () => void
  /** Decline: nothing is made. Also what closing the dialog does. */
  onCancel: () => void
}

/**
 * The person's confirmation of work an embedded app asks to start, drawn over the App view: its
 * title, description and features, editable until Start makes the story. Purely presentational.
 */
export default function AppWorkStartDialog({
  ask,
  onEdit,
  onStart,
  onCancel,
}: AppWorkStartDialogProps) {
  if (!ask || ask.launching) return null
  const { draft, busy, error } = ask
  const editable = workStartEditable(ask)
  const setFeature = (index: number, patch: Partial<AppWorkStartDraft['features'][number]>) =>
    onEdit({
      ...draft,
      features: draft.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    })

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onCancel()
      }}
      title={APP_WORK_START_HEADING}
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {APP_WORK_START_LABELS.cancel}
          </Button>
          <Button variant="primary" onClick={onStart} loading={busy} disabled={busy}>
            {APP_WORK_START_LABELS.start}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-(--text-secondary)">{APP_WORK_START_HINT}</p>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label={APP_WORK_START_LABELS.title}>
          <Input
            value={draft.title}
            disabled={!editable}
            onChange={(e) => onEdit({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label={APP_WORK_START_LABELS.description}>
          <Textarea
            rows={5}
            value={draft.description}
            disabled={!editable}
            onChange={(e) => onEdit({ ...draft, description: e.target.value })}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{APP_WORK_START_LABELS.features}</span>
          {draft.features.length === 0 ? (
            <p className="text-xs text-(--text-secondary)">{APP_WORK_START_ONE_FEATURE}</p>
          ) : (
            draft.features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) p-2"
              >
                <Input
                  aria-label={APP_WORK_START_LABELS.featureTitle}
                  value={feature.title}
                  disabled={!editable}
                  onChange={(e) => setFeature(index, { title: e.target.value })}
                />
                <Textarea
                  aria-label={APP_WORK_START_LABELS.featureDescription}
                  rows={2}
                  value={feature.description}
                  disabled={!editable}
                  onChange={(e) => setFeature(index, { description: e.target.value })}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
