import type {
  AcceptDesignProposalResponse,
  DesignApp,
  DesignAppKind,
  DesignContentRef,
  DesignEntryTarget,
  DesignIndex,
  DesignPiece,
  DesignProposal,
  DesignScreen,
  DesignScreenKind,
  DesignState,
  DesignTidyPlan,
  DesignTidyPreview,
  GetDesignPlaygroundResponse,
  GetProjectStorageUsageResponse,
  GetStorageUsageResponse,
  SendBackDesignProposalResponse,
} from '../api'

/** One project's design as the store holds it. */
export type DesignProjectState = {
  index: DesignIndex
  isLoaded: boolean
  loadError: Error | null
  /** What the project keeps on this machine, and how the total of every project stands; `undefined` until read. */
  usage: GetProjectStorageUsageResponse | undefined
}

/** Every project's usage and how their total stands; `totals` is `undefined` until read. */
export type StorageTotalsState = {
  totals: GetStorageUsageResponse | undefined
  error: Error | null
}

/** A file uploaded: its name, its bytes as base64, and optionally its media type. */
export type DesignUploadInput = { name: string; contentBase64: string; mediaType?: string }

/** Where proposed content comes from: an uploaded file, a project file, or a link. */
export type DesignSourceChoice =
  | ({ type: 'upload' } & DesignUploadInput)
  | { type: 'project-file'; path: string }
  | { type: 'link'; url: string }

/** One image of a proposal a person makes. */
export type DesignProposeEntry = {
  target?: DesignEntryTarget
  variant?: string
  source: DesignSourceChoice
}

/** A project App view token, for an `<img>` or `<iframe>` that cannot send the bearer. */
export type DesignViewToken = { token: string; expiresAt: string }

/** What a person can do to one project's design. Every call throws the server's refusal. */
export type DesignActions = {
  createApp: (name: string, kind: DesignAppKind) => Promise<DesignApp>
  updateApp: (appId: string, change: { name?: string; kind?: DesignAppKind }) => Promise<DesignApp>
  deleteApp: (appId: string) => Promise<void>
  createScreen: (input: {
    appId: string
    name: string
    kind?: DesignScreenKind
    group?: string
  }) => Promise<DesignScreen>
  updateScreen: (
    screenId: string,
    change: {
      name?: string
      kind?: DesignScreenKind
      group?: string
      description?: string
      uses?: string[]
      variants?: string[]
    },
  ) => Promise<DesignScreen>
  deleteScreen: (screenId: string) => Promise<void>
  createState: (input: {
    screenId: string
    name: string
    description?: string
    address?: string
  }) => Promise<DesignState>
  updateState: (
    stateId: string,
    change: { name?: string; description?: string; address?: string },
  ) => Promise<DesignState>
  deleteState: (stateId: string) => Promise<void>
  /** Propose images, files or links — each upload at most a chat attachment's size. */
  propose: (input: {
    appId: string
    title: string
    question?: string
    entries: DesignProposeEntry[]
    pieces?: DesignPiece[]
  }) => Promise<DesignProposal>
  /** Propose an HTML draft: one proposal per choice its cases declare. */
  proposeDraft: (input: {
    appId: string
    title?: string
    source: DesignSourceChoice
    target?: DesignEntryTarget
  }) => Promise<DesignProposal[]>
  fileEntry: (
    proposalId: string,
    entryId: string,
    target: DesignEntryTarget,
  ) => Promise<DesignProposal>
  /** Accept a proposal whole, or the cells named. */
  acceptProposal: (proposalId: string, entryIds?: string[]) => Promise<AcceptDesignProposalResponse>
  keepProposal: (proposalId: string) => Promise<DesignProposal>
  /** Choose one answer to a question; the other open answers are kept as alternatives. */
  chooseProposal: (proposalId: string) => Promise<DesignProposal>
  /** Send a proposal back with a note; says where the note went. */
  sendBackProposal: (proposalId: string, note: string) => Promise<SendBackDesignProposalResponse>
  renameProposal: (proposalId: string, title: string) => Promise<DesignProposal>
  deleteProposal: (proposalId: string) => Promise<void>
  /** Bring earlier versions back as a new proposal. */
  restoreVersions: (versionIds: string[]) => Promise<DesignProposal>
  /** Save what the playground shows at an address as a state: captured in every variant and proposed. */
  savePlaygroundState: (input: {
    appId: string
    target: DesignEntryTarget
    address: string
  }) => Promise<DesignProposal>
  decideTidyMove: (
    planId: string,
    moveId: string,
    decision: 'accept' | 'leave',
  ) => Promise<DesignTidyPlan>
  previewTidy: (planId: string) => Promise<DesignTidyPreview>
  applyTidy: (planId: string) => Promise<DesignTidyPlan>
  dismissTidy: (planId: string) => Promise<DesignTidyPlan>
  /** A version's or an entry's content with the bearer: bytes for an image or a file, text for HTML, Markdown or SVG. */
  fetchContent: <T extends 'arraybuffer' | 'text'>(
    ref: DesignContentRef,
    responseType: T,
  ) => Promise<T extends 'text' ? string : ArrayBuffer>
  /** A view token for {@link designContentUrl}; it lasts about 15 minutes. */
  mintViewToken: () => Promise<DesignViewToken>
}

/** Where a project's design playground is: none declared, not served yet, building, ready, or failed. */
export type DesignPlaygroundStatus = GetDesignPlaygroundResponse
