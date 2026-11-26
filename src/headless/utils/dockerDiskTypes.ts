import type { GetDbDockerDiskResponse } from '../api/generated'

export type DockerDisk = GetDbDockerDiskResponse

export type DockerDiskFacts = {
  usedPercent: number
  usageLine: string
  nearlyFull: boolean
  clearLabel: string
  canClear: boolean
  sizeLine: string | null
  canResize: boolean
}
