import type { ReactNode } from 'react'
import { FilesProvider, useEvidenceReference, type EvidenceLink } from 'thefactory-ui/headless'
import { Markdown, ReferenceRenderingProvider } from 'thefactory-ui/web'
// Not on the package's public surface as a scene needs them: the showcase reaches into the
// source, as the playground renders the library from source.
import EvidenceTargetOverlay from '../../src/web/compound/chat/EvidenceTargetOverlay'
import RunThroughTab from '../../src/web/compound/chat/signoff/RunThroughTab'
import EvidencePreviewCard from '../../src/web/compound/chips/EvidencePreviewCard'
import EvidenceView from '../../src/web/screens/EvidenceView'
import type { Scene } from '../showcase/types'
import {
  EVIDENCE_LINKS,
  EVIDENCE_PROJECT,
  EVIDENCE_ROUTES,
  EVIDENCE_TEXT,
} from './evidenceLinksFixtures'
import { OnFixtures } from './onFixtures'
import { RUN_THROUGH_PROJECT, RUN_THROUGH_ROUTES, runThroughView } from './runThroughFixtures'

const noop = () => {}
const DESKTOP = 'w-[1100px]'
const PHONE = 'w-[390px]'

/** The project's references drawn as the app draws them, reading the cited items in the page. */
function Cited({ children }: { children: ReactNode }) {
  return (
    <OnFixtures routes={EVIDENCE_ROUTES}>
      <FilesProvider>
        <ReferenceRenderingProvider projectId={EVIDENCE_PROJECT} onOpen={noop}>
          {children}
        </ReferenceRenderingProvider>
      </FilesProvider>
    </OnFixtures>
  )
}

function Chat({ ask, text, width }: { ask: string; text: string; width: string }) {
  return (
    <div className={`${width} max-w-full p-4`}>
      <Cited>
        <div className="flex flex-col gap-4 rounded-xl border border-(--border-subtle) bg-(--surface-base) p-4">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-(--accent-primary) px-3.5 py-2 text-[14px] text-(--text-on-accent)">
              {ask}
            </div>
          </div>
          <div className="max-w-[720px] rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2.5 text-[14px] leading-7 text-(--text-primary)">
            <Markdown text={text} />
          </div>
        </div>
      </Cited>
    </div>
  )
}

function Report({ width }: { width: string }) {
  return (
    <div className={`${width} max-w-full p-4`}>
      <Cited>
        <div className="flex flex-col gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-5">
          <div className="text-[12.5px] text-(--text-secondary)">
            <b className="text-(--text-primary)">Sign-off</b> · Hot-seat play · story run
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-(--border-subtle) pt-3 sm:grid-cols-[150px_minmax(0,1fr)]">
            <span className="text-[13px] font-semibold text-(--text-primary)">Outcome</span>
            <div className="flex flex-col gap-2 text-[13px] leading-7 text-(--text-secondary)">
              <span>Hot-seat games run from the menu to the result screen</span>
              <Markdown text={EVIDENCE_TEXT.report} />
            </div>
          </div>
        </div>
      </Cited>
    </div>
  )
}

/** The preview a chip's hover shows, as it reads once the item and its run's filings are in. */
function Preview({ link }: { link: EvidenceLink }) {
  const { view } = useEvidenceReference(link, { withIssue: true })
  return view ? (
    <div className="w-fit rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3 shadow-lg">
      <EvidencePreviewCard view={view} onOpenTarget={noop} />
    </div>
  ) : null
}

function Previews() {
  return (
    <div className="flex flex-wrap items-start gap-4 p-4">
      <Cited>
        <Preview link={EVIDENCE_LINKS.issue} />
        <Preview link={EVIDENCE_LINKS.shot} />
        <Preview link={EVIDENCE_LINKS.moment} />
        <Preview link={EVIDENCE_LINKS.gone} />
      </Cited>
    </div>
  )
}

