// Minimal `className` augmentation for RN core components. Lets this package
// typecheck without depending on `nativewind/types` at consumer build time;
// merges cleanly with NativeWind's full augmentation when both are present.

declare module 'react-native' {
  interface ViewProps {
    className?: string
  }
  interface TextProps {
    className?: string
  }
  interface TextInputProps {
    className?: string
    placeholderClassName?: string
  }
  interface ImageProps {
    className?: string
  }
  interface ImagePropsBase {
    className?: string
  }
  interface PressableProps {
    className?: string
  }
  interface SwitchProps {
    className?: string
  }
  interface ScrollViewProps {
    className?: string
    contentContainerClassName?: string
    indicatorClassName?: string
  }
}

export {}
