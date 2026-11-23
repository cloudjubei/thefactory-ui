import { LAUNCH_PLANNING_COPY } from '../../../headless/utils/launchPlanningConstants'
import { launchPlanningLine } from '../../../headless/utils/launchPlanning'
import { Switch } from '../../primitives/Switch'

export type LaunchPlanFirstToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
  busy?: boolean
}

/**
 * The launch card's "Plan first": on, a planner fills in the story's spec, plan
 * and features before any is worked; off, the run starts at the features as
 * they are. On by default. Native peer: `native/compound/chat/LaunchPlanFirstToggle`.
 */
export default function LaunchPlanFirstToggle({
  value,
  onChange,
  busy = false,
}: LaunchPlanFirstToggleProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Switch
        checked={value}
        disabled={busy}
        onCheckedChange={onChange}
        label={LAUNCH_PLANNING_COPY.title}
      />
      <span className="text-[11.5px] text-(--text-secondary)">{launchPlanningLine(value)}</span>
    </div>
  )
}
