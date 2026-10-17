import { useState } from 'react'
import { Text, View } from 'react-native'
import type { ReferenceDescription, ResourceLink } from 'thefactory-tools/types'
import { designReferencePreview, useDesignPreview } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconMaximize } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import IconButton from '../../primitives/IconButton'
import Spinner from '../../primitives/Spinner'
import ReferenceChip from '../chips/ReferenceChip'
import DesignFileThumb from './DesignFileThumb'
import DesignFileViewer from './DesignFileViewer'

type DesignLink = Extract<ResourceLink, { kind: 'design' }>

export type DesignReferenceChipProps = {
  description: ReferenceDescription
  link: DesignLink
  onOpen?: (link: ResourceLink) => void
}

const PREVIEW_WIDTH = 280

function Preview({ link, onExpand }: { link: DesignLink; onExpand: () => void }) {
  const { theme } = useNativeTheme()
  const { index, isLoaded, contentUrl } = useDesignPreview(link.projectId)
  const shown = designReferencePreview(index, link)
  if (!isLoaded) return <Spinner size={18} />
  if (!shown) {
    return <Text style={{ fontSize: 12, color: theme.text.muted }}>Nothing to preview yet.</Text>
  }
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <DesignFileThumb shown={shown} src={contentUrl(shown)} width={PREVIEW_WIDTH} />
      <View
        style={{
          position: 'absolute',
          top: nativeSpace[2],
          right: nativeSpace[2],
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.raised,
        }}
      >
        <IconButton size="sm" accessibilityLabel={`Expand ${shown.name}`} onPress={onExpand}>
          <IconMaximize size={16} color={theme.text.primary} />
        </IconButton>
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: nativeSpace[3], fontSize: 12, color: theme.text.secondary }}
      >
        {shown.name}
      </Text>
    </View>
  )
}

function Viewer({ link, onClose }: { link: DesignLink; onClose: () => void }) {
  const { index, contentUrl } = useDesignPreview(link.projectId)
  const shown = designReferencePreview(index, link)
  return (
    <DesignFileViewer shown={shown} src={shown ? contentUrl(shown) : undefined} onClose={onClose} />
  )
}

/**
 * Native peer of web's `DesignReferenceChip`: a design screen or state a text
 * points at. A tap opens it in the Design tab; a long press — where web shows
 * the miniature on hover — opens a sheet with the miniature (the state's
 * current look, or for a screen its first state's) and a control that expands
 * it full screen.
 */
export default function DesignReferenceChip({
  description,
  link,
  onOpen,
}: DesignReferenceChipProps) {
  const { theme } = useNativeTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const missing = description.missing === true
  return (
    <>
      <ReferenceChip
        description={description}
        {...(onOpen ? { onOpen } : {})}
        {...(missing ? {} : { onLongPress: () => setSheetOpen(true) })}
      />
      {missing ? null : (
        <BottomSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={description.label}
          footer={
            onOpen ? (
              <Button
                variant="primary"
                onPress={() => {
                  setSheetOpen(false)
                  onOpen(link)
                }}
              >
                Open in Design
              </Button>
            ) : undefined
          }
        >
          <View style={{ gap: nativeSpace[4], paddingBottom: nativeSpace[4] }}>
            {description.detail ? (
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                {description.detail}
              </Text>
            ) : null}
            <Preview
              link={link}
              onExpand={() => {
                setSheetOpen(false)
                setExpanded(true)
              }}
            />
          </View>
        </BottomSheet>
      )}
      {expanded ? <Viewer link={link} onClose={() => setExpanded(false)} /> : null}
    </>
  )
}
