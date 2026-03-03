import { columnWidthsSuffix } from '../../helpers/constants.js'
import styles from '../../HighTable.module.css'
import { useData } from '../../hooks/useData.js'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnsVisibilityProvider } from '../../providers/ColumnsVisibilityProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
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
  const { dataId, numRows, version } = useData({ data })

  return (
    /* The state is handled with contexts, even if it creates a "Providers hell". No need for state library for now. */
    <ViewportSizeProvider>
      <TableCornerSizeProvider>
        <Wrapper styled={styled} numRows={numRows} maxRowNumber={maxRowNumber} className={className}>

          <div className={styles.topBorder} role="presentation" />

          <ColumnParametersProvider
            columnConfiguration={columnConfiguration}
            columnDescriptors={data.columnDescriptors}
          >
            <ColumnWidthsProvider
              /**
               * Recreate a context if a new data frame is passed (but not if only the number of rows changed)
               * The user can also pass a cacheKey to force a new set of widths, or keep the current ones.
               */
              key={cacheKey ?? dataId}
              // TODO(SL): pass cacheKey, memoize
              localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined}
              numColumns={data.columnDescriptors.length}
            >
              <ColumnsVisibilityProvider
                /**
                 * Recreate a context if a new data frame is passed (but not if only the number of rows changed)
                 */
                key={dataId}
                columnsVisibility={columnsVisibility}
                onColumnsVisibilityChange={onColumnsVisibilityChange}
              >
                <OrderByProvider
                  /**
                   * Recreate a context if a new data frame is passed, to flush the cache (ranks and indexes)
                   * (but not if only the number of rows changed)
                   */
                  key={dataId}
                  orderBy={orderBy}
                  onOrderByChange={onOrderByChange}
                >
                  <SelectionProvider
                    /**
                     * Recreate a context if a new data frame is passed, because the selection might not make sense anymore
                     * (but not if only the number of rows changed)
                     */
                    key={dataId}
                    selection={selection}
                    onError={onError}
                    onSelectionChange={onSelectionChange}
                    data={data}
                    numRows={numRows}
                  >

                    <CellNavigationProvider
                      key={dataId}
                      cellPosition={cellPosition}
                      focus={focus}
                      numRows={numRows}
                      numRowsPerPage={numRowsPerPage}
                      onCellPositionChange={onCellPositionChange}
                    >
                      <ScrollProvider
                        numRows={numRows}
                        padding={padding}
                      >

                        <Scroller>
                          <Slice
                            data={data}
                            numRows={numRows}
                            onError={onError}
                            version={version}
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
      </TableCornerSizeProvider>
    </ViewportSizeProvider>
  )
}
