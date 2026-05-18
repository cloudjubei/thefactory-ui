import { useEffect, useMemo, useState } from 'react'
import { Modal as RNModal, Pressable, ScrollView, Text, View } from 'react-native'
import {
  nativeLightTheme,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../tokens/native'

export interface ModelChipConfig {
  id: string
  name?: string
  provider?: string
  model?: string
}

export type ModelChipMode = 'agentRun' | 'chat'

/** Minimal price record shape — full `UsageModalModelPrice` is web-only. */
export interface ModelPriceRecord {
  inputPerMTokensUSD: number
  outputPerMTokensUSD: number
  cacheReadInputPerMTokensUSD?: number
}

export interface ModelChipProps {
  provider?: string
  model?: string
  className?: string
  editable?: boolean
  mode?: ModelChipMode
  activeConfig: ModelChipConfig | null
  recents: ModelChipConfig[]
  configs: ModelChipConfig[]
  onPick: (id: string) => void
  onOpenSettings: () => void
  getPrice: (provider: string, model: string) => Promise<ModelPriceRecord | undefined>
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  google: 'Google',
  xai: 'xAI',
  groq: 'Groq',
  together: 'Together',
  azure: 'Azure',
  ollama: 'Ollama',
  local: 'Local',
  custom: 'Custom',
}

const PROVIDER_DOTS: Record<string, string> = {
  openai: nativePalette.blue[500],
  anthropic: nativePalette.orange[500],
  gemini: nativePalette.green[500],
  google: nativePalette.green[500],
  xai: '#000000',
  groq: nativePalette.pink[500],
  together: nativePalette.green[600],
  azure: nativePalette.blue[600],
  ollama: nativePalette.gray[500],
  local: nativePalette.gray[500],
  custom: nativePalette.purple[500],
}

function providerLabel(p?: string): string {
  if (!p) return ''
  return PROVIDER_LABELS[p.toLowerCase()] ?? p
}

function providerDot(p?: string): string {
  return PROVIDER_DOTS[(p ?? '').toLowerCase()] ?? nativePalette.pink[500]
}

function formatUSD(n?: number): string {
  if (n == null || Number.isNaN(n)) return '?'
  const fixed = n.toFixed(4)
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  return `$${trimmed}`
}

function PickerItem({
  cfg,
  selected,
  price,
  onPress,
}: {
  cfg: ModelChipConfig
  selected: boolean
  price: ModelPriceRecord | null | undefined
  onPress: () => void
}) {
  const dot = providerDot(cfg.provider)
  const prov = providerLabel(cfg.provider)
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[4],
        paddingVertical: nativeSpace[4],
        paddingHorizontal: nativeSpace[5],
        borderRadius: nativeRadii[1],
        backgroundColor: pressed
          ? nativeLightTheme.surface.muted
          : selected
            ? nativeLightTheme.surface.overlay
            : 'transparent',
      })}
    >
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: selected ? '600' : '400', color: nativeLightTheme.text.primary }}
        >
          {cfg.name ?? cfg.model ?? cfg.id}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: nativeLightTheme.text.muted }}>
          {[prov, cfg.model].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {price && (
        <Text style={{ fontSize: 11, color: nativeLightTheme.text.muted }}>
          {formatUSD(price.inputPerMTokensUSD)} in · {formatUSD(price.outputPerMTokensUSD)} out
        </Text>
      )}
      {selected && (
        <Text style={{ fontSize: 14, color: nativeLightTheme.accent.primary }}>✓</Text>
      )}
    </Pressable>
  )
}

