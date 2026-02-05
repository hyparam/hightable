import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'

import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { columnVisibilityStatesSuffix, columnWidthsSuffix, rowHeight } from '../../helpers/constants.js'
import styles from '../../HighTable.module.css'
import { useData } from '../../hooks/useData.js'
import { useHTMLElement } from '../../hooks/useHTMLElement.js'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnVisibilityStatesProvider } from '../../providers/ColumnVisibilityStatesProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { ScrollProvider } from '../../providers/ScrollProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import type { HighTableProps } from '../../types.js'
import Scroller from './Scroller.js'
import Slice from './Slice.js'

export default function HighTable({
  columnConfiguration,
  cacheKey,
  className = '',
  data,
  focus,
  maxRowNumber,
  numRowsPerPage,
  orderBy,
  padding,
  selection,
  styled = true,
  onColumnsVisibilityChange,
  onError,
  onOrderByChange,
  onSelectionChange,
  ...rest
}: HighTableProps) {
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  const [tableCornerSize, setTableCornerSize] = useState<{ width: number, height: number } | undefined>(undefined)
  const { dataId, numRows, version } = useData({ data })

  const columnNames = useMemo(() => data.columnDescriptors.map(d => d.name), [data.columnDescriptors])

  const initialVisibilityStates = useMemo(() => {
    if (!columnConfiguration) return undefined
    const states: Record<string, { hidden: true } | undefined> = {}
    for (const descriptor of data.columnDescriptors) {
      const config = columnConfiguration[descriptor.name]
      if (config?.initiallyHidden) {
        states[descriptor.name] = { hidden: true as const }
      }
    }
    return states
  }, [columnConfiguration, data.columnDescriptors])

  const headerHeight = useMemo(() => {
    return tableCornerSize?.height ?? rowHeight
  }, [tableCornerSize])

  const tableScrollStyle = useMemo(() => {
    // reserve space for at least 3 characters
    const numCharacters = Math.max((maxRowNumber ?? numRows).toLocaleString('en-US').length, 3)
    return {
      '--column-header-height': `${headerHeight}px`,
      '--row-number-characters': `${numCharacters}`,
    } as CSSProperties
  }, [headerHeight, maxRowNumber, numRows])

  const classes = useMemo(() => {
    return `${styles.hightable} ${styled ? styles.styled : ''} ${className}`
  }, [className, styled])

  // Get a reference to the container element
  const { element: container, onMount } = useHTMLElement<HTMLDivElement>()

  return (
    <div ref={onMount} className={classes} style={tableScrollStyle}>
      <div className={styles.topBorder} role="presentation" />

      <PortalContainerContext.Provider value={container}>
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
            viewportWidth={viewportWidth}
            tableCornerWidth={tableCornerSize?.width}
          >
            <ColumnVisibilityStatesProvider
              /**
               * Recreate a context if a new data frame is passed (but not if only the number of rows changed)
               * The user can also pass a cacheKey to force a new set of visibility states, or keep the current ones.
               */
              key={cacheKey ?? dataId}
              // TODO(SL): pass cacheKey, memoize
              localStorageKey={cacheKey ? `${cacheKey}${columnVisibilityStatesSuffix}` : undefined}
              columnNames={columnNames}
              initialVisibilityStates={initialVisibilityStates}
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
                    focus={focus}
                    numRows={numRows}
                    numRowsPerPage={numRowsPerPage}
                  >
                    <ScrollProvider
                      numRows={numRows}
                      headerHeight={headerHeight}
                      padding={padding}
                    >

                      <Scroller
                        setViewportWidth={setViewportWidth}
                      >
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
            </ColumnVisibilityStatesProvider>
          </ColumnWidthsProvider>
        </ColumnParametersProvider>
      </PortalContainerContext.Provider>

      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>

    </div>
  )
}
