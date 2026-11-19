import { gitRenamePath, type GitRenamePathSource } from '../../../../headless/utils/gitRenamePath'
import { PathDisplay } from '../../PathDisplay'

export default function GitFilePath({ file }: { file: GitRenamePathSource }) {
  const rename = gitRenamePath(file)
  if (!rename) return <PathDisplay path={file.path} />

  return (
    <div className="flex min-w-0 items-baseline gap-1.5 text-xs" title={rename.title}>
      <span className="min-w-0 max-w-[45%] truncate font-mono text-(--text-muted)">
        {rename.from}
      </span>
      <span className="shrink-0 text-(--text-muted)">→</span>
      <div className="min-w-0 flex-1">
        <PathDisplay path={file.path} />
      </div>
    </div>
  )
}
