import type { CSSProperties } from 'react'
import { useState } from 'react'

import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { columnWidthsSuffix, rowHeight } from '../../helpers/constants.js'
import styles from '../../HighTable.module.css'
import { useData } from '../../hooks/useData.js'
import { useHTMLElement } from '../../hooks/useHTMLElement.js'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnsVisibilityProvider } from '../../providers/ColumnsVisibilityProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { ScrollProvider } from '../../providers/ScrollProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import { ViewportSizeProvider } from '../../providers/ViewportSizeProvider.js'
import type { HighTableProps } from '../../types.js'
import Scroller from './Scroller.js'
import Slice from './Slice.js'

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
  const [tableCornerSize, setTableCornerSize] = useState<{ width: number, height: number } | undefined>(undefined)
  const { dataId, numRows, version } = useData({ data })

  const headerHeight = tableCornerSize?.height ?? rowHeight

  // reserve space for at least 3 characters
  const numCharacters = Math.max((maxRowNumber ?? numRows).toLocaleString('en-US').length, 3)

  // Get a reference to the container element
  const { element: container, onMount } = useHTMLElement<HTMLDivElement>()

  return (
    <div
      ref={onMount}
      className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`}
      style={{
        '--column-header-height': `${headerHeight}px`,
        '--row-number-characters': `${numCharacters}`,
      } as CSSProperties}
    >
      <div className={styles.topBorder} role="presentation" />

      {/* The state is handled with contexts, even if it creates a "Providers hell". No need for state library for now. */}
      <PortalContainerContext.Provider value={container}>
        <ColumnParametersProvider
          columnConfiguration={columnConfiguration}
          columnDescriptors={data.columnDescriptors}
        >
          <ViewportSizeProvider>
            <ColumnWidthsProvider
            /**
             * Recreate a context if a new data frame is passed (but not if only the number of rows changed)
             * The user can also pass a cacheKey to force a new set of widths, or keep the current ones.
             */
              key={cacheKey ?? dataId}
              // TODO(SL): pass cacheKey, memoize
              localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined}
              numColumns={data.columnDescriptors.length}
              tableCornerWidth={tableCornerSize?.width}
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
                        headerHeight={headerHeight}
                        padding={padding}
                      >

                        <Scroller>
                          <Slice
                            data={data}
                            numRows={numRows}
                            onError={onError}
                            setTableCornerSize={setTableCornerSize}
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
          </ViewportSizeProvider>
        </ColumnParametersProvider>
      </PortalContainerContext.Provider>

      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>

    </div>
  )
}
