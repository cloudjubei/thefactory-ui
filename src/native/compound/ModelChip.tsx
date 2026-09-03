import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ModelInfo } from '../../headless/api'
import type { ActivityCliModel } from '../../headless/contexts/LLMConfigsContext'
import {
  cliDotColor,
  cliLabel,
  shortCliModelLabel,
  type CliAuthWarning,
} from '../../headless/utils/cliRunner'
import { nativePalette, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import BottomSheet from '../primitives/BottomSheet'

export interface ModelChipConfig {
  id: string
  name?: string
  provider?: string
  model?: string
}

export type ModelChipMode = 'agentRun' | 'chat' | 'activity'

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
  /** When defined, surfaces the API/CLI toggle in the picker. `true` ⇒ chat is CLI-backed. */
  useCli?: boolean
  /** Flip the chat between API-backed (`false`) and CLI-backed (`true`). */
  onToggleUseCli?: (next: boolean) => void
  /** CLI tools the host has enabled; rendered as the CLI sub-selector. */
  enabledClis?: string[]
  /** The currently-selected CLI tool when `useCli` is true. */
  activeCli?: string | null
  /** Select which enabled CLI backs the chat. */
  onPickCli?: (cli: string) => void
  /** Models reported by the active CLI; rendered as the CLI model dropdown. */
  cliModels?: ModelInfo[]
  /** Select which CLI model backs the chat. */
  onPickCliModel?: (modelId: string) => void
  /** Recently-selected CLI agent+model picks; rendered as a quick-pick list in the CLI panel. */
  recentCliModels?: ActivityCliModel[]
  /** Apply a recents entry as the CLI selection. */
  onPickRecentCli?: (model: ActivityCliModel) => void
  /** Disable the CLI segment — e.g. an app whose activities run only on an API model. */
  cliDisabled?: boolean
  /** Caption explaining why CLI is unavailable; shown under the toggle when {@link cliDisabled}. */
  cliDisabledReason?: string
  /** When defined, surfaces the "Resident mode" switch in the CLI panel. `true` ⇒ this chat runs on a long-lived per-chat CLI process. */
  residentMode?: boolean
  /** Flip the chat's CLI runner between per-turn spawn (`false`) and resident process (`true`). */
  onToggleResident?: (next: boolean) => void
  /** When the selected CLI credential needs re-auth, flags the chip (warning glyph + a "Re-authenticate in Settings" picker row). */
  authWarning?: CliAuthWarning
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

/** Cap chip-face text so a long provider/model name can't blow out the chip. */
function trim10(s: string): string {
  return s.length > 10 ? `${s.slice(0, 10)}…` : s
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
  const { theme } = useNativeTheme()
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
        minHeight: 48,
        paddingVertical: nativeSpace[3],
        paddingHorizontal: nativeSpace[3],
        borderRadius: nativeRadii[3],
        backgroundColor: pressed
          ? theme.surface.hover
          : selected
            ? theme.surface.muted
            : 'transparent',
      })}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: selected ? '600' : '400',
            color: theme.text.primary,
          }}
        >
          {cfg.name ?? cfg.model ?? cfg.id}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.muted }}>
          {[prov, cfg.model].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {price && (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {formatUSD(price.inputPerMTokensUSD)} in · {formatUSD(price.outputPerMTokensUSD)} out
        </Text>
      )}
      {selected && <Text style={{ fontSize: 14, color: theme.accent.primary }}>✓</Text>}
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
  useCli,
  onToggleUseCli,
  enabledClis,
  activeCli,
  onPickCli,
  cliModels,
  onPickCliModel,
  recentCliModels,
  onPickRecentCli,
  cliDisabled,
  cliDisabledReason,
  residentMode,
  onToggleResident,
  authWarning,
}: ModelChipProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const [pricesByKey, setPricesByKey] = useState<
    Record<string, ModelPriceRecord | null | undefined>
  >({})

  const cliEnabled = onToggleUseCli != null
  const needsReauth = !!useCli && !!authWarning?.needsReauth

  let prov = providerLabel(provider)
  let displayModel = model
  if ((!prov || !displayModel) && activeConfig) {
    prov = providerLabel(activeConfig.provider)
    displayModel = activeConfig.model
  }
  if (useCli) {
    prov = cliLabel(activeCli)
    displayModel = cliModels?.find((m) => m.id === model)?.label ?? model
  }

  const label = useMemo(
    () => [prov || undefined, displayModel || undefined].filter(Boolean).join(' · '),
    [prov, displayModel],
  )
  const baseTitle = label || (editable ? 'Select model' : 'Unknown model')
  const title = needsReauth
    ? `${baseTitle} — ${authWarning?.message ?? 'sign-in expired'}; re-authenticate in Settings`
    : baseTitle
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
          borderColor: theme.border.default,
          backgroundColor: theme.surface.raised,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ fontSize: 13, color: theme.text.primary }}>Configure LLM…</Text>
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
        borderColor: needsReauth
          ? nativePalette.red[500]
          : mode === 'activity'
            ? nativePalette.blue[600]
            : isChatMode
              ? nativePalette.teal[600]
              : theme.border.default,
        backgroundColor:
          mode === 'activity'
            ? nativePalette.blue[100]
            : isChatMode
              ? nativePalette.teal[100]
              : theme.surface.muted,
      }}
    >
      {cliEnabled && (
        <View
          style={{
            paddingHorizontal: nativeSpace[2],
            paddingVertical: 1,
            borderRadius: nativeRadii[1],
            backgroundColor: useCli ? `${nativePalette.purple[500]}33` : theme.surface.hover,
          }}
        >
          <Text
            style={{
              fontSize: 8,
              fontWeight: '700',
              letterSpacing: 0.5,
              color: useCli ? nativePalette.purple[500] : theme.text.secondary,
            }}
          >
            {useCli ? 'CLI' : 'API'}
          </Text>
        </View>
      )}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: useCli ? cliDotColor(activeCli) : dotColor,
        }}
      />
      {needsReauth && (
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: nativePalette.red[500],
          }}
        >
          <Text style={{ fontSize: 8, fontWeight: '700', lineHeight: 10, color: '#ffffff' }}>
            !
          </Text>
        </View>
      )}
      <View style={{ alignItems: 'center', maxWidth: 60 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 9,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: theme.text.secondary,
          }}
        >
          {trim10(prov || (editable ? 'Select' : '—'))}
        </Text>
        {(displayModel || editable) && (
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}
          >
            {trim10(displayModel || (editable ? 'model…' : ''))}
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
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Select model">
        <View style={{ paddingBottom: nativeSpace[3] }}>
          {onToggleUseCli && (
            <View
              accessibilityRole="radiogroup"
              style={{
                flexDirection: 'row',
                gap: nativeSpace[2],
                padding: nativeSpace[2],
                marginBottom: nativeSpace[2],
                borderRadius: nativeRadii[3],
                backgroundColor: theme.surface.muted,
              }}
            >
              {(['API', 'CLI'] as const).map((segment) => {
                const segUseCli = segment === 'CLI'
                const segActive = segUseCli === !!useCli
                const segDisabled = segUseCli && !!cliDisabled
                return (
                  <Pressable
                    key={segment}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: segActive, disabled: segDisabled }}
                    disabled={segDisabled}
                    onPress={() => {
                      if (segActive || segDisabled) return
                      onToggleUseCli(segUseCli)
                    }}
                    style={{
                      flex: 1,
                      minHeight: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: nativeRadii[2],
                      backgroundColor: segActive ? theme.surface.raised : 'transparent',
                      opacity: segDisabled ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: segActive ? '600' : '400',
                        color: segActive ? theme.text.primary : theme.text.secondary,
                      }}
                    >
                      {segment}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
          {onToggleUseCli && cliDisabled && cliDisabledReason && (
            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: theme.text.secondary,
                marginBottom: nativeSpace[2],
                paddingHorizontal: nativeSpace[1],
              }}
            >
              {cliDisabledReason}
            </Text>
          )}

          {useCli ? (
            <>
              {(recentCliModels ?? []).length > 0 && (
                <>
                  <Text
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: theme.text.secondary,
                      paddingHorizontal: nativeSpace[3],
                      paddingBottom: nativeSpace[1],
                    }}
                  >
                    Recent
                  </Text>
                  {(recentCliModels ?? []).map((rm) => {
                    const isActive = rm.cli === activeCli && rm.modelId === model
                    return (
                      <Pressable
                        key={`${rm.cli}:${rm.modelId ?? ''}`}
                        accessibilityRole="menuitem"
                        accessibilityState={{ selected: isActive }}
                        onPress={() => onPickRecentCli?.(rm)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: nativeSpace[4],
                          minHeight: 44,
                          paddingVertical: nativeSpace[2],
                          paddingHorizontal: nativeSpace[3],
                          borderRadius: nativeRadii[3],
                          backgroundColor: pressed
                            ? theme.surface.hover
                            : isActive
                              ? theme.surface.muted
                              : 'transparent',
                        })}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: cliDotColor(rm.cli),
                          }}
                        />
                        <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
                          {cliLabel(rm.cli)}
                          {rm.modelId ? ` · ${shortCliModelLabel(rm.modelId)}` : ''}
                        </Text>
                        {isActive && (
                          <Text style={{ fontSize: 14, color: theme.accent.primary }}>✓</Text>
                        )}
                      </Pressable>
                    )
                  })}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.border.subtle,
                      marginVertical: nativeSpace[2],
                    }}
                  />
                </>
              )}
              {(enabledClis ?? []).map((cli) => {
                const isActive = cli === activeCli
                return (
                  <Pressable
                    key={cli}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => onPickCli?.(cli)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: nativeSpace[4],
                      minHeight: 48,
                      paddingVertical: nativeSpace[3],
                      paddingHorizontal: nativeSpace[3],
                      borderRadius: nativeRadii[3],
                      backgroundColor: pressed
                        ? theme.surface.hover
                        : isActive
                          ? theme.surface.muted
                          : 'transparent',
                    })}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cliDotColor(cli),
                      }}
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>
                      {cliLabel(cli)}
                    </Text>
                    {isActive && (
                      <Text style={{ fontSize: 14, color: theme.accent.primary }}>✓</Text>
                    )}
                  </Pressable>
                )
              })}
              {(enabledClis ?? []).length === 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.text.muted,
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: nativeSpace[2],
                  }}
                >
                  No CLI agents enabled.
                </Text>
              )}

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border.subtle,
                  marginVertical: nativeSpace[2],
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: theme.text.secondary,
                  paddingHorizontal: nativeSpace[3],
                  paddingBottom: nativeSpace[1],
                }}
              >
                Model
              </Text>
              {(cliModels ?? []).map((m) => {
                const isActive = m.id === model
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => onPickCliModel?.(m.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: nativeSpace[4],
                      minHeight: 44,
                      paddingVertical: nativeSpace[2],
                      paddingHorizontal: nativeSpace[3],
                      borderRadius: nativeRadii[3],
                      backgroundColor: pressed
                        ? theme.surface.hover
                        : isActive
                          ? theme.surface.muted
                          : 'transparent',
                    })}
                  >
                    <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
                      {m.label}
                    </Text>
                    {isActive && (
                      <Text style={{ fontSize: 14, color: theme.accent.primary }}>✓</Text>
                    )}
                  </Pressable>
                )
              })}
              {(cliModels ?? []).length === 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.text.muted,
                    paddingHorizontal: nativeSpace[3],
                    paddingVertical: nativeSpace[2],
                  }}
                >
                  No models reported.
                </Text>
              )}

              {onToggleResident && (
                <>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.border.subtle,
                      marginVertical: nativeSpace[2],
                    }}
                  />
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityState={{ checked: !!residentMode }}
                    onPress={() => onToggleResident(!residentMode)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: nativeSpace[4],
                      minHeight: 44,
                      paddingVertical: nativeSpace[2],
                      paddingHorizontal: nativeSpace[3],
                      borderRadius: nativeRadii[3],
                      backgroundColor: pressed ? theme.surface.hover : 'transparent',
                    })}
                  >
                    <Text style={{ fontSize: 14, color: theme.accent.primary, width: 16 }}>
                      {residentMode ? '☑' : '☐'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: theme.text.primary }}>Resident mode</Text>
                      <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                        Keep one process warm per chat — faster follow-up turns.
                      </Text>
                    </View>
                  </Pressable>
                </>
              )}

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border.subtle,
                  marginVertical: nativeSpace[2],
                }}
              />
              {needsReauth && (
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => {
                    onOpenSettings()
                    setOpen(false)
                  }}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: nativeSpace[3],
                    borderRadius: nativeRadii[3],
                    backgroundColor: pressed ? theme.surface.hover : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 14, color: nativePalette.red[500] }}>
                    ⚠ Re-authenticate in Settings…
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => {
                  onOpenSettings()
                  setOpen(false)
                }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: nativeSpace[3],
                  borderRadius: nativeRadii[3],
                  backgroundColor: pressed ? theme.surface.hover : 'transparent',
                })}
              >
                <Text style={{ fontSize: 14, color: theme.text.secondary }}>
                  Manage CLI agents…
                </Text>
              </Pressable>
            </>
          ) : (
            <>
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
                  backgroundColor: theme.border.subtle,
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
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: nativeSpace[3],
                  borderRadius: nativeRadii[3],
                  backgroundColor: pressed ? theme.surface.hover : 'transparent',
                })}
              >
                <Text style={{ fontSize: 14, color: theme.text.secondary }}>
                  Manage LLM Configurations…
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </BottomSheet>
    </>
  )
}

export default ModelChip
