import type { ReferenceDescription } from 'thefactory-tools/types'
import type { FileMeta } from '../api/generated'
import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import { classifyFileByExtension } from './filePaneKind'
import {
  FILE_PREVIEW_COPY,
  FILE_PREVIEW_FALLBACK_MEDIA_TYPE,
  FILE_PREVIEW_INFO_LABELS,
  FILE_PREVIEW_MEDIA_TYPES,
  FILE_PREVIEW_TEXT_MEDIA_TYPE,
} from './filePreviewConstants'
import type {
  FilePreviewContent,
  FilePreviewInfo,
  FilePreviewInfoRow,
  FilePreviewSource,
  FilePreviewState,
  FilePreviewTarget,
} from './filePreviewTypes'
import { formatBytes, formatFileDate } from './path'
import { REFERENCE_KIND_CAPTIONS } from './referencePreviewConstants'

/**
 * The file a reference's Preview opens: a file — never a folder — that is
 * there, by the project its link names. Pure.
 */
export function filePreviewTarget(
  description: ReferenceDescription,
): FilePreviewTarget | undefined {
  const link = description.link
  if (description.kind !== 'file' || link?.kind !== 'file') return undefined
  if (description.missing || description.loading) return undefined
  if (description.label.endsWith('/') || link.path.endsWith('/')) return undefined
  return {
    projectId: link.projectId,
    path: link.path,
    ...(description.projectName ? { projectName: description.projectName } : {}),
  }
}

/** How a file's contents are read for its preview, by its kind. Pure. */
export function filePreviewSource(path: string): FilePreviewSource {
  const kind = classifyFileByExtension(path)
  if (kind === 'markdown' || kind === 'html' || kind === 'text') return 'text'
  if (kind === 'image' || kind === 'pdf') return 'bytes'
  return 'none'
}

/** What a previewed file's contents are, named for a viewer. Pure. */
export function filePreviewMediaType(path: string): string {
  if (filePreviewSource(path) === 'text') return FILE_PREVIEW_TEXT_MEDIA_TYPE
  const name = filePreviewName(path).toLowerCase()
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1) : ''
  return FILE_PREVIEW_MEDIA_TYPES[ext] ?? FILE_PREVIEW_FALLBACK_MEDIA_TYPE
}

/** A failed read as the preview shows it: a 404 is a file that is gone. Pure. */
export function filePreviewFailure(target: FilePreviewTarget, err: unknown): FilePreviewState {
  if (errorStatus(err) === 404) return { status: 'gone', target }
  const message = extractErrorMessage(err, FILE_PREVIEW_COPY.errorFallback)
  return { status: 'error', target, message }
}

/** What the Files list knows about a file, kept for its info. Pure. */
export function filePreviewInfoOf(meta: FileMeta | undefined): FilePreviewInfo | undefined {
  if (!meta) return undefined
  const { absolutePath, size, mtime, ctime, type, ext } = meta
  return {
    absolutePath,
    size,
    mtime,
    ctime,
    ...(type !== undefined ? { type } : {}),
    ...(ext !== undefined ? { ext } : {}),
  }
}

/** A previewed file's size: what the Files list knows, else the bytes read. Pure. */
export function filePreviewSize(content: FilePreviewContent): number | null {
  return content.info?.size ?? content.bytes?.byteLength ?? null
}

/** A previewed file's info, a line each — what native shows behind its info button. Pure. */
export function filePreviewInfoRows(
  target: FilePreviewTarget,
  content: FilePreviewContent,
): FilePreviewInfoRow[] {
  const info = content.info
  const size = formatBytes(filePreviewSize(content))
  const modified = formatFileDate(info?.mtime)
  const created = formatFileDate(info?.ctime)
  const rows: FilePreviewInfoRow[] = [{ label: FILE_PREVIEW_INFO_LABELS.path, value: target.path }]
  if (target.projectName)
    rows.push({ label: FILE_PREVIEW_INFO_LABELS.project, value: target.projectName })
  if (info?.absolutePath && info.absolutePath !== target.path) {
    rows.push({ label: FILE_PREVIEW_INFO_LABELS.absolutePath, value: info.absolutePath })
  }
  rows.push({ label: FILE_PREVIEW_INFO_LABELS.type, value: info?.type ?? content.kind })
  if (size) rows.push({ label: FILE_PREVIEW_INFO_LABELS.size, value: size })
  if (modified) rows.push({ label: FILE_PREVIEW_INFO_LABELS.modified, value: modified })
  if (created) rows.push({ label: FILE_PREVIEW_INFO_LABELS.created, value: created })
  return rows
}

/** A file's name: the last segment of its path. Pure. */
export function filePreviewName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** What the preview is captioned: a file, in its project where that is named. Pure. */
export function filePreviewCaption(target: FilePreviewTarget): string {
  const what = REFERENCE_KIND_CAPTIONS.file
  return target.projectName ? `${what} in ${target.projectName}` : what
}
