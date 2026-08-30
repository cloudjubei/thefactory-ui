import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Switch } from '../../primitives/Switch'
import { partitionGrants } from '../../../headless/utils/agentQuestions'
import type { PendingToolGrant } from '../../../headless'
import type { PendingToolConfirmationLike } from '../../../headless/utils/chatTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ToolConfirmationModalProps {
  pending: PendingToolConfirmationLike | null
  busy: boolean
  onConfirm: (grantedToolCallIds: string[]) => Promise<void> | void
  onCancel: () => void
  /**
   * Unified tool-approval feed spanning both the API confirmation path and the
   * CLI permission broker. When provided, the modal renders each grant as its
   * own row with per-grant Allow / Deny actions (plus "Allow permanently" for
   * CLI grants) and the {@link pending}/{@link onConfirm} path is ignored.
   * `askUser` question grants are filtered out: they render inline as an
   * `AgentQuestionCard`, never as a permission prompt.
   */
  grants?: PendingToolGrant[]
}

function formatJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Native peer of
 * [web's `ToolConfirmationModal`](../../../web/compound/chat/ToolConfirmationModal.tsx).
 * Surfaces the proposed tool calls when the backend returns
 * `require_confirmation` from `sendCompletionWithTools` / `resumeCompletion`.
 * Each tool call is granted individually by `toolCallId`; the resume request
 * uses that list to decide which ones run.
 */
export default function ToolConfirmationModal({
  pending,
  busy,
  onConfirm,
  onCancel,
  grants: allGrants,
}: ToolConfirmationModalProps) {
  const { theme } = useNativeTheme()
  const [granted, setGranted] = useState<Record<string, boolean>>({})
  const grants = allGrants ? partitionGrants(allGrants).permissions : undefined

  // Reset selection whenever a new wave of tools arrives — the toolCallIds
  // change between waves, so prior choices are meaningless.
  useEffect(() => {
    if (!pending) return
    const next: Record<string, boolean> = {}
    for (const t of pending.toolCalls) next[t.toolCallId] = true
    setGranted(next)
  }, [pending])

  const grantedIds = useMemo(
    () =>
      Object.entries(granted)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [granted],
  )

  if (grants) {
    if (grants.length === 0) return null
    return (
      <Modal
        isOpen
        onClose={onCancel}
        title="The agent wants to run tools"
        size="lg"
        footer={
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: nativeSpace[2],
              flexWrap: 'wrap',
            }}
          >
            <Button variant="ghost" onPress={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onPress={() => grants.forEach((g) => void g.decide('deny'))}
              disabled={busy}
            >
              Deny all
            </Button>
            <Button
              onPress={() => grants.forEach((g) => void g.decide('once'))}
              loading={busy}
              disabled={grants.length === 0}
            >
              Allow all
            </Button>
          </View>
        }
      >
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: nativeSpace[2] }}>
          {grants.map((grant) => (
            <View
              key={grant.id}
              style={{
                padding: nativeSpace[3],
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.muted,
                gap: nativeSpace[2],
              }}
            >
              <Text
                style={{
                  fontFamily: 'Courier',
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text.primary,
                }}
              >
                {grant.label}
              </Text>
              {grant.detail !== undefined ? (
                <ScrollView
                  style={{ maxHeight: 160 }}
                  contentContainerStyle={{ padding: nativeSpace[2] }}
                >
                  <Text
                    selectable
                    style={{ fontFamily: 'Courier', fontSize: 12, color: theme.text.secondary }}
                  >
                    {formatJson(grant.detail)}
                  </Text>
                </ScrollView>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: nativeSpace[2],
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => void grant.decide('deny')}
                  disabled={busy}
                >
                  Deny
                </Button>
                <Button size="sm" onPress={() => void grant.decide('once')} disabled={busy}>
                  Allow
                </Button>
                {grant.source === 'cli' && grant.canGrantPermanently !== false ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => void grant.decide('permanent')}
                    disabled={busy}
                  >
                    Allow permanently
                  </Button>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </Modal>
    )
  }

  if (!pending) return null

  const allOn = pending.toolCalls.every((t) => granted[t.toolCallId])
  const noneOn = pending.toolCalls.every((t) => !granted[t.toolCallId])

  const setAll = (value: boolean) =>
    setGranted(Object.fromEntries(pending.toolCalls.map((t) => [t.toolCallId, value])))

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="The agent wants to run tools"
      size="lg"
      footer={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: nativeSpace[2],
            flexWrap: 'wrap',
          }}
        >
          <Button variant="ghost" onPress={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="secondary" onPress={() => void onConfirm([])} disabled={busy}>
            Deny all
          </Button>
          <Button onPress={() => void onConfirm(grantedIds)} loading={busy} disabled={noneOn}>
            {allOn ? 'Allow all' : `Allow ${grantedIds.length}`}
          </Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          Untick any tool you don&apos;t want to run. Denied tools come back to the agent as{' '}
          <Text style={{ fontFamily: 'Courier', fontSize: 12 }}>not_allowed</Text>; the agent will
          adjust and may propose different tools next turn.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
          <Pressable onPress={() => setAll(true)} hitSlop={6}>
            <Text style={{ fontSize: 12, color: theme.accent.primary }}>Select all</Text>
          </Pressable>
          <Pressable onPress={() => setAll(false)} hitSlop={6}>
            <Text style={{ fontSize: 12, color: theme.accent.primary }}>Select none</Text>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: nativeSpace[2] }}>
          {pending.toolCalls.map((tc) => (
            <View
              key={tc.toolCallId}
              style={{
                padding: nativeSpace[3],
                borderRadius: nativeRadii[3],
                borderWidth: 1,
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.muted,
                gap: nativeSpace[2],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
                <Switch
                  checked={granted[tc.toolCallId] ?? false}
                  onCheckedChange={() =>
                    setGranted((prev) => ({ ...prev, [tc.toolCallId]: !prev[tc.toolCallId] }))
                  }
                />
                <Text
                  style={{
                    fontFamily: 'Courier',
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.text.primary,
                  }}
                >
                  {tc.name}
                </Text>
              </View>
              {tc.arguments !== undefined ? (
                <ScrollView
                  style={{ maxHeight: 160 }}
                  contentContainerStyle={{ padding: nativeSpace[2] }}
                >
                  <Text
                    selectable
                    style={{
                      fontFamily: 'Courier',
                      fontSize: 12,
                      color: theme.text.secondary,
                    }}
                  >
                    {formatJson(tc.arguments)}
                  </Text>
                </ScrollView>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}
