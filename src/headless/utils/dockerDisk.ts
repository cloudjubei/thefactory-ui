import {
  DOCKER_DISK_BYTES_PER_GB,
  DOCKER_DISK_TEXT,
  DOCKER_DISK_WARN_PERCENT,
} from './dockerDiskConstants'
import type { DockerDisk, DockerDiskFacts } from './dockerDiskTypes'

export function formatDiskGb(bytes: number): string {
  const gb = Math.round((bytes / DOCKER_DISK_BYTES_PER_GB) * 10) / 10
  return `${gb} GB`
}

export function resizeLabel(sizeGb: number): string {
  return `${DOCKER_DISK_TEXT.resize} to ${sizeGb} GB`
}

export function dockerDiskFacts(disk: DockerDisk): DockerDiskFacts {
  const { usedBytes, allocatedBytes, reclaimableBytes, resize, resizing } = disk
  const usedPercent =
    allocatedBytes > 0 ? Math.min(100, Math.round((usedBytes / allocatedBytes) * 100)) : 0
  const freeBytes = Math.max(0, allocatedBytes - usedBytes)
  const canGrow = !!resize && resize.maxGb > resize.currentGb
  return {
    usedPercent,
    usageLine: `${formatDiskGb(usedBytes)} used of ${formatDiskGb(allocatedBytes)} · ${formatDiskGb(freeBytes)} free`,
    nearlyFull: usedPercent >= DOCKER_DISK_WARN_PERCENT,
    clearLabel:
      reclaimableBytes > 0
        ? `${DOCKER_DISK_TEXT.clear} ${formatDiskGb(reclaimableBytes)}`
        : DOCKER_DISK_TEXT.nothingToClear,
    canClear: reclaimableBytes > 0 && !resizing,
    sizeLine: resize
      ? canGrow
        ? `${resize.currentGb} GB, up to ${resize.maxGb} GB`
        : `${resize.currentGb} GB`
      : null,
    canResize: canGrow && !resizing,
  }
}

export function dockerDiskAfterClear(disk: DockerDisk): DockerDisk {
  return {
    ...disk,
    usedBytes: Math.max(0, disk.usedBytes - disk.reclaimableBytes),
    reclaimableBytes: 0,
  }
}

export function dockerDiskResizing(disk: DockerDisk): DockerDisk {
  const { resizeError: _dropped, ...rest } = disk
  return { ...rest, resizing: true }
}
