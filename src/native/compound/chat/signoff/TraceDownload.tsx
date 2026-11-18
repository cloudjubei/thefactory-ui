import { Linking, Text, View } from 'react-native'
import { useReviewEvidenceMediaUrl, type EvidenceTile } from '../../../../headless'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { Button } from '../../../primitives/Button'

/** Download via the signed URL; do not expand a trace archive into a data URI. */
export default function TraceDownload({
  projectId,
  tile,
}: {
  projectId: string
  tile: EvidenceTile
}) {
  const { theme } = useNativeTheme()
  const { url, loading } = useReviewEvidenceMediaUrl(projectId, tile.ref.id)
  return (
    <View style={{ gap: 8, padding: 10 }}>
      <Text style={{ fontSize: 12, color: theme.text.primary }}>{tile.caption}</Text>
      <Button
        size="sm"
        disabled={!url}
        onPress={() =>
          url && void Linking.openURL(`${url}${url.includes('?') ? '&' : '?'}download=true`)
        }
      >
        {url ? 'Download Playwright trace' : loading ? 'Loading trace…' : 'Trace unavailable'}
      </Button>
    </View>
  )
}
