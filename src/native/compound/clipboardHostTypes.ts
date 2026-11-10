/**
 * What the app hands the shared views so they can copy: its clipboard. Left
 * out, a view offers no Copy and its text stays selectable.
 */
export type ClipboardHost = {
  copyText?: (text: string) => Promise<void>
}
