import {
  PROCESS_INTEGRATION_CHECK_MERGE,
  RUN_PROPOSAL_LANDING_LABELS,
  RUN_PROPOSAL_LANDING_MODE_LABELS,
  processIntegrationAccountLabel,
  processIntegrationIdentityLabel,
  runProposalLandingLine,
  runProposalLandingProblem,
  runProposalLandingWithMode,
  type ProcessIntegrationForm,
  type RunProposalLanding,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'

export type RunProposalLandingEditorProps = {
  landing: RunProposalLanding
  /** The form as the person is setting it; absent when there is nothing to choose. */
  form: ProcessIntegrationForm | undefined
  busy: boolean
  onChange: (form: ProcessIntegrationForm) => void
}

/**
 * How approved work lands, on an agent's approval card: every value the
 * landing takes — the way, who it is committed as, its message and whether its
 * result is built and type-checked first, or the account a pull request is
 * opened as and its words — shown and changeable
 * exactly as on the sign-off, with what stops it being sent.
 */
export default function RunProposalLandingEditor({
  landing,
  form,
  busy,
  onChange,
}: RunProposalLandingEditorProps) {
  const options = landing.options
  const line = runProposalLandingLine(landing, form)
  if (!form || !options) {
    return <p className="m-0 text-[12px] text-(--text-secondary)">{line}</p>
  }
  const problem = runProposalLandingProblem(form, options)
  const set = (patch: Partial<ProcessIntegrationForm>) => onChange({ ...form, ...patch })
  const label = 'flex flex-col gap-1 text-[11.5px] font-medium text-(--text-secondary)'

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-[12px] font-semibold text-(--text-primary)">{line}</span>
      {landing.modes.length > 1 ? (
        <SegmentedControl
          size="sm"
          ariaLabel={RUN_PROPOSAL_LANDING_LABELS.mode}
          options={landing.modes.map((mode) => ({
            value: mode,
            label: RUN_PROPOSAL_LANDING_MODE_LABELS[mode] ?? mode,
          }))}
          value={form.mode}
          onChange={(mode) =>
            onChange(
              runProposalLandingWithMode(form, mode as ProcessIntegrationForm['mode'], options),
            )
          }
        />
      ) : null}
      {form.mode === 'pull-request' ? (
        <>
          <label className={label}>
            {RUN_PROPOSAL_LANDING_LABELS.account}
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
            {RUN_PROPOSAL_LANDING_LABELS.prTitle}
            <Input
              size="sm"
              value={form.prTitle}
              disabled={busy}
              onChange={(e) => set({ prTitle: e.target.value })}
            />
          </label>
          <label className={label}>
            {RUN_PROPOSAL_LANDING_LABELS.prBody}
            <Textarea
              rows={4}
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
            {RUN_PROPOSAL_LANDING_LABELS.identity}
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
            {RUN_PROPOSAL_LANDING_LABELS.message}
            <Textarea
              rows={3}
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
              {PROCESS_INTEGRATION_CHECK_MERGE.label(landing.baseRef)}
              <span className="text-[11px] text-(--text-muted)">
                {PROCESS_INTEGRATION_CHECK_MERGE.hint(landing.baseRef)}
              </span>
            </span>
          </label>
        </>
      )}
      {problem ? (
        <span className="text-[12px] text-(--status-stuck-soft-fg)">{problem}</span>
      ) : null}
    </div>
  )
}
