import {
  PROCESS_GROUP_MARK_LANDED_LABEL,
  processGroupLandedNextView,
  processGroupLandingPlanLegIds,
  useProcessGroupLegLanding,
  useProcessGroupRebuildPlans,
  type ProcessGroupLeg,
  type ProcessGroupRun,
  type UseProcessGroupRun,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'

export type ProcessGroupLegLandingDialogProps = {
  group: ProcessGroupRun
  leg: ProcessGroupLeg
  planRebuild: UseProcessGroupRun['planRebuild']
  checkLanding: UseProcessGroupRun['checkLanding']
  markLanded: UseProcessGroupRun['markLanded']
  onClose: () => void
}

/**
 * Mark one leg's work as landed on its base branch outside its run: the
 * server checks its story is done and finds — or takes the person's — commit
 * on the base branch; only a check that proved it lets the person record it,
 * and the dialog then says what happens to the legs that need it — how it is
 * rebuilt first, as its plan says.
 */
export default function ProcessGroupLegLandingDialog({
  group,
  leg,
  planRebuild,
  checkLanding,
  markLanded,
  onClose,
}: ProcessGroupLegLandingDialogProps) {
  const landing = useProcessGroupLegLanding(leg.id, checkLanding, markLanded)
  const plans = useProcessGroupRebuildPlans(
    processGroupLandingPlanLegIds(group, leg.id),
    planRebuild,
  )
  const view = landing.checkView
  const next = view?.landed ? processGroupLandedNextView(group, leg.id, plans[leg.id]) : undefined
  const tone = view?.landed ? 'done' : 'stuck'
  return (
    <Modal isOpen onClose={onClose} title={`Mark ${leg.projectId} as landed?`} size="sm">
      <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
        <p className="m-0">
          Use this when {leg.projectId}’s work reached its base branch another way. It counts as
          merged only once every feature of “{leg.title}” is done and the commit that brought it in
          is on the base branch.
        </p>
        <Field label="Commit" hint="Leave empty to have it found from its runs and their chats.">
          <Input
            size="sm"
            value={landing.commit}
            placeholder="e.g. e9b3c02"
            onChange={(e) => landing.setCommit(e.target.value)}
          />
        </Field>
        <Field label="Note">
          <Textarea
            rows={2}
            value={landing.note}
            onChange={(e) => landing.setNote(e.target.value)}
          />
        </Field>
        {view ? (
          <ul
            className="m-0 flex list-none flex-col gap-1 rounded-md p-2.5 text-[12px]"
            style={{
              background: `var(--status-${tone}-soft-bg)`,
              border: `1px solid var(--status-${tone}-soft-border)`,
              color: `var(--status-${tone}-soft-fg)`,
            }}
          >
            {view.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {next ? <p className="m-0 text-[12px] text-(--text-secondary)">{next}</p> : null}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={landing.marking} onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={landing.checking}
            onClick={() => void landing.runCheck()}
          >
            Check
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!landing.canMark}
            loading={landing.marking}
            onClick={() => void landing.mark().then((ok) => ok && onClose())}
          >
            {PROCESS_GROUP_MARK_LANDED_LABEL}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
