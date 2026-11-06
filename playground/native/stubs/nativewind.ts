const noop = () => {}

/** The theme the page's address asks for: `?theme=dark`, else light. */
export const useColorScheme = () => ({
  colorScheme:
    new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light',
  setColorScheme: noop,
  toggleColorScheme: noop,
})

export const cssInterop = noop
export const remapProps = noop
export const vars = <T>(value: T): T => value
