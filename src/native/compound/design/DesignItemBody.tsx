import { useEffect, useState, type ReactNode } from 'react'
import { Linking, ScrollView, Text, View } from 'react-native'
import {
  DESIGN_TEXT,
  designItemFileName,
  designItemMediaType,
  designItemViewKind,
  formatBytes,
} from '../../../headless'
import type { DesignItem } from '../../../headless/api'
import { nativeFontFamilies, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconExternalLink } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import FileTypeIcon from '../files/FileTypeIcon'
import ImageViewer from '../files/ImageViewer'
import { useDesignHost } from './DesignHostContext'

export type DesignItemBodyProps = {
  item: DesignItem
  /** The item's file with a view token; `undefined` while the token is minted. */
  src: string | undefined
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: nativeSpace[12],
        gap: nativeSpace[6],
      }}
    >
      {children}
    </View>
  )
}

function OpenButton({ url }: { url: string }) {
  return (
    <Button variant="secondary" onPress={() => void Linking.openURL(url)}>
      {DESIGN_TEXT.openExternally}
    </Button>
  )
}

function TextBody({ src }: { src: string }) {
  const { theme, status } = useNativeTheme()
  const [state, setState] = useState<{ text?: string; error?: string }>({})
  useEffect(() => {
    let alive = true
    setState({})
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Could not read the file (${r.status}).`)
        return r.text()
      })
      .then((text) => {
        if (alive) setState({ text })
      })
      .catch((err: unknown) => {
        if (alive) setState({ error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      alive = false
    }
  }, [src])
  if (state.error) {
    return (
      <Centered>
        <Text style={{ fontSize: 13, color: status.stuck.softFg }}>{state.error}</Text>
      </Centered>
    )
  }
  if (state.text === undefined) {
    return (
      <Centered>
        <Spinner size={20} />
      </Centered>
    )
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: nativeSpace[8] }}>
      <Text
        selectable
        style={{ fontFamily: nativeFontFamilies.mono, fontSize: 12, color: theme.text.primary }}
      >
        {state.text}
      </Text>
    </ScrollView>
  )
}

function FilePanel({ item, src }: { item: DesignItem; src: string }) {
  const { theme } = useNativeTheme()
  const fileName = designItemFileName(item)
  const size = item.source.type === 'blob' ? formatBytes(item.source.bytes) : null
  return (
    <Centered>
      <FileTypeIcon path={fileName} size={48} />
      <Text
        style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, textAlign: 'center' }}
      >
        {fileName}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center' }}>
        {[designItemMediaType(item), size].filter(Boolean).join(' · ')}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted, textAlign: 'center' }}>
        {DESIGN_TEXT.notPreviewable}
      </Text>
      <OpenButton url={src} />
    </Centered>
  )
}

/**
 * Native peer of web's `DesignItemBody`: one design item as it is stored or was
 * captured — an image to fit and pinch-zoom, a page, a PDF or a video through
 * the host's views, text, a link to open, or a file to open outside the app.
 * What the viewer and the compare show for each side.
 */
export default function DesignItemBody({ item, src }: DesignItemBodyProps) {
  const { theme } = useNativeTheme()
  const host = useDesignHost()
  if (item.source.type === 'link') {
    const url = item.source.url
    return (
      <Centered>
        <IconExternalLink size={32} color={theme.text.muted} />
        <Text
          selectable
          style={{ fontSize: 13, color: theme.accent.primary, textAlign: 'center' }}
          onPress={() => void Linking.openURL(url)}
        >
          {url}
        </Text>
        <Button variant="primary" onPress={() => void Linking.openURL(url)}>
          {DESIGN_TEXT.openExternally}
        </Button>
      </Centered>
    )
  }
  if (!src) {
    return (
      <Centered>
        <Spinner size={20} />
      </Centered>
    )
  }
  switch (designItemViewKind(item)) {
    case 'image':
      return <ImageViewer uri={src} />
    case 'html':
      return host.renderPage ? (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {host.renderPage(src, { interactive: true })}
        </View>
      ) : (
        <FilePanel item={item} src={src} />
      )
    case 'pdf':
      return host.renderPdf ? <>{host.renderPdf(src)}</> : <FilePanel item={item} src={src} />
    case 'video':
      return host.renderVideo ? <>{host.renderVideo(src)}</> : <FilePanel item={item} src={src} />
    case 'text':
      return <TextBody src={src} />
    default:
      return <FilePanel item={item} src={src} />
  }
}
