import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { FilesProvider, useEvidenceReference, type EvidenceLink } from 'thefactory-ui/headless'
import EvidenceTargetOverlay from '../../src/native/compound/chat/EvidenceTargetOverlay'
import { MediaHostProvider } from '../../src/native/compound/chat/signoff/MediaHostContext'
import EvidenceReferenceChip from '../../src/native/compound/chips/EvidenceReferenceChip'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import EvidenceView from '../../src/native/screens/EvidenceView'
import { EVIDENCE_LINKS, EVIDENCE_ROUTES, EVIDENCE_TEXT } from '../scenes/evidenceLinksFixtures'
import { OnFixtures } from '../scenes/onFixtures'
import { RUN_THROUGH_PLAYER } from './runThroughViews'
import type { NativeView } from './views'

const noop = () => {}

type Part = string | EvidenceLink

/** The agent's message split where it cites an item, each cited item drawn as its chip. */
function Message({ parts }: { parts: readonly Part[] }) {
  const { theme } = useNativeTheme()
  return (
    <Text style={{ fontSize: 14, lineHeight: 24, color: theme.text.primary }}>
      {parts.map((part, at) =>
        typeof part === 'string' ? (
          part
        ) : (
          <EvidenceReferenceChip key={at} link={part} onOpen={noop} />
        ),
      )}
    </Text>
  )
}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <OnFixtures routes={EVIDENCE_ROUTES}>
      <FilesProvider>
        <MediaHostProvider value={RUN_THROUGH_PLAYER}>
          <ScrollView style={{ flex: 1, backgroundColor: theme.surface.base }}>
            <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
          </ScrollView>
        </MediaHostProvider>
      </FilesProvider>
    </OnFixtures>
  )
}

function Chat({ ask, parts }: { ask: string; parts: readonly Part[] }) {
  const { theme } = useNativeTheme()
  return (
    <Phone>
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: theme.accent.primary,
        }}
      >
        <Text style={{ fontSize: 14, color: theme.text.onAccent }}>{ask}</Text>
      </View>
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Message parts={parts} />
      </View>
    </Phone>
  )
}

function Opened({ link }: { link: EvidenceLink }) {
  const { view } = useEvidenceReference(link)
  return view?.open ? <EvidenceTargetOverlay target={view.open} onClose={noop} /> : null
}

const CHAT: readonly Part[] = [
  'I played a full hot-seat game, menu to result. ',
  EVIDENCE_LINKS.shot,
  ' names the winner but shows no points, so I filed ',
  EVIDENCE_LINKS.issue,
  '. The turn also passes before a move finishes, at ',
  EVIDENCE_LINKS.moment,
  '.',
]

const MISSING: readonly Part[] = [
  'The first menu screenshot, ',
  EVIDENCE_LINKS.gone,
  ', was cleared with that run. The menu as it is now shows at ',
  { ...EVIDENCE_LINKS.moment, at: 8 },
  '.',
]

const STATES: Record<string, () => ReactNode> = {
  chat: () => <Chat ask={EVIDENCE_TEXT.ask} parts={CHAT} />,
  missing: () => <Chat ask={EVIDENCE_TEXT.missingAsk} parts={MISSING} />,
  'open-shot': () => (
    <Phone>
      <Opened link={EVIDENCE_LINKS.shot} />
    </Phone>
  ),
  'open-moment': () => (
    <Phone>
      <Opened link={EVIDENCE_LINKS.moment} />
    </Phone>
  ),
  'page-issue': () => (
    <Phone>
      <EvidenceView
        projectId={EVIDENCE_LINKS.issue.projectId}
        evidenceId={EVIDENCE_LINKS.issue.evidenceId}
      />
    </Phone>
  ),
  'page-gone': () => (
    <Phone>
      <EvidenceView
        projectId={EVIDENCE_LINKS.gone.projectId}
        evidenceId={EVIDENCE_LINKS.gone.evidenceId}
      />
    </Phone>
  ),
}

export const EVIDENCE_LINK_VIEWS: readonly NativeView[] = [
  {
    id: 'evidence-links',
    title:
      'Evidence links in text (?state=chat|missing|open-shot|open-moment|page-issue|page-gone, ?theme=dark)',
    render: (address) => (STATES[address.get('state') ?? ''] ?? STATES.chat!)(),
  },
]