/** What a chip's click opens, in place over the page. */
function Opened({ link }: { link: EvidenceLink }) {
  const { view } = useEvidenceReference(link)
  return view?.open ? <EvidenceTargetOverlay target={view.open} onClose={noop} /> : null
}

function Page({ link, width }: { link: EvidenceLink; width: string }) {
  return (
    <div className={`${width} max-w-full`}>
      <Cited>
        <EvidenceView
          projectId={link.projectId}
          evidenceId={link.evidenceId}
          {...(link.at !== undefined ? { at: link.at } : {})}
          onBack={noop}
        />
      </Cited>
    </div>
  )
}

export const EVIDENCE_LINK_SCENES: Scene[] = [
  {
    id: 'evidence-links',
    title: 'Evidence links in text',
    component: 'EvidenceReferenceChip',
    group: 'Chat',
    wide: true,
    description:
      'An agent cites a screenshot, a flagged issue or a moment of a recording as `&<projectId>/evidence/<evidenceId>[@<seconds>]`; chats and reports show it as a chip in the text — its kind, short title, the time of a moment, an issue’s severity. Hover shows the preview (what happened, where, the screenshot, and Open screenshot / Play m:ss); a click opens the screenshot large or the recording at the moment. Something no longer kept reads calmly as not kept. Read through `GET /review-evidence/resolve`, once per item.',
    states: [
      {
        id: 'chat-desktop',
        title: 'In a chat message',
        render: () => <Chat ask={EVIDENCE_TEXT.ask} text={EVIDENCE_TEXT.chat} width={DESKTOP} />,
      },
      {
        id: 'chat-phone',
        title: 'In a chat message, phone',
        render: () => <Chat ask={EVIDENCE_TEXT.ask} text={EVIDENCE_TEXT.chat} width={PHONE} />,
      },
      {
        id: 'report-desktop',
        title: 'In a report',
        render: () => <Report width={DESKTOP} />,
      },
      {
        id: 'report-phone',
        title: 'In a report, phone',
        render: () => <Report width={PHONE} />,
      },
      {
        id: 'previews',
        title: 'What hover shows: an issue, a screenshot, a moment, something gone',
        render: () => <Previews />,
      },
      {
        id: 'missing-desktop',
        title: 'Something no longer kept',
        render: () => (
          <Chat ask={EVIDENCE_TEXT.missingAsk} text={EVIDENCE_TEXT.missing} width={DESKTOP} />
        ),
      },
      {
        id: 'missing-phone',
        title: 'Something no longer kept, phone',
        render: () => (
          <Chat ask={EVIDENCE_TEXT.missingAsk} text={EVIDENCE_TEXT.missing} width={PHONE} />
        ),
      },
      {
        id: 'open-shot',
        title: 'The screenshot opened large',
        overlay: true,
        render: () => (
          <Cited>
            <Opened link={EVIDENCE_LINKS.shot} />
          </Cited>
        ),
      },
      {
        id: 'open-moment',
        title: 'The recording opened at 1:30',
        overlay: true,
        render: () => (
          <Cited>
            <Opened link={EVIDENCE_LINKS.moment} />
          </Cited>
        ),
      },
      {
        id: 'page-issue',
        title: 'The evidence page, for an issue',
        render: () => <Page link={EVIDENCE_LINKS.issue} width={DESKTOP} />,
      },
      {
        id: 'page-gone',
        title: 'The evidence page, for something gone, phone',
        render: () => <Page link={EVIDENCE_LINKS.gone} width={PHONE} />,
      },
      {
        id: 'run-through-copy',
        title: 'Run-through issues carry their reference to copy',
        render: () => (
          <div className={`${DESKTOP} max-w-full p-4`}>
            <OnFixtures routes={RUN_THROUGH_ROUTES}>
              <RunThroughTab projectId={RUN_THROUGH_PROJECT} view={runThroughView('mixed')} />
            </OnFixtures>
          </div>
        ),
      },
    ],
  },
]
