/** A file the app's picker read from the device, ready to upload with an answer. */
export interface PickedAnswerFile {
  name: string
  contentBase64: string
}

/** Where an answer's files come from on native: the run's upload and project files, and the app's picker. */
export interface NativeAnswerFiles {
  upload: (name: string, contentBase64: string) => Promise<string>
  loadProjectFiles: () => Promise<string[]>
  pickDeviceFiles?: () => Promise<PickedAnswerFile[]>
}
