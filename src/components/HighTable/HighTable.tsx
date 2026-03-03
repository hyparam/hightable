import { useState } from 'react'

import { columnWidthsSuffix } from '../../helpers/constants.js'
import styles from '../../HighTable.module.css'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnsVisibilityProvider } from '../../providers/ColumnsVisibilityProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { DataProvider } from '../../providers/DataProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { ScrollProvider } from '../../providers/ScrollProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import { TableCornerSizeProvider } from '../../providers/TableCornerSizeProvider.js'
import { ViewportSizeProvider } from '../../providers/ViewportSizeProvider.js'
import type { HighTableProps } from '../../types.js'
import Scroller from './Scroller.js'
import Slice from './Slice.js'
import Wrapper from './Wrapper.js'

export default function HighTable({
  data,
  ...rest
}: HighTableProps) {
  // Remount if the data frame changes, to reset all the internal state (caches, etc).
  const [dataId, setDataId] = useState<number>(0)
  const [previousData, setPreviousData] = useState<HighTableProps['data']>(data)
  if (data !== previousData) {
    setDataId(d => d + 1)
    setPreviousData(data)
  }

  return <DataHighTable key={dataId} data={data} {...rest} />
}

function DataHighTable({
  columnConfiguration,
  cacheKey,
  cellPosition,
  className = '',
  columnsVisibility,
  data,
  focus,
  maxRowNumber,
  numRowsPerPage,
  orderBy,
  padding,
  selection,
  styled = true,
  onCellPositionChange,
  onColumnsVisibilityChange,
  onError,
  onOrderByChange,
  onSelectionChange,
  ...rest
}: HighTableProps) {
  return (
    /* The state is handled with contexts, even if it creates a "Providers hell". No need for state library for now. */
    <ViewportSizeProvider>
      <TableCornerSizeProvider>
        <DataProvider data={data}>
          <Wrapper styled={styled} maxRowNumber={maxRowNumber} className={className}>

            <div className={styles.topBorder} role="presentation" />

            <ColumnParametersProvider
              columnConfiguration={columnConfiguration}
              columnDescriptors={data.columnDescriptors}
            >
              <ColumnWidthsProvider
                /**
                 * Recreate a context if a new cacheKey is provided.
                 */
                key={cacheKey}
                // TODO(SL): pass cacheKey, memoize
                localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined}
                numColumns={data.columnDescriptors.length}
              >
                <ColumnsVisibilityProvider
                  columnsVisibility={columnsVisibility}
                  onColumnsVisibilityChange={onColumnsVisibilityChange}
                >
                  <OrderByProvider
                    orderBy={orderBy}
                    onOrderByChange={onOrderByChange}
                  >
                    <SelectionProvider
                      selection={selection}
                      onError={onError}
                      onSelectionChange={onSelectionChange}
                      data={data}
                    >

                      <CellNavigationProvider
                        cellPosition={cellPosition}
                        focus={focus}
                        numRowsPerPage={numRowsPerPage}
                        onCellPositionChange={onCellPositionChange}
                      >
                        <ScrollProvider padding={padding}>

                          <Scroller>
                            <Slice
                              data={data}
                              onError={onError}
                              {...rest}
                            />
                          </Scroller>

                        </ScrollProvider>
                      </CellNavigationProvider>

                    </SelectionProvider>
                  </OrderByProvider>
                </ColumnsVisibilityProvider>
              </ColumnWidthsProvider>
            </ColumnParametersProvider>

            {/* puts a background behind the row labels column */}
            <div className={styles.mockRowLabel}>&nbsp;</div>

          </Wrapper>
        </DataProvider>
      </TableCornerSizeProvider>
    </ViewportSizeProvider>
  )
}
