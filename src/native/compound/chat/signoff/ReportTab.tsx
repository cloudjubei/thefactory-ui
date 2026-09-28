import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  fileNameSlug,
  orderReports,
  reportProvenance,
  type EvidenceTile,
} from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { IconDownload } from '../../../icons'
import { Button } from '../../../primitives/Button'
import HelpChip from '../../chips/HelpChip'
import Markdown from '../../Markdown'
import type { SaveFileHandler } from './signoffTypes'

export type ReportTabProps = {
  reports: readonly EvidenceTile[]
  /** Saves a report as markdown; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
}

function ReportCard({
  report,
  onSaveFile,
}: {
  report: EvidenceTile
  onSaveFile?: SaveFileHandler
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
      >
        <HelpChip label="How this report was produced">
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
            Where this came from
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.primary }}>
            {reportProvenance(report.ref)}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {report.unvouched
              ? report.unvouched.text
              : 'Filed as evidence on this run, so it cannot be edited afterwards.'}
          </Text>
        </HelpChip>
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
        <Markdown text={report.text} />
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>Loading the report…</Text>
      )}
    </View>
  )
}

/**
 * A written account — ONE report, not a wall. The report step's own account
 * leads, then the latest; earlier ones fold behind a disclosure. Each card
 * credits the step that wrote it.
 */
export default function ReportTab({ reports, onSaveFile }: ReportTabProps) {
  const { theme } = useNativeTheme()
  const [showEarlier, setShowEarlier] = useState(false)
  if (reports.length === 0) return null
  const [latest, ...earlier] = orderReports(reports)
  return (
    <View style={{ gap: 8 }}>
      <ReportCard report={latest} {...(onSaveFile ? { onSaveFile } : {})} />
      {earlier.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setShowEarlier((v) => !v)} accessibilityRole="button">
            <Text style={{ fontSize: 11.5, color: theme.accent.primary }}>
              {showEarlier ? 'Hide' : 'Show'} {earlier.length} earlier report
              {earlier.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
          {showEarlier
            ? earlier.map((report) => (
                <ReportCard
                  key={report.ref.id}
                  report={report}
                  {...(onSaveFile ? { onSaveFile } : {})}
                />
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}
