import { Pressable, Text, View } from 'react-native'
import { Input } from '../../primitives/Input'
import { Switch } from '../../primitives/Switch'
import { useNativeTheme } from '../../hooks/useNativeTheme'

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
   * Discovered configs surfaced as tappable chips below the input. Tapping
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

/**
 * Native peer of `web/compound/tests/TestCustomConfigInput`. A text input
 * for the config path, optional candidate chips and (when a candidate is
 * selected) the env-var inputs that runner expects.
 */
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
  const { theme } = useNativeTheme()
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
    <View style={{ gap: 8 }}>
      {helperText ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{helperText}</Text>
      ) : null}
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {list.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>Detected:</Text>
          {list.map((c) => {
            const isActive = c.path === value
            return (
              <Pressable
                key={c.path}
                onPress={() => onChange(c.path)}
                disabled={disabled}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: theme.border.default,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: isActive
                    ? theme.accent.primary + '22'
                    : pressed
                      ? theme.surface.hover
                      : theme.surface.raised,
                })}
              >
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: 11,
                    color: isActive
                      ? theme.accent.primary
                      : theme.text.secondary,
                  }}
                >
                  {c.label ?? c.path}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
      {envSpec.length > 0 ? (
        <View
          style={{
            gap: 8,
            marginTop: 4,
            padding: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: theme.text.muted,
            }}
          >
            Environment for this config
          </Text>
          {envSpec.map((spec) => (
            <EnvField
              key={spec.name}
              spec={spec}
              value={values[spec.name]}
              disabled={disabled}
              onChange={(next) => setEnv(spec.name, next)}
            />
          ))}
        </View>
      ) : null}
    </View>
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
  const { theme } = useNativeTheme()
  const label = spec.label ?? spec.name

  if (spec.type === 'flag') {
    const trueValue = spec.trueValue ?? '1'
    const checked = value === trueValue
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: theme.text.primary }}>{label}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Menlo', color: theme.text.muted }}>
            {spec.name}
          </Text>
        </View>
        <Switch
          checked={checked}
          onCheckedChange={(next) => onChange(next ? trueValue : undefined)}
          disabled={disabled}
        />
      </View>
    )
  }

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, color: theme.text.primary }}>
        {label}{' '}
        <Text style={{ fontSize: 11, fontFamily: 'Menlo', color: theme.text.muted }}>
          {spec.name}
        </Text>
      </Text>
      <Input
        value={value ?? ''}
        placeholder={spec.placeholder}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(next) => onChange(next.length > 0 ? next : undefined)}
      />
    </View>
  )
}

export default TestCustomConfigInput
