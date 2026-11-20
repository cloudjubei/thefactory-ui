import { useEffect, useRef, useState } from 'react'
import type { AppNote } from 'thefactory-ui/headless'
import { ChatInput, ProjectAppView } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

export const SAMPLE_APP_NOTES: AppNote[] = [
  {
    id: 'app-note-1',
    projectId: 'sample',
    comment: 'Make the renewal date easier to find.',
    targets: [
      {
        kind: 'element',
        selector: '#renewal',
        outerHtml: '<p id="renewal">Renews November 20</p>',
      },
    ],
  },
  {
    id: 'app-note-2',
    projectId: 'sample',
    comment: 'Explain what is included before this action.',
    targets: [
      {
        kind: 'element',
        selector: '[data-testid="upgrade"]',
        outerHtml: '<button data-testid="upgrade">Upgrade</button>',
      },
    ],
  },
]

// Fixed fake app: no backend, clock or timers. Settles on a renewal date and Upgrade button.
// This mirrors the shared bridge pick.set / pick.selected transport, not its selector algorithm.
const PAGE = `<!doctype html><html><body style="font:16px system-ui;padding:72px 20px;background:#f4f5f7;color:#17202a"><h2>Workspace plan</h2><p id="renewal">Renews November 20</p><button data-testid="upgrade">Upgrade</button><script>let active=false;addEventListener('message',e=>{if(e.data?.type==='overseer:pick.set')active=e.data.payload.active});addEventListener('click',e=>{if(!active)return;e.preventDefault();e.stopImmediatePropagation();const el=e.target;parent.postMessage({type:'overseer:pick.selected',payload:{selector:el.id?'#'+el.id:el.hasAttribute('data-testid')?'[data-testid="'+el.getAttribute('data-testid')+'"]':el.tagName.toLowerCase(),outerHtml:el.outerHTML}},'*')},true)</script></body></html>`

function Demo({ populated = false }: { populated?: boolean }) {
  const [appNotes, setAppNotes] = useState<AppNote[]>(populated ? SAMPLE_APP_NOTES : [])
  const nextPickId = useRef(0)
  const [picking, setPicking] = useState(false)
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const blob = window.URL.createObjectURL(new Blob([PAGE], { type: 'text/html' }))
    setUrl(blob)
    return () => window.URL.revokeObjectURL(blob)
  }, [])
  const [text, setText] = useState('')
  const [sent, setSent] = useState('')
  return (
    <div style={{ width: 680, maxWidth: '100%' }}>
      <ProjectAppView
        url={url}
        pickMode={picking}
        onExitPickMode={() => setPicking(false)}
        onElementPick={(pick) => {
          const id = `pick-${++nextPickId.current}`
          setAppNotes((current) => [
            ...current,
            {
              id,
              projectId: 'sample',
              comment: '',
              targets: [{ kind: 'element', selector: pick.selector, outerHtml: pick.outerHtml }],
            },
          ])
        }}
        style={{ height: 300 }}
      />
      <ChatInput
        value={text}
        onChange={setText}
        appNotes={appNotes}
        onChangeAppNotes={setAppNotes}
        onShowApp={() => setPicking(true)}
        onSend={(_, __, meta) => setSent(JSON.stringify(meta?.appNotes ?? []))}
        clearOnSend
        leftHints={null}
        rightHints={null}
      />
      {sent ? (
        <pre
          className="whitespace-pre-wrap break-all p-2 text-xs"
          aria-label="Sent structured context"
        >
          {sent}
        </pre>
      ) : null}
    </div>
  )
}

export const APP_NOTE_SCENES: Scene[] = [
  {
    id: 'app-selections',
    title: 'Show app and comment on elements',
    component: 'ProjectAppView / ChatInput',
    group: 'Chat',
    description:
      'Pick several elements, edit their comments or remove them, then send structured context to the launching chat. HTML is text only.',
    states: [
      { id: 'ready', title: 'Ready to show app', render: () => <Demo /> },
      {
        id: 'selected',
        title: 'Two selections with editable comments',
        render: () => <Demo populated />,
      },
    ],
  },
]
