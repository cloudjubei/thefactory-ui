import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import {
  extractErrorMessage,
  listLlmModels,
  type GetLlmConfigResponse,
  type LlmConfigCreateInput,
  type LlmConfigEditInput,
} from '../../../headless/api'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
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
import { IconChat } from '../../icons/IconChat'
import { IconRobot } from '../../icons/IconRobot'
import { IconRocket } from '../../icons/IconRocket'
import { IconSave } from '../../icons/IconSave'
import { nativeLightStatus, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

type Provider = GetLlmConfigResponse['provider']

const PROVIDER_OPTIONS: ReadonlyArray<{ value: Provider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'llama', label: 'Llama' },
  { value: 'custom', label: 'Custom' },
]

const PROVIDERS_WITH_MODEL_LISTING = new Set<Provider>([
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'qwen',
  'llama',
  'custom',
])

const PROVIDER_FALLBACK_MODELS: Record<Provider, ReadonlyArray<string>> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o3-mini', 'o4-mini'],
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
  ],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  xai: ['grok-2-latest', 'grok-2-mini'],
  qwen: ['qwen2.5-72b-instruct', 'qwen2.5-32b-instruct', 'qwen2.5-coder-32b-instruct'],
  llama: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'],
  custom: [],
}

export type LLMConfigFormMode =
  | { kind: 'create'; onSubmit: (input: LlmConfigCreateInput) => Promise<unknown> }
  | {
      kind: 'edit'
      config: GetLlmConfigResponse
      onSubmit: (patch: LlmConfigEditInput) => Promise<unknown>
      isChatActive: boolean
      isAgentActive: boolean
      isActivityActive: boolean
      onActivateChat: () => void
      onActivateAgent: () => void
      onActivateActivity: () => void
    }

export interface LLMConfigFormProps {
  mode: LLMConfigFormMode
  /**
   * Closes the form. The host (Modal) wires this to actual dismissal. Called
   * after a successful submit, after the user confirms discarding unsaved
   * changes, or from `requestClose()` when the form is clean.
   */
  onCancel: () => void
}

export interface LLMConfigFormHandle {
  /**
   * Asks the form to close. If the form is dirty, opens a confirm-discard
   * dialog instead of calling `onCancel` directly. Wire this to the parent
   * Modal's `onClose`.
   */
  requestClose: () => void
}

/**
 * Native peer of web's `LLMConfigForm`. Self-contained LLM-config editor used
 * inside a host modal: name, provider, API key, optional URL override, model
 * (with refresh-from-provider). In edit mode it also renders "Activate Agent"
 * / "Activate Chat" buttons and an icon Save submit; in create mode the
 * submit reads "Create config".
 *
 * Mirrors web behaviorally: dirty-tracking + discard-confirm, model picker
 * with provider preset fallbacks, silent initial models load.
 */
