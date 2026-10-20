import { useCallback, useEffect, useRef, useState } from 'react'
import FileMentionsTextarea from '../../src/web/compound/files/FileMentionsTextarea'
import {
  projectFileMention,
  rankMentionMatches,
  rankProjectMentionMatches,
} from '../../src/headless/utils/mention'
import type { Scene } from '../showcase/types'

const PROJECT_PATHS = [
  'README.md',
  'package.json',
  'src/web/compound/chat/ChatInput.tsx',
  'src/web/compound/chat/chat.css',
  'src/web/compound/files/FileTree.tsx',
  'src/headless/utils/mention.ts',
  'scripts/release.py',
  'docs/ARCHITECTURE.md',
]

const PROJECTS = [
  { projectId: 'overseer', paths: ['src/ui/screens/ChatView.tsx', 'src/main/index.ts'] },
  { projectId: 'ui', paths: ['src/web/compound/chat/ChatInput.tsx', 'docs/README.md'] },
]

type Search = (token: string) => string[]

/** The composer's text box with its caret at the end of the text, so the `@` list is open. */
function OpenSuggestions({
  text,
  search,
  describeFile,
}: {
  text: string
  search: Search
  describeFile?: (value: string) => { path: string; project?: string }
}) {
  const [value, setValue] = useState(text)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.focus()
    node.setSelectionRange(text.length, text.length)
    node.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
  }, [text])
  const onSearchFiles = useCallback((token: string) => search(token), [search])
  return (
    <div className="max-w-xl pt-72">
      <div className="rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
        <FileMentionsTextarea
          ref={ref}
          value={value}
          onChange={setValue}
          onSearchFiles={onSearchFiles}
          {...(describeFile ? { describeFile } : {})}
          rows={2}
          ariaLabel="Message"
        />
      </div>
    </div>
  )
}

const searchProject: Search = (token) => rankMentionMatches(PROJECT_PATHS, token, 8)
const searchProjects: Search = (token) => rankProjectMentionMatches(PROJECTS, token, 8)
const describeProjectFile = (value: string) => {
  const { projectId, path } = projectFileMention(value)
  return projectId ? { path, project: projectId } : { path }
}

export const FILE_SUGGESTION_SCENES: Scene[] = [
  {
    id: 'file-suggestions',
    title: 'Files and folders after @',
    component: 'FileMentionsTextarea',
    group: 'Chat',
    description:
      'The list `@` opens above every text box that takes references — the chat composer, story and feature forms, notes — on web and desktop alike, with the same rows on mobile. Each row leads with the icon of its file type, and the folders that hold the files are offered too, each with a folder icon and a closing `/`; a folder comes before the files inside it. Enter or Tab takes the highlighted row. Picking a folder does not add it to a feature’s context files, which are files only.',
    states: [
      {
        id: 'files-and-folders',
        title: 'Files and folders',
        description: 'Typed `@src/web`: the folders on the way come first, then the files in them.',
        render: () => <OpenSuggestions text="Check @src/web" search={searchProject} />,
      },
      {
        id: 'file-types',
        title: 'Nothing typed yet',
        description: 'Just `@`: the project’s files first, each with the icon of its type.',
        render: () => <OpenSuggestions text="Look at @" search={searchProject} />,
      },
      {
        id: 'several-projects',
        title: 'A chat over several projects',
        description: 'Each row names its project on the right; folders are offered per project.',
        render: () => (
          <OpenSuggestions
            text="Compare @src"
            search={searchProjects}
            describeFile={describeProjectFile}
          />
        ),
      },
    ],
  },
]
