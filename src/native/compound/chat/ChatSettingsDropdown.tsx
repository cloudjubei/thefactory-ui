import { useMemo, useState, type ReactNode } from 'react'
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import BottomSheet from '../../primitives/BottomSheet'
import { CHAT_TOOLS_HINT } from '../../../headless/utils/chatToolTogglesConstants'
import {
  CHAT_TURN_LIMIT_HINT,
  CHAT_TURN_LIMIT_MAX,
  CHAT_TURN_LIMIT_MIN,
} from '../../../headless/utils/chatTurnLimitConstants'
import {
  applyChatTurnLimit,
  buildChatTurnLimit,
  CHAT_SETTINGS_MENU_COPY,
  filterChatToolToggles,
  groupChatToolToggles,
  useAppSettings,
  type ChatToolToggle,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { Input } from '../../primitives/Input'
import { Textarea } from '../../primitives/Textarea'
import { Slider } from '../../primitives/Slider'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ChatRulesPanel from '../rules/ChatRulesPanel'
import { TurnLimitField } from '../TurnLimitField'

export type ToolToggle = {
  name: string
  description: string
  available: boolean
  /** Groups the row under a heading. Rows without one land under "other". */
  category?: string
  /** False for a tool the transport never lets the user switch off. */
  toggleable?: boolean
}

/** Fill the optional grouping fields so the headless filter/group helpers apply. */
function normalizeToolToggle(tool: ToolToggle): ChatToolToggle {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category ?? 'other',
    available: tool.available,
    toggleable: tool.toggleable ?? true,
  }
}

export type CompletionSettingsLike = {
  limitTurns?: boolean
  maxTurns?: number
  numberMessagesToSend?: number
  finishTurnOnErrors?: boolean
  historySummarization?: unknown
  messageSanitization?: unknown
}

export interface ChatSettingsDropdownProps {
  isOpen: boolean
  onClose: () => void

  completion?: CompletionSettingsLike

  draftPrompt: string
  setDraftPrompt: (v: string) => void
  onSavePrompt: () => Promise<void> | void
  onResetPrompt: () => Promise<void> | void

  tools: ToolToggle[]
  toggleAvailable: (tool: ToolToggle) => Promise<void> | void
  /** Puts the chat's tools and approval switch back to its chat type's — on every model. */
  onResetTools: () => Promise<void> | void
  /** The chat-wide "run tools without asking" switch — one on every transport. Hidden when absent. */
  toolApproval?: { auto: boolean }
  onToolApprovalChange?: (auto: boolean) => Promise<void> | void
  /** This chat's key: shows "Rules for this chat" — its own always-allow rules, removable. Hidden when absent. */
  rulesChatContextId?: string

  persistSettings: (patch: Partial<CompletionSettingsLike>) => Promise<void> | void

  /** Slot beneath the standard fields — host renders history-summarization /
   *  message-sanitization sub-controls here. */
  extraContent?: ReactNode
  title?: string
  /** When true a settings write failed and is retrying — the body greys out and
   * input is blocked until the backend reconnects. */
  blocked?: boolean
}

/**
 * Native peer of [web's `ChatSettingsDropdown`](../../../web/compound/chat/ChatSettingsDropdown.tsx).
 * On RN the settings surface is a bottom sheet with a scrollable body:
 * the turn limit, completion sliders, per-tool toggles and the `extraContent`
 * slot — with the system-prompt editor when "Show developer tools" is on.
 */
