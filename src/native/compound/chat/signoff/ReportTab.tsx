import { Text, View } from 'react-native'

import { fileNameSlug, type EvidenceTile } from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconDownload } from '../../../icons'
import { Button } from '../../../primitives/Button'
import HelpChip from '../../chips/HelpChip'
import type { SaveFileHandler } from './signoffTypes'

export type ReportTabProps = {
  reports: readonly EvidenceTile[]
  /** Saves a report as markdown; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
}

/**
 * The verifier's written account. The `?` explains provenance — who wrote it and
 * that it is filed, not editable.
 */
export default function ReportTab({ reports, onSaveFile }: ReportTabProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 8 }}>
      {reports.map((report) => (
        <View
          key={report.ref.id}
          style={{
            gap: 8,
            padding: 12,
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.raised,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: theme.text.muted,
              }}
            >
              Written by the verifier
            </Text>
            <HelpChip label="How this report was produced">
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
                Where this came from
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.primary }}>
                The verifier agent wrote it as its closing step, after building and driving the app.
                It is that agent's own account of what it did — not a summary of the diff, and not
                written by the agent that made the change.
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                Filed as evidence on this run, so it cannot be edited afterwards.
              </Text>
            </HelpChip>
            <View style={{ flex: 1 }} />
            {onSaveFile && report.text ? (
              <Button
                variant="secondary"
                size="icon"
                accessibilityLabel="Save as markdown"
                onPress={() =>
                  void onSaveFile({
                    name: `${fileNameSlug(report.caption, 'report')}.md`,
                    dataUri: `data:text/markdown;charset=utf-8,${encodeURIComponent(report.text ?? '')}`,
                  })
                }
              >
                <IconDownload size={16} color={theme.text.primary} />
              </Button>
            ) : null}
          </View>
          {report.text ? (
            <Text
              selectable
              style={{ fontSize: 12.5, lineHeight: 20, color: theme.text.secondary }}
            >
              {report.text}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: theme.text.muted }}>Loading the report…</Text>
          )}
        </View>
      ))}
    </View>
  )
}
