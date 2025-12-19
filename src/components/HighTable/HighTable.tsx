import type { DataFrame } from '../../helpers/dataframe/index.js'
import { DataProvider } from '../../providers/DataProvider.js'
import type { HighTableWrapperProps } from './HighTableWrapper.js'
import HighTableWrapper from './HighTableWrapper.js'

export type Props = {
  data: DataFrame
  maxRowNumber?: number // maximum row number to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied.
} & HighTableWrapperProps

/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * orderBy: the order used to fetch the rows. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state). If the data cannot be sorted, it's ignored.
 * onOrderByChange: the callback to call when the order changes. If undefined, the component order is read-only if controlled (orderBy is set), or disabled if not (or if the data cannot be sorted).
 * selection: the selected rows and the anchor row. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state).
 * onSelectionChange: the callback to call when the selection changes. If undefined, the component selection is read-only if controlled (selection is set), or disabled if not.
 */
export default function HighTable({ data, maxRowNumber, ...rest }: Props) {
  return (
    <DataProvider data={data} maxRowNumber={maxRowNumber}>
      <HighTableWrapper {...rest} />
    </DataProvider>
  )
}