export default function ChatSettingsDropdown({
  isOpen,
  onClose,
  completion,
  draftPrompt,
  setDraftPrompt,
  onSavePrompt,
  onResetPrompt,
  tools,
  toggleAvailable,
  onResetTools,
  toolApproval,
  onToolApprovalChange,
  rulesChatContextId,
  persistSettings,
  extraContent,
  title = CHAT_SETTINGS_MENU_COPY.tune,
  blocked = false,
}: ChatSettingsDropdownProps) {
  const { theme } = useNativeTheme()
  const { settings, setUserPreferences } = useAppSettings()
  const prefs = settings.userPreferences
  const turnLimit = buildChatTurnLimit(completion)
  const [toolFilter, setToolFilter] = useState('')
  const visibleToolGroups = useMemo(
    () => groupChatToolToggles(filterChatToolToggles(tools.map(normalizeToolToggle), toolFilter)),
    [tools, toolFilter],
  )
  // Sheet takes ~80% of viewport (user-requested) and the inner scroller
  // takes ~70% — leaves room for the sheet handle, title bar, and a bit of
  // bottom safe-area inset before the scroll content kicks in.
  const maxBodyHeight = Math.round(Dimensions.get('window').height * 0.7)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeightFraction={0.8}>
      {blocked ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            alignItems: 'center',
            paddingTop: nativeSpace[4],
            backgroundColor: theme.surface.raised + 'aa',
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[3],
              backgroundColor: theme.surface.overlay,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              Reconnecting to save your settings…
            </Text>
          </View>
        </View>
      ) : null}
      <ScrollView
        pointerEvents={blocked ? 'none' : 'auto'}
        style={{ maxHeight: maxBodyHeight, opacity: blocked ? 0.5 : 1 }}
        contentContainerStyle={{ gap: nativeSpace[5], paddingBottom: nativeSpace[4] }}
        keyboardShouldPersistTaps="handled"
      >
        {prefs.showDeveloperTools === true ? (
          <View style={{ gap: nativeSpace[2] }}>
            <SectionLabel>System prompt</SectionLabel>
            <Textarea
              value={draftPrompt}
              onChangeText={setDraftPrompt}
              rows={4}
              placeholder="Custom system prompt for this chat context…"
            />
            <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
              <Button size="sm" onPress={() => void onSavePrompt()}>
                Save prompt
              </Button>
              <Button size="sm" variant="secondary" onPress={() => void onResetPrompt()}>
                Reset to defaults
              </Button>
            </View>
          </View>
        ) : null}

        {completion ? (
          <View style={{ gap: nativeSpace[4] }}>
            <TurnLimitField
              label="Limit turns per run"
              hint={CHAT_TURN_LIMIT_HINT}
              sliderLabel="Max turns per run"
              limited={turnLimit.limited}
              maxTurns={turnLimit.maxTurns}
              min={CHAT_TURN_LIMIT_MIN}
              max={CHAT_TURN_LIMIT_MAX}
              onChange={(next) =>
                void persistSettings(
                  next.limited === turnLimit.limited
                    ? { maxTurns: next.maxTurns }
                    : applyChatTurnLimit(next.limited, completion),
                )
              }
            />
            <SliderRow
              label="Number of messages to send"
              value={completion.numberMessagesToSend ?? 3}
              min={3}
              max={50}
              onChange={(v) => void persistSettings({ numberMessagesToSend: v })}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpace[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: theme.text.secondary,
                  }}
                >
                  Finish turn on errors
                </Text>
                <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                  When enabled, the agent ends the current turn if a tool call errors.
                </Text>
              </View>
              <Switch
                checked={!!completion.finishTurnOnErrors}
                onCheckedChange={(c) => void persistSettings({ finishTurnOnErrors: c })}
              />
            </View>
          </View>
        ) : null}

        {extraContent}

        {/* Agent runs — CLI transcript display prefs (global). */}
        <View style={{ gap: nativeSpace[3] }}>
          <SectionLabel>Agent runs</SectionLabel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: nativeSpace[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
                Show thinking
              </Text>
              <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                Show the model's reasoning steps in an agent run's transcript.
              </Text>
            </View>
            <Switch
              checked={prefs.cliShowThinking ?? true}
              onCheckedChange={(c) => setUserPreferences({ cliShowThinking: c })}
            />
          </View>
        </View>

        {/* Tools */}
        <View style={{ gap: nativeSpace[2] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <SectionLabel>Tools</SectionLabel>
            <Pressable onPress={() => void onResetTools()}>
              <Text style={{ fontSize: 11, color: theme.text.muted }}>Reset to defaults</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{CHAT_TOOLS_HINT}</Text>
          {toolApproval && onToolApprovalChange ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpace[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: nativeRadii[2],
                paddingHorizontal: nativeSpace[2],
                paddingVertical: nativeSpace[2],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
                  Run tools without asking
                </Text>
                <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                  Off, the agent stops for your approval before anything that acts. On, it runs
                  everything in the list below straight away — a tool switched off stays off.
                </Text>
              </View>
              <Switch
                checked={toolApproval.auto}
                onCheckedChange={(c) => void onToolApprovalChange(c)}
              />
            </View>
          ) : null}
          {rulesChatContextId ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: nativeRadii[2],
                paddingHorizontal: nativeSpace[2],
                paddingVertical: nativeSpace[2],
              }}
            >
              <ChatRulesPanel chatContextId={rulesChatContextId} />
            </View>
          ) : null}
          <Input value={toolFilter} onChangeText={setToolFilter} placeholder="Filter tools…" />
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border.subtle,
              borderRadius: nativeRadii[3],
            }}
          >
            {visibleToolGroups.length === 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.text.secondary,
                  paddingHorizontal: nativeSpace[3],
                  paddingVertical: nativeSpace[4],
                }}
              >
                {tools.length === 0
                  ? 'No tools available for this context.'
                  : 'No tools match that filter.'}
              </Text>
            ) : (
              visibleToolGroups.map((group, gi) => (
                <View key={group.category}>
                  <View
                    style={{
                      paddingHorizontal: nativeSpace[3],
                      paddingVertical: nativeSpace[2],
                      backgroundColor: theme.surface.raised,
                      borderTopWidth: gi === 0 ? 0 : 1,
                      borderTopColor: theme.border.subtle,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        color: theme.text.muted,
                      }}
                    >
                      {group.category} · {group.tools.filter((t) => t.available).length} of{' '}
                      {group.tools.length} on
                    </Text>
                  </View>
                  {group.tools.map((tool) => (
                    <View
                      key={tool.name}
                      // Name + description on the left, the label-above-switch
                      // toggle on the right. The label above gives the switch
                      // enough breathing room to be tappable
                      // on touch without truncating the captions; matches web's
                      // settings dropdown layout 1:1.
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: nativeSpace[3],
                        paddingHorizontal: nativeSpace[3],
                        paddingVertical: nativeSpace[3],
                        borderTopWidth: 1,
                        borderTopColor: theme.border.subtle,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: theme.text.primary }} numberOfLines={1}>
                          {tool.name}
                        </Text>
                        {tool.description ? (
                          <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={2}>
                            {tool.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 10, color: theme.text.secondary }}>Available</Text>
                        <Switch
                          checked={tool.available}
                          onCheckedChange={() => void toggleAvailable(tool)}
                          disabled={!tool.toggleable}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>{children}</Text>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{value}</Text>
      </View>
      <Slider value={value} min={min} max={max} onChange={onChange} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>{min}</Text>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>{max}</Text>
      </View>
    </View>
  )
}