const LLMConfigForm = forwardRef<LLMConfigFormHandle, LLMConfigFormProps>(function LLMConfigForm(
  { mode, onCancel },
  ref,
) {
  const { theme } = useNativeTheme()
  const initial = mode.kind === 'edit' ? mode.config : null
  const [name, setName] = useState(initial?.name ?? '')
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? 'openai')
  const [model, setModel] = useState(initial?.model ?? '')
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [apiUrlOverride, setApiUrlOverride] = useState(initial?.apiUrlOverride ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  // Tracks whether the user has actually touched a form field. Background
  // effects like the initial models load do NOT flip this — only user
  // interaction does. So opening an existing config and closing without
  // typing/clicking never triggers the discard prompt.
  const dirtyRef = useRef(false)
  const markDirty = () => {
    dirtyRef.current = true
  }

  useImperativeHandle(
    ref,
    () => ({
      requestClose: () => {
        if (dirtyRef.current) setDiscardOpen(true)
        else onCancel()
      },
    }),
    [onCancel],
  )

  const [availableModels, setAvailableModels] = useState<string[]>(() =>
    Array.from(PROVIDER_FALLBACK_MODELS[initial?.provider ?? 'openai']),
  )
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const initialIsPreset =
    !!initial && PROVIDER_FALLBACK_MODELS[initial.provider].includes(initial.model)
  const [modelMode, setModelMode] = useState<'preset' | 'custom'>(
    PROVIDER_FALLBACK_MODELS[initial?.provider ?? 'openai'].length === 0
      ? 'custom'
      : initialIsPreset
        ? 'preset'
        : 'custom',
  )

  const providerSupportsRefresh = PROVIDERS_WITH_MODEL_LISTING.has(provider)
  const providerModels = useMemo(() => availableModels, [availableModels])

  const loadModels = async (
    p: Provider,
    key: string,
    urlOverride: string,
    currentModel: string,
    options?: { silent?: boolean },
  ) => {
    // Reconcile mode only in one direction: if we're in 'preset' but the
    // saved model is no longer in the available list, fall back to 'custom'
    // so the value is still editable. NEVER flip 'custom' → 'preset'
    // automatically — that would silently throw away the user's intent and
    // make the custom input vanish on auto-load.
    const reconcileModeForList = (list: ReadonlyArray<string>) => {
      if (currentModel && !list.includes(currentModel)) setModelMode('custom')
    }
    if (!PROVIDERS_WITH_MODEL_LISTING.has(p) || key.trim().length === 0) {
      const fallback = Array.from(PROVIDER_FALLBACK_MODELS[p])
      setAvailableModels(fallback)
      reconcileModeForList(fallback)
      setModelsError(null)
      return
    }
    setModelsLoading(true)
    setModelsError(null)
    try {
      const { data } = await listLlmModels({
        body: {
          provider: p,
          apiKey: key,
          apiUrlOverride: urlOverride.trim() || undefined,
        },
        throwOnError: true,
      })
      const names = Array.from(
        new Set(
          (data ?? [])
            .map((entry) => entry.model)
            .filter((m): m is string => typeof m === 'string' && m.trim().length > 0),
        ),
      )
      const finalList = names.length > 0 ? names : Array.from(PROVIDER_FALLBACK_MODELS[p])
      setAvailableModels(finalList)
      reconcileModeForList(finalList)
    } catch (err) {
      const fallback = Array.from(PROVIDER_FALLBACK_MODELS[p])
      setAvailableModels(fallback)
      reconcileModeForList(fallback)
      if (!options?.silent) {
        setModelsError(
          extractErrorMessage(
            err,
            'Could not fetch the latest models from this provider. Check the API key and URL override.',
          ),
        )
      }
    } finally {
      setModelsLoading(false)
    }
  }

  useEffect(() => {
    void loadModels(provider, apiKey, apiUrlOverride, model, { silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = name.trim().length > 0 && model.trim().length > 0 && apiKey.trim().length > 0

  const onProviderChange = (next: Provider) => {
    if (next === provider) return // synced — not a real user change
    markDirty()
    setProvider(next)
    setModel('')
    setModelsError(null)
    const fallback = Array.from(PROVIDER_FALLBACK_MODELS[next])
    setAvailableModels(fallback)
    setModelMode(fallback.length === 0 ? 'custom' : 'preset')
    void loadModels(next, apiKey, apiUrlOverride, '', { silent: true })
  }

  const onModelSelect = (value: string) => {
    if (value === '__custom__') {
      if (modelMode === 'custom') return
      markDirty()
      setModelMode('custom')
      setModel('')
    } else {
      if (modelMode === 'preset' && model === value) return
      markDirty()
      setModelMode('preset')
      setModel(value)
    }
  }

  const onSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        provider,
        model: model.trim(),
        apiKey: apiKey.trim(),
        apiUrlOverride: apiUrlOverride.trim() || undefined,
      }
      await mode.onSubmit(payload)
      onCancel()
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          'The backend rejected this LLM configuration. Double-check the provider, model, API key, and URL override.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={{ maxHeight: 520 }}
      contentContainerStyle={{ gap: nativeSpace[4], paddingBottom: nativeSpace[2] }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Alert variant="error">{error}</Alert> : null}

      {mode.kind === 'edit' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[2],
            paddingBottom: nativeSpace[2],
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <Button
            variant={mode.isAgentActive ? 'success' : 'outline'}
            size="sm"
            onPress={() => {
              if (!mode.isAgentActive) mode.onActivateAgent()
            }}
            accessibilityLabel={mode.isAgentActive ? 'Active for agent runs' : 'Use for agent runs'}
          >
            <IconRobot
              size={14}
              color={mode.isAgentActive ? nativeLightStatus.done.bg : theme.accent.primary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: mode.isAgentActive ? nativeLightStatus.done.bg : theme.accent.primary,
              }}
            >
              {mode.isAgentActive ? 'Agent Active' : 'Activate Agent'}
            </Text>
          </Button>
          <Button
            variant={mode.isChatActive ? 'success' : 'outline'}
            size="sm"
            onPress={() => {
              if (!mode.isChatActive) mode.onActivateChat()
            }}
            accessibilityLabel={mode.isChatActive ? 'Active for chat' : 'Use for chat'}
          >
            <IconChat
              size={14}
              color={mode.isChatActive ? nativeLightStatus.done.bg : theme.accent.primary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: mode.isChatActive ? nativeLightStatus.done.bg : theme.accent.primary,
              }}
            >
              {mode.isChatActive ? 'Chat Active' : 'Activate Chat'}
            </Text>
          </Button>
          <Button
            variant={mode.isActivityActive ? 'success' : 'outline'}
            size="sm"
            onPress={() => {
              if (!mode.isActivityActive) mode.onActivateActivity()
            }}
            accessibilityLabel={
              mode.isActivityActive
                ? 'Active for background activities'
                : 'Use for background activities'
            }
          >
            <IconRocket
              size={14}
              color={mode.isActivityActive ? nativeLightStatus.done.bg : theme.accent.primary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: mode.isActivityActive ? nativeLightStatus.done.bg : theme.accent.primary,
              }}
            >
              {mode.isActivityActive ? 'Activity Active' : 'Activate Activity'}
            </Text>
          </Button>
        </View>
      ) : null}

      <Field label="Name" hint="A label you'll recognise, e.g. “Claude Sonnet (work)”">
        <Input
          value={name}
          onChangeText={(v) => {
            markDirty()
            setName(v)
          }}
          placeholder="Config name"
        />
      </Field>

      <Field label="Provider">
        <Select value={provider} onValueChange={(v) => onProviderChange(v as Provider)}>
          <SelectTrigger>
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="API key">
        <SecretInput
          value={apiKey}
          onChangeText={(v) => {
            markDirty()
            setApiKey(v)
          }}
          placeholder={provider === 'custom' ? 'Optional bearer token' : 'sk-...'}
        />
      </Field>

      <Field label="API URL override (optional)" hint="Only for self-hosted or proxy endpoints">
        <Input
          value={apiUrlOverride}
          onChangeText={(v) => {
            markDirty()
            setApiUrlOverride(v)
          }}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: nativeSpace[2],
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>Model</Text>
          {providerSupportsRefresh ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => void loadModels(provider, apiKey, apiUrlOverride, model)}
              loading={modelsLoading}
              disabled={apiKey.trim().length === 0}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: theme.accent.primary,
                }}
              >
                {modelsLoading ? 'Loading…' : 'Refresh Models'}
              </Text>
            </Button>
          ) : null}
        </View>
        {providerSupportsRefresh && apiKey.trim().length === 0 ? (
          <Text
            style={{
              fontSize: 12,
              color: theme.text.secondary,
              marginBottom: 4,
            }}
          >
            Enter an API key above to fetch the latest list of available models from the provider.
          </Text>
        ) : null}
        {providerModels.length > 0 ? (
          <Select
            value={modelMode === 'preset' && model ? model : '__custom__'}
            onValueChange={onModelSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {providerModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Custom</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {modelMode === 'custom' ? (
          <View style={{ marginTop: providerModels.length > 0 ? nativeSpace[2] : 0 }}>
            <Input
              value={model}
              onChangeText={(v) => {
                markDirty()
                setModel(v)
              }}
              placeholder="model-id"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : null}
        {modelsError ? (
          <Text style={{ fontSize: 13, color: nativeLightStatus.stuck.bg, marginTop: 4 }}>
            {modelsError}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingTop: nativeSpace[2],
        }}
      >
        {mode.kind === 'create' ? (
          <Button loading={submitting} disabled={!canSubmit} onPress={onSubmit}>
            Create config
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="icon"
            loading={submitting}
            disabled={!canSubmit}
            onPress={onSubmit}
            accessibilityLabel="Save"
          >
            <IconSave size={16} color={theme.text.primary} />
          </Button>
        )}
      </View>

      <ConfirmDialog
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          onCancel()
        }}
        title="Discard changes?"
        description="You have unsaved changes in this LLM configuration. Closing now will lose them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
      />
    </ScrollView>
  )
})

export default LLMConfigForm
