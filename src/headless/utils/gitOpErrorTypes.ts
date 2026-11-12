/** A failed git op as a screen holds it: the words it shows and whether new credentials would fix it. */
export type GitOpError = {
  message: string
  credential: boolean
}
