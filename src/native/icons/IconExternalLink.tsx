import Svg, { Path } from 'react-native-svg'

export function IconExternalLink({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M10.6 5.5H5.5v13h13v-5.1" stroke="currentColor" strokeWidth="2" />
      <Path d="M14 4.5h5.5V10M19.5 4.5L11.7 12.3" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}

export default IconExternalLink
