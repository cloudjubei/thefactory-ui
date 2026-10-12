import { useId } from 'react'
import { Switch } from '../primitives/Switch'

export type TurnLimitFieldProps = {
  /** The switch's label, e.g. "Limit turns per run". */
  label: string
  /** What the limit means, under the label. */
  hint: string
  /** The slider's label, e.g. "Max turns per run". */
  sliderLabel: string
  limited: boolean
  maxTurns: number
  min: number
  max: number
  disabled?: boolean
  onChange: (next: { limited: boolean; maxTurns: number }) => void
}

/** The "limit turns" switch with the slider it reveals — the same wherever a turn limit is set. */
export function TurnLimitField({
  label,
  hint,
  sliderLabel,
  limited,
  maxTurns,
  min,
  max,
  disabled,
  onChange,
}: TurnLimitFieldProps) {
  const sliderId = useId()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-(--text-secondary)">{label}</span>
          <span className="text-[10px] text-(--text-tertiary)">{hint}</span>
        </div>
        <Switch
          checked={limited}
          ariaLabel={label}
          {...(disabled ? { disabled } : {})}
          onCheckedChange={(checked) => onChange({ limited: !!checked, maxTurns })}
        />
      </div>
      {limited ? (
        <div className="space-y-1 pl-1">
          <label className="text-xs font-medium text-(--text-secondary)" htmlFor={sliderId}>
            {sliderLabel}:
            <span className="pl-4 text-[14px] text-(--text-secondary)">{maxTurns}</span>
          </label>
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={1}
            value={maxTurns}
            disabled={disabled}
            onChange={(e) => onChange({ limited, maxTurns: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-(--text-tertiary)">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TurnLimitField
