import { useDockerDisk } from '../../../headless/hooks/useDockerDisk'
import DockerDiskPanel from './DockerDiskPanel'

export default function DockerDiskSettingsPanel() {
  return <DockerDiskPanel {...useDockerDisk()} />
}
