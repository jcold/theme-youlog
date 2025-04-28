import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      observeVisibility: (isVisible: boolean) => void
      autoFocus: boolean
      clickOutside: () => void
    }
  }
}
