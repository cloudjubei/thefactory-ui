import { useMemo, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  COVERAGE_IMPROVE_THRESHOLD,
  coverageBucket,
  formatUncoveredLines,
  getDirname,
  getFilename,
  normalizeRel,
  type CoverageBucket,
} from '../../../headless/utils/testsFormat'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { CoverageFileStatsLike, CoverageResultLike } from './types'

export type CoverageTableProps = {
  data: CoverageResultLike
  /**
   * Optional per-row action slot. Receives the file's project-relative
   * path + its sorted uncovered line numbers. Renders inline at the
   * bottom of each row when the coverage falls below the improvement
   * threshold or there are uncovered lines. Mobile mounts the
   * "Improve tests" CTA here; web does the same.
   */
  renderActions?: (file: string, uncoveredLines: number[]) => ReactNode
}

type Row = {
  file: string
  rel: string
  pct_lines: number
  pct_statements: number
  pct_branch: number | null
  pct_functions: number | null
  uncovered_lines: number[]
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

function comparePathsDepthFirst(aRel: string, bRel: string): number {
  const aSeg = aRel.split('/')
  const bSeg = bRel.split('/')
  const len = Math.min(aSeg.length - 1, bSeg.length - 1)
  for (let i = 0; i < len; i++) {
    const cmp = aSeg[i].localeCompare(bSeg[i])
    if (cmp !== 0) return cmp
  }
  return aSeg.length - bSeg.length
}

const BUCKET_TEXT_COLOR: Record<CoverageBucket, string> = {
  good: '#15803d',
  warn: '#b45309',
  poor: '#c2410c',
  bad: '#b91c1c',
}
const BUCKET_BAR_COLOR: Record<CoverageBucket, string> = {
  good: '#22c55e',
  warn: '#f59e0b',
  poor: '#f97316',
  bad: '#ef4444',
}

function ProgressBar({ value }: { value: number }) {
  const { theme } = useNativeTheme()
  const clamped = Math.max(0, Math.min(100, value))
  const bucket = coverageBucket(clamped)
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: theme.surface.muted,
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: BUCKET_BAR_COLOR[bucket],
        }}
      />
    </View>
  )
}

function MetricCell({ label, pct }: { label: string; pct: number | null }) {
  const { theme } = useNativeTheme()
  if (typeof pct !== 'number') {
    return (
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 10, color: theme.text.muted }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>—</Text>
      </View>
    )
  }
  const bucket = coverageBucket(pct)
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 10, color: theme.text.muted }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: BUCKET_TEXT_COLOR[bucket],
        }}
      >{`${pct.toFixed(1)}%`}</Text>
      <ProgressBar value={pct} />
    </View>
  )
}

/**
 * Native peer of `web/compound/tests/CoverageTable`. Renders coverage as
 * a card list (touch-friendly) rather than a wide tabular layout. The
 * summary card at the top mirrors web's first table row.
 */
export function CoverageTable({ data, renderActions }: CoverageTableProps) {
  const { theme } = useNativeTheme()
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = []
    for (const [file, v] of Object.entries(data?.files ?? {}) as Array<
      [string, CoverageFileStatsLike]
    >) {
      list.push({
        file,
        rel: normalizeRel(file),
        pct_lines: v.pct_lines,
        pct_statements: v.pct_statements,
        pct_branch: asNum(v.pct_branch),
        pct_functions: asNum(v.pct_functions),
        uncovered_lines: Array.isArray(v.uncovered_lines) ? v.uncovered_lines : [],
      })
    }
    list.sort((a, b) => comparePathsDepthFirst(a.rel, b.rel))
    return list
  }, [data])

  const summary = useMemo(() => {
    const count = rows.length
    const avg = (getter: (r: Row) => number | null) => {
      const vals = rows.map(getter).filter((n): n is number => typeof n === 'number')
      if (!vals.length) return 0
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }
    return {
      fileCount: count,
      avgLinesPct: avg((r) => r.pct_lines),
      avgStatementsPct: avg((r) => r.pct_statements),
      avgBranchesPct: avg((r) => r.pct_branch),
      avgFunctionsPct: avg((r) => r.pct_functions),
    }
  }, [rows])

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: 6,
          padding: 12,
          gap: 8,
          backgroundColor: theme.surface.raised,
        }}
      >
        <Text style={{ fontSize: 12, color: theme.text.muted }}>
          {`${summary.fileCount} files`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MetricCell label="Statements" pct={summary.avgStatementsPct} />
          <MetricCell label="Branches" pct={summary.avgBranchesPct} />
          <MetricCell label="Functions" pct={summary.avgFunctionsPct} />
          <MetricCell label="Lines" pct={summary.avgLinesPct} />
        </View>
      </View>

      {rows.length === 0 ? (
        <Text style={{ fontSize: 13, color: theme.text.muted }}>No coverage data found.</Text>
      ) : (
        rows.map((f) => {
          const uncoveredText = formatUncoveredLines(f.uncovered_lines)
          const showActions =
            (f.pct_lines ?? 0) < COVERAGE_IMPROVE_THRESHOLD || (f.uncovered_lines?.length ?? 0) > 0
          const actions =
            showActions && renderActions ? renderActions(f.file, f.uncovered_lines ?? []) : null
          return (
            <View
              key={f.file}
              style={{
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: 6,
                padding: 12,
                gap: 10,
                backgroundColor: theme.surface.raised,
              }}
            >
              <View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={{ fontSize: 13, color: theme.text.primary }}
                >
                  {getFilename(f.file)}
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={{ fontSize: 11, color: theme.text.muted }}
                >
                  {getDirname(f.file)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <MetricCell label="Statements" pct={f.pct_statements} />
                <MetricCell label="Branches" pct={f.pct_branch} />
                <MetricCell label="Functions" pct={f.pct_functions} />
                <MetricCell label="Lines" pct={f.pct_lines} />
              </View>
              {uncoveredText && uncoveredText !== '—' ? (
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 11,
                    fontFamily: 'Menlo',
                    color: theme.text.muted,
                  }}
                >
                  Uncovered: {uncoveredText}
                </Text>
              ) : null}
              {actions ? <View>{actions}</View> : null}
            </View>
          )
        })
      )}
    </View>
  )
}

export default CoverageTable
