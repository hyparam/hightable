import { createContext, useContext } from 'react'

interface ViewportDataContextType {
  /**
   * Width of the viewport used to render the table.
   *
   * If undefined, the viewport width is not known, and the column widths cannot be adjusted automatically.
   */
  viewportWidth?: number
}

interface ViewportApiContextType {
  /**
   * Function to set the viewport width.
   *
   * The column widths cannot be adjusted automatically if undefined.
   *
   * @param viewportWidth The new viewport width value
   */
  setViewportWidth?: (viewportWidth: number) => void
}

export const ViewportDataContext = createContext<ViewportDataContextType>({})
export const ViewportApiContext = createContext<ViewportApiContextType>({})

export function useViewportWidth() {
  const { viewportWidth } = useContext(ViewportDataContext)
  return viewportWidth
}

export function useSetViewportWidth() {
  const { setViewportWidth } = useContext(ViewportApiContext)
  return setViewportWidth
}
