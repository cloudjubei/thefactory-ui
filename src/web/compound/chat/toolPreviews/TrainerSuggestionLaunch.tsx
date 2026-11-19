import { useTrainerSuggestionLaunch } from '../../../../headless/hooks/useTrainerSuggestionLaunch'
import {
  trainerActivityLabel,
  type TrainerSuggestionLaunchProps,
  type TrainerSuggestionState,
} from '../../../../headless/hooks/trainerSuggestionStore'

export function TrainerSuggestionLaunchView({
  state,
  onLaunch,
  onRefresh,
  unavailable = false,
}: {
  state: TrainerSuggestionState
  onLaunch: () => void
  onRefresh: () => void
  unavailable?: boolean
}) {
  const label = trainerActivityLabel(state)
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
      {!state.activityId ? (
        <button
          type="button"
          disabled={unavailable || state.launching}
          onClick={(e) => {
            e.stopPropagation()
            onLaunch()
          }}
          className="rounded-full border border-(--border-subtle) px-3 py-1 text-(--accent-primary) disabled:opacity-50"
        >
          {state.launching ? 'Launching…' : 'Launch'}
        </button>
      ) : (
        <span role="status">{label}</span>
      )}
      {unavailable ? <span>Launch from this project’s trainer.</span> : null}
      {state.activity?.steps.map((step) => (
        <span key={step.key}>
          {step.key}: {step.done}/{step.total} · {step.status}
        </span>
      ))}
      {state.activity?.error ? <span role="alert">{state.activity.error}</span> : null}
      {state.error ? (
        <>
          <span role="alert">{state.error}</span>
          {state.activityId ? (
            <button type="button" onClick={onRefresh}>
              Refresh status
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default function TrainerSuggestionLaunch(props: TrainerSuggestionLaunchProps) {
  const launch = useTrainerSuggestionLaunch(props)
  return (
    <TrainerSuggestionLaunchView
      state={launch.state}
      onLaunch={launch.launch}
      onRefresh={launch.refresh}
      unavailable={launch.unavailable}
    />
  )
}
