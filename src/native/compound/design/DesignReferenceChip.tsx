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
import DesignItemThumb from './DesignItemThumb'
import DesignItemViewer from './DesignItemViewer'

type DesignLink = Extract<ResourceLink, { kind: 'design' }>

export type DesignReferenceChipProps = {
  description: ReferenceDescription
  link: DesignLink
  onOpen?: (link: ResourceLink) => void
}

const PREVIEW_WIDTH = 280

function Preview({ link, onExpand }: { link: DesignLink; onExpand: (itemId: string) => void }) {
  const { theme } = useNativeTheme()
  const { tree, isLoaded, contentUrl } = useDesignPreview(link.projectId)
  const item = designReferencePreview(tree, link)
  if (!isLoaded) return <Spinner size={18} />
  if (!item) {
    return <Text style={{ fontSize: 12, color: theme.text.muted }}>Nothing to preview yet.</Text>
  }
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <DesignItemThumb item={item} src={contentUrl(item.id)} width={PREVIEW_WIDTH} />
      <View
        style={{
          position: 'absolute',
          top: nativeSpace[2],
          right: nativeSpace[2],
          borderRadius: nativeRadii[2],
          backgroundColor: theme.surface.raised,
        }}
      >
        <IconButton
          size="sm"
          accessibilityLabel={`Expand ${item.name}`}
          onPress={() => onExpand(item.id)}
        >
          <IconMaximize size={16} color={theme.text.primary} />
        </IconButton>
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: nativeSpace[3], fontSize: 12, color: theme.text.secondary }}
      >
        {item.name}
      </Text>
    </View>
  )
}

function Viewer({
  projectId,
  itemId,
  onClose,
}: {
  projectId: string
  itemId: string
  onClose: () => void
}) {
  const { tree, contentUrl } = useDesignPreview(projectId)
  const item = designReferencePreview(tree, { itemId })
  return <DesignItemViewer item={item} src={contentUrl(itemId)} onClose={onClose} />
}

/**
 * Native peer of web's `DesignReferenceChip`: a design screen or item a text
 * points at. A tap opens it in the Design tab; a long press — where web shows
 * the miniature on hover — opens a sheet with the miniature (the approved
 * design for a screen, else its latest built version) and a control that
 * expands it full screen.
 */
export default function DesignReferenceChip({
  description,
  link,
  onOpen,
}: DesignReferenceChipProps) {
  const { theme } = useNativeTheme()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | undefined>(undefined)
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
              onExpand={(itemId) => {
                setSheetOpen(false)
                setExpanded(itemId)
              }}
            />
          </View>
        </BottomSheet>
      )}
      {expanded ? (
        <Viewer
          projectId={link.projectId}
          itemId={expanded}
          onClose={() => setExpanded(undefined)}
        />
      ) : null}
    </>
  )
}
