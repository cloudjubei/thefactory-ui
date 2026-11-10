import { loadProjectFiles } from '../contexts/FilesContext'
import { filePreviewInfoOf } from '../utils/filePreview'
import type { FilePreviewCalls, FilePreviewInfo } from '../utils/filePreviewTypes'
import {
  deleteFiles as deleteFilesCall,
  readFile as readFileCall,
  readFileRaw as readFileRawCall,
  renameFiles as renameFilesCall,
  writeFile as writeFileCall,
} from './generated'

/** A file's text, from the project it is in — not the one on screen. */
export async function readProjectFileText(projectId: string, path: string): Promise<string> {
  const { data } = await readFileCall({ path: { projectId }, body: { path }, throwOnError: true })
  return data.content
}

/** A file's raw bytes, from the project it is in, through the bearer-authenticated client. */
export async function readProjectFileBytes(projectId: string, path: string): Promise<ArrayBuffer> {
  const { data } = await readFileRawCall({
    path: { projectId },
    query: { path },
    responseType: 'arraybuffer',
    throwOnError: true,
  })
  return data as ArrayBuffer
}

/** What a project's Files list knows about one of its files; nothing when it lists no such file. */
export async function readProjectFileInfo(
  projectId: string,
  path: string,
): Promise<FilePreviewInfo | undefined> {
  const files = await loadProjectFiles(projectId)
  return filePreviewInfoOf(files.find((f) => (f.relativePath ?? f.absolutePath) === path))
}

export async function writeProjectFile(
  projectId: string,
  path: string,
  content: string,
): Promise<void> {
  await writeFileCall({ path: { projectId }, body: { path, content }, throwOnError: true })
}

export async function renameProjectFile(
  projectId: string,
  from: string,
  to: string,
): Promise<void> {
  await renameFilesCall({
    path: { projectId },
    body: { moves: [{ src: from, dst: to }] },
    throwOnError: true,
  })
}

export async function deleteProjectFile(projectId: string, path: string): Promise<void> {
  await deleteFilesCall({ path: { projectId }, body: { paths: [path] }, throwOnError: true })
}

/** The calls a file preview reads and changes a file of any project with. */
export const PROJECT_FILE_CALLS: FilePreviewCalls = {
  readText: readProjectFileText,
  readBytes: readProjectFileBytes,
  readInfo: readProjectFileInfo,
  write: writeProjectFile,
  rename: renameProjectFile,
  remove: deleteProjectFile,
}
