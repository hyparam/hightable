import { ErrorContext } from '../../contexts/ErrorContext.js'
import type { DataFrame } from '../../helpers/dataframe/index.js'
import { DataProvider } from '../../providers/DataProvider.js'
import type { WrapperProps } from './Wrapper.js'
import Wrapper from './Wrapper.js'

export interface HighTableCommands {
  scrollRowIntoView: number // 1-indexed row number
}

type Props = {
  data: DataFrame
  maxRowNumber?: number // maximum row number to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied.
  onError?: (error: unknown) => void
} & WrapperProps

// TODO(SL): update the docstring
/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * orderBy: the order used to fetch the rows. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state). If the data cannot be sorted, it's ignored.
 * onOrderByChange: the callback to call when the order changes. If undefined, the component order is read-only if controlled (orderBy is set), or disabled if not (or if the data cannot be sorted).
 * selection: the selected rows and the anchor row. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state).
 * onSelectionChange: the callback to call when the selection changes. If undefined, the component selection is read-only if controlled (selection is set), or disabled if not.
 */
export default function HighTable({ data, maxRowNumber, onError, ...rest }: Props) {
  return (
    <ErrorContext.Provider value={{ onError }}>
      <DataProvider data={data} maxRowNumber={maxRowNumber}>
        <Wrapper {...rest} />
      </DataProvider>
    </ErrorContext.Provider>
  )
}
