import type {
  DesignApp,
  DesignAppKind,
  DesignItem,
  DesignScreen,
  DesignTree,
  GetProjectStorageUsageResponse,
  GetStorageUsageResponse,
} from '../api'

/** One project's design as the store holds it. */
export type DesignProjectState = {
  tree: DesignTree
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

/** A file uploaded as a draft: its name, its bytes as base64, and optionally its media type. */
export type DesignUploadInput = { name: string; contentBase64: string; mediaType?: string }

/** A project App view token, for an `<img>` or `<iframe>` that cannot send the bearer. */
export type DesignViewToken = { token: string; expiresAt: string }

/** What a person can do to one project's design. Every call throws the server's refusal. */
export type DesignActions = {
  createApp: (name: string, kind: DesignAppKind) => Promise<DesignApp>
  updateApp: (appId: string, change: { name?: string; kind?: DesignAppKind }) => Promise<DesignApp>
  deleteApp: (appId: string) => Promise<void>
  createScreen: (appId: string, name: string) => Promise<DesignScreen>
  renameScreen: (screenId: string, name: string) => Promise<DesignScreen>
  deleteScreen: (screenId: string) => Promise<void>
  /** Add an uploaded file as a draft — at most a chat attachment's size. */
  uploadDraft: (screenId: string, file: DesignUploadInput, name?: string) => Promise<DesignItem>
  /** Add a project file as a draft — pointed at where it is, or copied when it is in a swept store. */
  addProjectFileDraft: (screenId: string, path: string, name?: string) => Promise<DesignItem>
  /** Add a link (Figma, a hosted mock-up) as a draft. */
  addLinkDraft: (screenId: string, url: string, name?: string) => Promise<DesignItem>
  renameItem: (itemId: string, name: string) => Promise<DesignItem>
  /** Mark a draft as the screen's approved design (the one before is unmarked), or unmark it. */
  approveItem: (itemId: string, approved: boolean) => Promise<DesignItem>
  deleteItem: (itemId: string) => Promise<void>
  /** An item's content with the bearer: bytes for an image or a file, text for HTML, Markdown or SVG. */
  fetchContent: <T extends 'arraybuffer' | 'text'>(
    itemId: string,
    responseType: T,
  ) => Promise<T extends 'text' ? string : ArrayBuffer>
  /** A view token for {@link designItemContentUrl}; it lasts about 15 minutes. */
  mintViewToken: () => Promise<DesignViewToken>
}
