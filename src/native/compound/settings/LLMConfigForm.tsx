import { forwardRef, useImperativeHandle, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

export type LlmProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'xai'
  | 'qwen'
  | 'llama'
  | 'custom'

export interface LLMConfigFormValues {
  name: string
  provider: LlmProviderId
  model: string
  apiKey: string
  apiUrlOverride?: string
}

export interface LLMConfigFormProps {
  initialValues?: Partial<LLMConfigFormValues>
  /** Edit mode keeps the existing API key when the field is left blank. */
  isEdit?: boolean
  onSubmit: (values: LLMConfigFormValues) => void | Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

export interface LLMConfigFormHandle {
  submit: () => void
}

const PROVIDER_OPTIONS: ReadonlyArray<{ value: LlmProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'llama', label: 'Llama' },
  { value: 'custom', label: 'Custom' },
]

const PROVIDER_MODELS: Record<LlmProviderId, ReadonlyArray<string>> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o3-mini', 'o4-mini'],
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-latest',
  ],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  xai: ['grok-2-latest', 'grok-2-mini'],
  qwen: ['qwen2.5-72b-instruct', 'qwen2.5-coder-32b-instruct'],
  llama: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'],
  custom: [],
}

/**
 * Native peer of web's `LLMConfigForm`. Presentational LLM-config editor:
 * name, provider, model (with provider preset chips), API key
 * (`SecretInput`), and an API-URL override. The host owns the modal +
 * footer and triggers submit through the form's imperative handle.
 */
const LLMConfigForm = forwardRef<LLMConfigFormHandle, LLMConfigFormProps>(function LLMConfigForm(
  { initialValues, isEdit = false, onSubmit, onDirtyChange },
  ref,
) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [provider, setProvider] = useState<LlmProviderId>(initialValues?.provider ?? 'anthropic')
  const [model, setModel] = useState(initialValues?.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const [apiUrlOverride, setApiUrlOverride] = useState(initialValues?.apiUrlOverride ?? '')

  const markDirty = () => onDirtyChange?.(true)

  useImperativeHandle(ref, () => ({
    submit: () => {
      void onSubmit({
        name: name.trim(),
        provider,
        model: model.trim(),
        apiKey: apiKey.trim(),
        apiUrlOverride: apiUrlOverride.trim() || undefined,
      })
    },
  }))

  return (
    <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: nativeSpace[4] }}>
      <Field label="Name" hint="A label you'll recognise, e.g. “Claude Sonnet (work)”">
        <Input
          value={name}
          onChangeText={(v) => {
            setName(v)
            markDirty()
          }}
          placeholder="Config name"
        />
      </Field>

      <Field label="Provider">
        <Select
          value={provider}
          onValueChange={(v) => {
            setProvider(v as LlmProviderId)
            markDirty()
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Model">
        <Input
          value={model}
          onChangeText={(v) => {
            setModel(v)
            markDirty()
          }}
          placeholder="Model id"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {PROVIDER_MODELS[provider].length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2], marginTop: 6 }}>
            {PROVIDER_MODELS[provider].map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setModel(m)
                  markDirty()
                }}
                style={{
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    model === m ? nativeLightTheme.accent.primary : nativeLightTheme.border.subtle,
                  backgroundColor:
                    model === m ? 'rgba(37,99,235,0.08)' : nativeLightTheme.surface.overlay,
                }}
              >
                <Text style={{ fontSize: 11, color: nativeLightTheme.text.secondary }}>{m}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Field>

      <Field
        label="API key"
        hint={isEdit ? 'Leave blank to keep the existing key.' : undefined}
      >
        <SecretInput
          value={apiKey}
          onChangeText={(v) => {
            setApiKey(v)
            markDirty()
          }}
          placeholder={isEdit ? '••••••••' : 'Provider API key'}
        />
      </Field>

      <Field label="API URL override (optional)" hint="Only for self-hosted or proxy endpoints">
        <Input
          value={apiUrlOverride}
          onChangeText={(v) => {
            setApiUrlOverride(v)
            markDirty()
          }}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>
    </ScrollView>
  )
})

export default LLMConfigForm
