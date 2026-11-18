import { FilePane } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const LANDSCAPE = new URL('./assets/sample-landscape.webm', import.meta.url).href
const PORTRAIT = new URL('./assets/sample-portrait.webm', import.meta.url).href
const landscapeUrl = async () => LANDSCAPE
const portraitUrl = async () => PORTRAIT
const loadingUrl = () => new Promise<string>(() => {})
const failedUrl = async () => {
  throw new Error('The video could not be opened.')
}

// The existing bundled clips stay paused at the start, with native controls and no network service.
// Once settled: landscape/portrait show their metadata; loading and URL failure remain as named.
function Pane({ state }: { state: string }) {
  const getBinaryUrl =
    state === 'loading'
      ? loadingUrl
      : state === 'error'
        ? failedUrl
        : state === 'portrait'
          ? portraitUrl
          : landscapeUrl
  return (
    <div className="h-[480px] w-[760px] max-w-full border border-(--border-default)">
      <FilePane
        filePath={`recordings/walkthrough.${state === 'portrait' ? 'mov' : 'webm'}`}
        content={null}
        getBinaryUrl={getBinaryUrl}
      />
    </div>
  )
}

export const FILE_PANE_VIDEO_SCENES: Scene[] = [
  {
    id: 'file-pane-video',
    title: 'Video in Files',
    component: 'FilePane',
    group: 'Project',
    description:
      'A video opened in Files, streamed from the host-supplied media URL with the browser’s own playback controls.',
    states: ['landscape', 'portrait', 'loading', 'error'].map((state) => ({
      id: state,
      title: state,
      render: () => <Pane state={state} />,
    })),
  },
]
