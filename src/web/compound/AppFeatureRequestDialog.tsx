import {
  featureRequestLines,
  featureRequestLinesText,
} from '../../headless/utils/appFeatureRequest'
import {
  APP_FEATURE_REQUEST_HEADING,
  APP_FEATURE_REQUEST_HINT,
  APP_FEATURE_REQUEST_LABELS,
} from '../../headless/utils/appFeatureRequestConstants'
import type {
  AppFeatureRequestAsk,
  AppFeatureRequestDraft,
} from '../../headless/utils/appFeatureRequestTypes'
import Alert from '../primitives/Alert'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Modal } from '../primitives/Modal'
import { Textarea } from '../primitives/Textarea'

export type AppFeatureRequestDialogProps = {
  /** The app's `feature.request` ask (`useAppFeatureRequest().ask`); nothing shows while `null`. */
  ask: AppFeatureRequestAsk | null
  /** The name of the project the request goes to; its id shows when absent. */
  targetName?: string
  onEdit: (draft: AppFeatureRequestDraft) => void
  onSend: () => void
  /** Decline: nothing is sent. Also what closing the dialog does. */
  onCancel: () => void
}

/**
 * The person's confirmation of a feature request an embedded app asks to send to another project,
 * drawn over the App view: where it goes, then its title, summary, description and done-when
 * lines, editable until Send. Purely presentational.
 */
export default function AppFeatureRequestDialog({
  ask,
  targetName,
  onEdit,
  onSend,
  onCancel,
}: AppFeatureRequestDialogProps) {
  if (!ask) return null
  const { draft, busy, error } = ask
  const set = (patch: Partial<AppFeatureRequestDraft>) => onEdit({ ...draft, ...patch })

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onCancel()
      }}
      title={APP_FEATURE_REQUEST_HEADING}
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {APP_FEATURE_REQUEST_LABELS.cancel}
          </Button>
          <Button variant="primary" onClick={onSend} loading={busy} disabled={busy}>
            {APP_FEATURE_REQUEST_LABELS.send}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-(--text-secondary)">{APP_FEATURE_REQUEST_HINT}</p>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label={APP_FEATURE_REQUEST_LABELS.to}>
          <p className="text-sm font-medium text-(--text-primary)">
            {targetName || draft.targetProjectId}
          </p>
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.title}>
          <Input
            value={draft.title}
            disabled={busy}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.summary}>
          <Textarea
            rows={2}
            value={draft.summary}
            disabled={busy}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.description}>
          <Textarea
            rows={4}
            value={draft.description}
            disabled={busy}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field
          label={APP_FEATURE_REQUEST_LABELS.doneWhen}
          hint={APP_FEATURE_REQUEST_LABELS.doneWhenHint}
        >
          <Textarea
            rows={3}
            value={featureRequestLinesText(draft.doneWhen)}
            disabled={busy}
            onChange={(e) => set({ doneWhen: featureRequestLines(e.target.value) })}
          />
        </Field>
        {draft.references.length ? (
          <Field label={APP_FEATURE_REQUEST_LABELS.references}>
            <ul className="flex flex-col gap-1 text-sm text-(--text-secondary)">
              {draft.references.map((reference) => (
                <li key={reference} className="break-all">
                  {reference}
                </li>
              ))}
            </ul>
          </Field>
        ) : null}
      </div>
    </Modal>
  )
}
