import { Pressable, Text, View } from 'react-native'

import {
  PROCESS_WAIT_FOR_LAUNCH_COPY as COPY,
  addProcessWaitForDraft,
  processWaitForDraftRows,
  removeProcessWaitForDraft,
  updateProcessWaitForDraft,
  type ProcessWaitForDrafts,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

export type LaunchWaitFieldsProps = {
  drafts: ProcessWaitForDrafts
  onChange: (next: ProcessWaitForDrafts) => void
  /** Why the launch refuses the wait — the preview's reason, else the card's own reading. */
  problem?: string
  /** The preview is reading what was typed. */
  checking?: boolean
  /** Where the preview put the wait in the plan. */
  planLine?: string
  /** The projects whose base an entry may name; without them every entry is the run's own. */
  projects?: readonly { id: string; title: string }[]
  busy?: boolean
}

/**
 * Native peer of web's `LaunchWaitFields`: "Wait for other work before proof",
 * folded to one dashed pill until used, then a block per entry — its label, a
 * branch, commit or pull request link read by its shape, the project whose
 * base must hold it — what the launch refuses, and where the plan waits.
 */
export default function LaunchWaitFields({
  drafts,
  onChange,
  problem,
  checking = false,
  planLine,
  projects,
  busy = false,
}: LaunchWaitFieldsProps) {
  const { theme, status } = useNativeTheme()
  if (drafts.rows.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => onChange(addProcessWaitForDraft(drafts))}
        style={{
          alignSelf: 'flex-start',
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.border.strong,
          borderRadius: nativeRadii.round,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[2],
        }}
      >
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>+ {COPY.add}</Text>
      </Pressable>
    )
  }
  const rows = processWaitForDraftRows(drafts)
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {COPY.heading}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{COPY.hint}</Text>
      {rows.map((row) => (
        <View
          key={row.key}
          style={{
            gap: nativeSpace[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: nativeRadii[2],
            padding: nativeSpace[2],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View style={{ flex: 1 }}>
              <Input
                size="sm"
                accessibilityLabel={COPY.label}
                value={row.label}
                disabled={busy}
                placeholder={COPY.labelPlaceholder}
                onChangeText={(label) =>
                  onChange(updateProcessWaitForDraft(drafts, row.key, { label }))
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={COPY.remove}
              disabled={busy}
              hitSlop={8}
              onPress={() => onChange(removeProcessWaitForDraft(drafts, row.key))}
            >
              <Text style={{ fontSize: 18, color: theme.text.muted }}>×</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View style={{ flex: 1 }}>
              <Input
                size="sm"
                accessibilityLabel={COPY.target}
                autoCapitalize="none"
                autoCorrect={false}
                value={row.target}
                disabled={busy}
                placeholder={COPY.targetPlaceholder}
                onChangeText={(target) =>
                  onChange(updateProcessWaitForDraft(drafts, row.key, { target }))
                }
              />
            </View>
            {row.kindLabel ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{row.kindLabel}</Text>
            ) : null}
          </View>
          {projects && projects.length > 0 ? (
            <Select
              value={row.projectId ?? ''}
              onValueChange={(projectId) =>
                onChange(
                  updateProcessWaitForDraft(drafts, row.key, { projectId: projectId || undefined }),
                )
              }
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder={COPY.ownProject} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{COPY.ownProject}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => onChange(addProcessWaitForDraft(drafts))}
        style={{ alignSelf: 'flex-start' }}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
          + {COPY.addAnother}
        </Text>
      </Pressable>
      {problem ? (
        <Alert variant="error">{problem}</Alert>
      ) : checking ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{COPY.checking}</Text>
      ) : planLine ? (
        <Text style={{ fontSize: 12, color: status.queued.softFg }}>{planLine}</Text>
      ) : null}
    </View>
  )
}