export function ModelChip({
  provider,
  model,
  className,
  editable = false,
  mode = 'agentRun',
  activeConfig,
  recents,
  configs,
  onPick,
  onOpenSettings,
  getPrice,
}: ModelChipProps) {
  const [open, setOpen] = useState(false)
  const [pricesByKey, setPricesByKey] = useState<Record<string, ModelPriceRecord | null | undefined>>({})

  let prov = providerLabel(provider)
  let displayModel = model
  if ((!prov || !displayModel) && activeConfig) {
    prov = providerLabel(activeConfig.provider)
    displayModel = activeConfig.model
  }

  const label = useMemo(
    () => [prov || undefined, displayModel || undefined].filter(Boolean).join(' · '),
    [prov, displayModel],
  )
  const title = label || (editable ? 'Select model' : 'Unknown model')
  const dotColor = providerDot(provider ?? activeConfig?.provider)
  const isChatMode = mode === 'chat'

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const items = recents
      .map((cfg) => ({ provider: cfg.provider, model: cfg.model }))
      .filter((x): x is { provider: string; model: string } => !!x.provider && !!x.model)
    const uniqKeys = Array.from(new Set(items.map((x) => `${x.provider}::${x.model}`)))

    Promise.all(
      uniqKeys.map(async (key) => {
        const [p, m] = key.split('::')
        try {
          const rec = await getPrice(p, m)
          return [key, rec ?? null] as const
        } catch {
          return [key, null] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      const next: Record<string, ModelPriceRecord | null> = {}
      for (const [k, v] of entries) next[k] = v ?? null
      setPricesByKey(next)
    })

    return () => {
      cancelled = true
    }
  }, [open, recents, getPrice])

  if (editable && (!configs || configs.length === 0)) {
    return (
      <Pressable
        className={className}
        accessibilityRole="button"
        accessibilityLabel="Configure LLM"
        onPress={onOpenSettings}
        style={({ pressed }) => ({
          paddingHorizontal: nativeSpace[6],
          paddingVertical: nativeSpace[3],
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderColor: nativeLightTheme.border.default,
          backgroundColor: nativeLightTheme.surface.raised,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ fontSize: 13, color: nativeLightTheme.text.primary }}>
          Configure LLM…
        </Text>
      </Pressable>
    )
  }

  const chipBody = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: nativeSpace[3],
        paddingHorizontal: nativeSpace[5],
        paddingVertical: nativeSpace[3],
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: isChatMode ? nativePalette.teal[600] : nativeLightTheme.border.default,
        backgroundColor: isChatMode ? nativePalette.teal[100] : nativeLightTheme.surface.muted,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
      <View style={{ alignItems: 'center' }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 9,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: nativeLightTheme.text.secondary,
          }}
        >
          {prov || (editable ? 'Select' : '—')}
        </Text>
        {(displayModel || editable) && (
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.primary }}
          >
            {displayModel || (editable ? 'model…' : '')}
          </Text>
        )}
      </View>
    </View>
  )

  const chip = editable ? (
    <Pressable
      className={className}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => setOpen(true)}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {chipBody}
    </Pressable>
  ) : (
    <View className={className} accessibilityLabel={title}>
      {chipBody}
    </View>
  )

  if (!editable) return chip

  return (
    <>
      {chip}
      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: nativeSpace[6],
          }}
        >
          <Pressable
            accessible={false}
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: '80%',
              borderRadius: nativeRadii[3],
              backgroundColor: nativeLightTheme.surface.overlay,
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              ...nativeShadows[4],
            }}
          >
            <ScrollView contentContainerStyle={{ padding: nativeSpace[3] }}>
              {recents.map((cfg) => {
                const key = cfg.provider && cfg.model ? `${cfg.provider}::${cfg.model}` : ''
                return (
                  <PickerItem
                    key={cfg.id}
                    cfg={cfg}
                    selected={cfg.id === activeConfig?.id}
                    price={key ? pricesByKey[key] : undefined}
                    onPress={() => {
                      onPick(cfg.id)
                      setOpen(false)
                    }}
                  />
                )
              })}
              <View
                style={{
                  height: 1,
                  backgroundColor: nativeLightTheme.border.subtle,
                  marginVertical: nativeSpace[2],
                }}
              />
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => {
                  onOpenSettings()
                  setOpen(false)
                }}
                style={({ pressed }) => ({
                  paddingVertical: nativeSpace[4],
                  paddingHorizontal: nativeSpace[5],
                  borderRadius: nativeRadii[1],
                  backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
                })}
              >
                <Text
                  style={{ fontSize: 14, color: nativeLightTheme.text.secondary }}
                >
                  Manage LLM Configurations…
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    </>
  )
}

export default ModelChip
