import type { ReactNode } from 'react'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  GitProvider,
  ProjectsProvider,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import type { GitStatus } from '../../src/headless/api'
import { CommitDialogView } from '../../src/web/compound/git/dialogs/CommitDialog'
import GitCredentialErrorModal from '../../src/web/compound/git/GitCredentialErrorModal'
import MergeBranchSheet from '../../src/web/compound/git/dialogs/MergeBranchSheet'
import type { Scene } from '../showcase/types'

const noop = () => {}
const done = async () => undefined

const MEMORY: SyncKVStorage = { get: () => null, set: noop }

const STATUS: GitStatus = { staged: [], unstaged: [], untracked: [] }

const REJECTED =
  'git push origin dev failed: ! [rejected] dev -> dev (fetch first) — the remote has work you do not have locally.'

const REFUSED =
  "git push origin dev failed: fatal: could not read Password for 'https://Perpetuating@dev.azure.com': terminal prompts disabled"

const REPO = 'https://Perpetuating@dev.azure.com/perpetuating/covision/_git/covision-android'

/** The project's git with no backend: nothing is fetched, every list is empty. */
function Offline({ children }: { children: ReactNode }) {
  return (
    <AuthProvider storage={{ read: () => null, write: noop }}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <GitProvider storage={MEMORY}>{children}</GitProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

export const GIT_PUSH_AFTER_SCENES: Scene[] = [
  {
    id: 'commit-and-push',
    title: 'Commit & Push',
    component: 'CommitDialog (CommitDialogView)',
    group: 'Project',
    description:
      'Commit & Push pushes the moment the commit is made — it never waits for the git graph to reload, which follows once both are done — and the button says the step under way: “Committing…”, then “Pushing…”. A push that fails after the commit says the commit stands, clears the message, and turns the button into “Push” to try again; nothing is committed twice.',
    states: [
      {
        id: 'push-failed',
        title: 'Committed, the push failed',
        description: 'The commit was made; only the push is left, one press away.',
        overlay: true,
        render: () => (
          <CommitDialogView
            isOpen
            onClose={noop}
            status={STATUS}
            onCommit={done}
            onPush={done}
            onUpdateCredentials={noop}
            initial={{ pushError: REJECTED }}
          />
        ),
      },
      {
        id: 'push-credentials',
        title: 'Committed, the credentials were refused',
        description:
          'The push failed because the git host refused the stored credentials: the error keeps its words and offers “Update credentials”, which closes the dialog and opens the project’s Git settings. An ordinary push failure (above) shows no such button.',
        overlay: true,
        render: () => (
          <CommitDialogView
            isOpen
            onClose={noop}
            status={STATUS}
            onCommit={done}
            onPush={done}
            onUpdateCredentials={noop}
            initial={{ pushError: REFUSED, credentialError: true }}
          />
        ),
      },
    ],
  },
  {
    id: 'git-credentials-popup',
    title: 'Git credentials needed',
    component: 'GitCredentialErrorModal',
    group: 'Project',
    description:
      'Shown app-wide when a push, pull or fetch is refused for its credentials, on any git host. “Update credentials” opens the project’s Git settings, where the token can be replaced or other credentials picked.',
    states: [
      {
        id: 'push-refused',
        title: 'Push refused',
        description:
          'An Azure DevOps token rejected on push, with the repository and the raw git message.',
        overlay: true,
        render: () => (
          <GitCredentialErrorModal
            isOpen
            onClose={noop}
            onOpenSettings={noop}
            op="push"
            message={REFUSED}
            repoUrl={REPO}
          />
        ),
      },
    ],
  },
  {
    id: 'merge-in-push',
    title: 'Merge in, then push',
    component: 'MergeBranchSheet',
    group: 'Project',
    description:
      'Right-click a branch that is not checked out and merge the current branch into it: the sheet offers to push that branch to origin as soon as the merge is in, as Commit & Push does for a commit. Off until picked. Only a merge that moved the branch, or found it up to date, is pushed; a push that fails keeps the sheet open, says the merge stands, and offers the push again.',
    states: [
      {
        id: 'push-picked',
        title: 'Push picked',
        description: 'Merging dev into main, with main pushed straight after.',
        overlay: true,
        render: () => (
          <Offline>
            <MergeBranchSheet
              isOpen
              onClose={noop}
              projectId={undefined}
              initialSource="dev"
              into="main"
              onMerged={noop}
              initial={{ pushAfter: true }}
            />
          </Offline>
        ),
      },
      {
        id: 'push-failed',
        title: 'Merged, the push failed',
        description: 'main holds the merge; pushing it is one press away.',
        overlay: true,
        render: () => (
          <Offline>
            <MergeBranchSheet
              isOpen
              onClose={noop}
              projectId={undefined}
              initialSource="dev"
              into="main"
              onMerged={noop}
              initial={{
                pushAfter: true,
                pushError: REJECTED.replaceAll('dev', 'main'),
              }}
            />
          </Offline>
        ),
      },
    ],
  },
]
