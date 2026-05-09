import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Modal, ToastProvider, useToast } from 'thefactory-ui/web'
import './main.css'

function Demo() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  return (
    <main className="min-h-screen p-6 flex flex-col gap-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold">thefactory-ui playground</h1>
      <p className="text-(--text-secondary)">
        Smoke test for the published package. If buttons render with the brand colour and the modal
        opens with a backdrop, the four-layer pipeline (tokens → headless → web/styles) is wired
        correctly.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Button
          variant="secondary"
          onClick={() => toast({ variant: 'success', title: 'Hello from useToast' })}
        >
          Fire toast
        </Button>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Modal smoke test">
        <p>The modal body should sit above an overlay and trap focus until dismissed.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </main>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root missing')
createRoot(rootEl).render(
  <StrictMode>
    <ToastProvider>
      <Demo />
    </ToastProvider>
  </StrictMode>,
)
