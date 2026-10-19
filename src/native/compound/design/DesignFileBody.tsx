import { useEffect, useState, type ReactNode } from 'react'
import { Linking, ScrollView, Text, View } from 'react-native'
import {
  DESIGN_TEXT,
  designSourceFileName,
  designSourceMediaType,
  designViewKind,
  formatBytes,
  type DesignShown,
} from '../../../headless'
import { nativeFontFamilies, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconDownload, IconExternalLink } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import FileTypeIcon from '../files/FileTypeIcon'
import ImageViewer from '../files/ImageViewer'
import { useDesignHost } from './DesignHostContext'

export type DesignFileBodyProps = {
  shown: DesignShown
  /** The file with a view token; `undefined` while the token is minted. */
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

function FilePanel({ shown, src }: { shown: DesignShown; src: string }) {
  const { theme } = useNativeTheme()
  const { downloadFile } = useDesignHost()
  const { source } = shown
  const fileName = designSourceFileName(source)
  const size = source.type === 'blob' ? formatBytes(source.bytes) : null
  return (
    <Centered>
      <FileTypeIcon path={fileName} size={48} />
      <Text
        style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary, textAlign: 'center' }}
      >
        {fileName}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center' }}>
        {[designSourceMediaType(source), size].filter(Boolean).join(' · ')}
      </Text>
      <Text style={{ fontSize: 12, color: theme.text.muted, textAlign: 'center' }}>
        {DESIGN_TEXT.notPreviewable}
      </Text>
      <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
        {downloadFile ? (
          <Button variant="secondary" onPress={() => void downloadFile(src, fileName)}>
            <IconDownload size={16} color={theme.text.primary} />
            {DESIGN_TEXT.download}
          </Button>
        ) : null}
        <OpenButton url={src} />
      </View>
    </Centered>
  )
}

/**
 * Native peer of web's `DesignFileBody`: one design file as it is stored or was
 * captured — an image to fit and pinch-zoom, a page (a draft case at its own
 * address), a PDF or a video through the host's views, text, a link to open, or
 * a file to open outside the app. What the viewer and the compare show for each
 * side.
 */
export default function DesignFileBody({ shown, src }: DesignFileBodyProps) {
  const { theme } = useNativeTheme()
  const host = useDesignHost()
  const { source } = shown
  if (source.type === 'link') {
    const url = source.url
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
  switch (designViewKind(source)) {
    case 'image':
      return <ImageViewer uri={src} />
    case 'html':
      return host.renderPage ? (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {host.renderPage(src, { interactive: true })}
        </View>
      ) : (
        <FilePanel shown={shown} src={src} />
      )
    case 'pdf':
      return host.renderPdf ? <>{host.renderPdf(src)}</> : <FilePanel shown={shown} src={src} />
    case 'video':
      return host.renderVideo ? <>{host.renderVideo(src)}</> : <FilePanel shown={shown} src={src} />
    case 'text':
      return <TextBody src={src} />
    default:
      return <FilePanel shown={shown} src={src} />
  }
}
