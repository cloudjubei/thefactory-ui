import { Input } from '../../primitives/Input'
import { Switch } from '../../primitives/Switch'

/** One env var a custom test config exposes to the UI. */
export type TestConfigEnvVarLike = {
  name: string
  label?: string
  type: 'flag' | 'string'
  default?: string
  placeholder?: string
  trueValue?: string
}

/**
 * A candidate path the backend (or desktop's client-side scan) surfaced.
 * Optional `env` declares input fields the UI should render for the user
 * to fill before running.
 */
export type TestConfigCandidate = {
  path: string
  label?: string
  env?: TestConfigEnvVarLike[]
}

export type TestCustomConfigInputProps = {
  value: string
  onChange: (next: string) => void
  /**
   * Discovered configs surfaced as clickable chips below the input. Click
   * sets the input to the chip's path. Each candidate may carry an `env[]`
   * declaration; selecting a chip with env entries renders inputs for
   * those values below.
   */
  candidates?: TestConfigCandidate[]
  /** Current values for the selected candidate's env inputs. Owned by the parent. */
  envValues?: Record<string, string>
  onEnvChange?: (next: Record<string, string>) => void
  disabled?: boolean
  placeholder?: string
  helperText?: string
}

export function TestCustomConfigInput({
  value,
  onChange,
  candidates,
  envValues,
  onEnvChange,
  disabled,
  placeholder = 'e.g. tests/e2e/playwright.config.ts',
  helperText,
}: TestCustomConfigInputProps) {
  const list = candidates ?? []
  const selectedCandidate = list.find((c) => c.path === value)
  const envSpec = selectedCandidate?.env ?? []
  const values = envValues ?? {}

  const setEnv = (name: string, next: string | undefined) => {
    if (!onEnvChange) return
    const updated = { ...values }
    if (next === undefined) delete updated[name]
    else updated[name] = next
    onEnvChange(updated)
  }

  return (
    <div className="flex flex-col gap-2">
      {helperText && <p className="text-xs opacity-70">{helperText}</p>}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-(--text-muted) mr-1">Detected:</span>
          {list.map((c) => {
            const isActive = c.path === value
            return (
              <button
                key={c.path}
                type="button"
                onClick={() => onChange(c.path)}
                disabled={disabled}
                className={[
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-mono',
                  'border-(--border-default)',
                  isActive
                    ? 'bg-(--color-brand-50) text-(--color-brand-700)'
                    : 'bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)',
                  'disabled:opacity-50',
                ].join(' ')}
                title={c.path}
              >
                {c.label ?? c.path}
              </button>
            )
          })}
        </div>
      )}
      {envSpec.length > 0 && (
        <div
          className="flex flex-col gap-2 mt-1 p-3 rounded-md border"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
        >
          <div className="text-[11px] uppercase tracking-wide text-(--text-muted)">
            Environment for this config
          </div>
          {envSpec.map((spec) => (
            <EnvField
              key={spec.name}
              spec={spec}
              value={values[spec.name]}
              disabled={disabled}
              onChange={(next) => setEnv(spec.name, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EnvField({
  spec,
  value,
  disabled,
  onChange,
}: {
  spec: TestConfigEnvVarLike
  value: string | undefined
  disabled?: boolean
  onChange: (next: string | undefined) => void
}) {
  const label = spec.label ?? spec.name

  if (spec.type === 'flag') {
    const trueValue = spec.trueValue ?? '1'
    // A flag is "on" when the env var is set to its trueValue. We never
    // emit empty string for flags — off ⇒ omit the var entirely so the
    // child process inherits no fallback from `process.env`.
    const checked = value === trueValue
    return (
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm" htmlFor={`env-${spec.name}`}>
          {label}
          <span className="text-(--text-muted) ml-2 font-mono text-[11px]">{spec.name}</span>
        </label>
        <Switch
          checked={checked}
          onCheckedChange={(next) => onChange(next ? trueValue : undefined)}
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-1" htmlFor={`env-${spec.name}`}>
      <span className="text-sm">
        {label}
        <span className="text-(--text-muted) ml-2 font-mono text-[11px]">{spec.name}</span>
      </span>
      <Input
        id={`env-${spec.name}`}
        value={value ?? ''}
        placeholder={spec.placeholder}
        onChange={(e) => {
          const next = e.target.value
          // Treat empty input the same as unset so we don't pass blank
          // strings into env vars; the consumer typically wants the
          // variable absent in that case.
          onChange(next.length > 0 ? next : undefined)
        }}
        disabled={disabled}
      />
    </label>
  )
}

export default TestCustomConfigInput
