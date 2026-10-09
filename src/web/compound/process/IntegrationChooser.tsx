import { useState } from 'react'

import {
  PROCESS_INTEGRATION_CANCEL,
  PROCESS_INTEGRATION_CHECK_MERGE,
  PROCESS_INTEGRATION_CHOOSER_HEAD,
  PROCESS_INTEGRATION_CHOOSER_NOTE,
  PROCESS_INTEGRATION_DETAILS_HEAD,
  PROCESS_INTEGRATION_FORM_LABELS,
  processIntegrationAccountLabel,
  processIntegrationChoices,
  processIntegrationFormDecision,
  processIntegrationFormPreview,
  processIntegrationFormStart,
  processIntegrationIdentityLabel,
  useProcessIntegrationOptions,
  type ProcessIntegrationDecision,
  type ProcessIntegrationForm,
  type ProcessIntegrationMode,
  type ProcessIntegrationOptions,
  type ProcessWorkBranch,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import { Textarea } from '../../primitives/Textarea'

export type IntegrationChooserProps = {
  /** The run whose work lands — what it can land as is read for it. */
  runId: string
  /** The branch the work is on, and the branch it goes back to. */
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>
  /** The only ways offered, when they are narrowed — a group leg others build on merges or squashes. */
  modes?: readonly ProcessIntegrationMode[]
  /** Open straight at this way's details. */
  initialMode?: ProcessIntegrationMode
  /** The question heading the choices. */
  head?: string
  /** The button that sends the decision. */
  submitLabel?: string
  busy?: boolean
  onChoose: (decision: ProcessIntegrationDecision) => void
  onCancel: () => void
}

/**
 * How approved work lands, decided by the person: the way — merge, merge as one
 * commit, or a pull request — then who it is made as, the words it lands with
 * and whether its result is built and type-checked first (or the account a
 * pull request is opened as and what it says), with a preview of how it will
 * read on the host. A project with no git of its own
 * has one way and nothing more to decide.
 */
export default function IntegrationChooser({
  runId,
  workBranch,
  modes,
  initialMode,
  head = PROCESS_INTEGRATION_CHOOSER_HEAD,
  submitLabel = PROCESS_INTEGRATION_FORM_LABELS.land,
  busy = false,
  onChoose,
  onCancel,
}: IntegrationChooserProps) {
  const choices = processIntegrationChoices(workBranch, modes)
  const fixed =
    initialMode ?? (choices.length === 1 && !workBranch.shadow ? choices[0]!.mode : undefined)
  const [mode, setMode] = useState<ProcessIntegrationMode | undefined>(fixed)
  const { options, error } = useProcessIntegrationOptions(mode ? runId : undefined)

  if (!mode) {
    return (
      <div role="group" aria-label={head} className="flex w-full flex-col gap-2">
        <span className="text-[12.5px] font-semibold text-(--text-primary)">{head}</span>
        <div className="flex flex-col gap-1.5">
          {choices.map((choice) => (
            <button
              key={choice.mode}
              type="button"
              disabled={busy}
              onClick={() =>
                workBranch.shadow ? onChoose({ mode: choice.mode }) : setMode(choice.mode)
              }
              className="flex w-full flex-col items-start gap-0.5 rounded-md border border-(--border-default) bg-(--surface-raised) px-3 py-2 text-left enabled:hover:border-(--accent-primary) enabled:hover:bg-(--accent-primary)/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) disabled:opacity-50"
            >
              <span className="text-[12.5px] font-semibold text-(--text-primary)">
                {choice.label}
              </span>
              <span className="text-[11.5px] leading-snug text-(--text-secondary)">
                {choice.detail}
              </span>
            </button>
          ))}
        </div>
        {workBranch.shadow ? null : (
          <span className="text-[11px] text-(--text-muted)">
            {PROCESS_INTEGRATION_CHOOSER_NOTE}
          </span>
        )}
        <div>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
            {PROCESS_INTEGRATION_CANCEL}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={PROCESS_INTEGRATION_DETAILS_HEAD[mode]}
      className="flex w-full flex-col gap-2"
    >
      <span className="text-[12.5px] font-semibold text-(--text-primary)">
        {PROCESS_INTEGRATION_DETAILS_HEAD[mode]}
      </span>
      {options ? (
        <IntegrationDetails
          key={mode}
          mode={mode}
          options={options}
          workBranch={workBranch}
          submitLabel={submitLabel}
          busy={busy}
          onChoose={onChoose}
        />
      ) : (
        <span className="text-[12px] text-(--text-muted)">
          {error ?? PROCESS_INTEGRATION_FORM_LABELS.loading}
        </span>
      )}
      <div className="flex gap-2">
        {fixed ? null : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode(undefined)}>
            {PROCESS_INTEGRATION_FORM_LABELS.back}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          {PROCESS_INTEGRATION_CANCEL}
        </Button>
      </div>
    </div>
  )
}

type IntegrationDetailsProps = {
  mode: ProcessIntegrationMode
  options: ProcessIntegrationOptions
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>
  submitLabel: string
  busy: boolean
  onChoose: (decision: ProcessIntegrationDecision) => void
}

function IntegrationDetails({
  mode,
  options,
  workBranch,
  submitLabel,
  busy,
  onChoose,
}: IntegrationDetailsProps) {
  const [form, setForm] = useState<ProcessIntegrationForm>(() =>
    processIntegrationFormStart(mode, options),
  )
  const result = processIntegrationFormDecision(form, options)
  const preview = processIntegrationFormPreview(form, options, workBranch)
  const set = (patch: Partial<ProcessIntegrationForm>) => setForm((f) => ({ ...f, ...patch }))
  const label = 'flex flex-col gap-1 text-[11.5px] font-medium text-(--text-secondary)'

  return (
    <div className="flex flex-col gap-2.5">
      {mode === 'pull-request' ? (
        <>
          <label className={label}>
            {PROCESS_INTEGRATION_FORM_LABELS.account}
            <NativeSelect
              size="sm"
              value={form.accountId ?? ''}
              disabled={busy || options.accounts.length === 0}
              onChange={(e) => set({ accountId: e.target.value })}
            >
              {options.accounts.map((a) => (
                <option key={a.credentialId} value={a.credentialId}>
                  {processIntegrationAccountLabel(a)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className={label}>
            {PROCESS_INTEGRATION_FORM_LABELS.prTitle}
            <Input
              size="sm"
              value={form.prTitle}
              disabled={busy}
              onChange={(e) => set({ prTitle: e.target.value })}
            />
          </label>
          <label className={label}>
            {PROCESS_INTEGRATION_FORM_LABELS.prBody}
            <Textarea
              rows={6}
              value={form.prBody}
              disabled={busy}
              onChange={(e) => set({ prBody: e.target.value })}
              className="font-mono text-[12px]"
            />
          </label>
        </>
      ) : (
        <>
          <label className={label}>
            {PROCESS_INTEGRATION_FORM_LABELS.identity}
            <NativeSelect
              size="sm"
              value={form.identityId ?? ''}
              disabled={busy || options.identities.length === 0}
              onChange={(e) => set({ identityId: e.target.value })}
            >
              {options.identities.map((i) => (
                <option key={i.credentialId} value={i.credentialId}>
                  {processIntegrationIdentityLabel(i)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className={label}>
            {PROCESS_INTEGRATION_FORM_LABELS.message}
            <Textarea
              rows={4}
              value={form.message}
              disabled={busy}
              onChange={(e) => set({ message: e.target.value })}
              className="font-mono text-[12px]"
            />
          </label>
          <label className="flex items-start gap-2 text-[12px] text-(--text-primary)">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.checkMerge}
              disabled={busy}
              onChange={(e) => set({ checkMerge: e.target.checked })}
            />
            <span className="flex flex-col gap-0.5">
              {PROCESS_INTEGRATION_CHECK_MERGE.label(workBranch.baseRef)}
              <span className="text-[11px] text-(--text-muted)">
                {PROCESS_INTEGRATION_CHECK_MERGE.hint(workBranch.baseRef)}
              </span>
            </span>
          </label>
        </>
      )}

      <div className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-sunken) px-3 py-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {preview.where}
        </span>
        {preview.entries.map((entry, i) => (
          <div key={`${i}-${entry.title}`} className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-(--text-primary)">{entry.title}</span>
            {entry.body ? (
              <span className="whitespace-pre-wrap text-[11.5px] text-(--text-secondary)">
                {entry.body}
              </span>
            ) : null}
            <span className="text-[11px] text-(--text-muted)">{entry.byline}</span>
          </div>
        ))}
        {preview.more ? (
          <span className="text-[11px] text-(--text-muted)">
            {PROCESS_INTEGRATION_FORM_LABELS.more(preview.more)}
          </span>
        ) : null}
        {preview.note ? (
          <span className="text-[11px] text-(--text-secondary)">{preview.note}</span>
        ) : null}
      </div>

      {'problem' in result ? (
        <span className="text-[12px] text-(--status-stuck-soft-fg)">{result.problem}</span>
      ) : null}
      <div>
        <Button
          size="sm"
          variant="primary"
          disabled={busy || 'problem' in result}
          onClick={() => {
            if ('decision' in result) onChoose(result.decision)
          }}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
