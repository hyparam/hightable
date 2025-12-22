import type { CSSProperties } from 'react'
import { useContext, useMemo, useRef, useState } from 'react'

import { DataContext } from '../../contexts/DataContext.js'
import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import type { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import styles from '../../HighTable.module.css'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnVisibilityStatesProvider } from '../../providers/ColumnVisibilityStatesProvider.js'
import { type MaybeHiddenColumn } from '../../providers/ColumnVisibilityStatesProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import { rowHeight } from './constants.js'
import { columnVisibilityStatesSuffix, columnWidthsSuffix } from './constants.js'
import type { ScrollerProps } from './Scroller.js'
import Scroller from './Scroller.js'
import Slice from './Slice.js'

export type WrapperProps = {
  className?: string // additional class names for the component
  styled?: boolean // use styled component? (default true)
  cacheKey?: string // used to persist column widths. If undefined, the column widths are not persisted. It is expected to be unique for each table.
  columnConfiguration?: ColumnConfiguration
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onColumnsVisibilityChange?: (columns: Record<string, MaybeHiddenColumn>) => void // callback which is called whenever the set of hidden columns changes.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
} & ScrollerProps

export default function Wrapper({
  columnConfiguration,
  cacheKey,
  className = '',
  orderBy,
  padding,
  overscan,
  selection,
  styled = true,
  onColumnsVisibilityChange,
  onOrderByChange,
  onSelectionChange,
  ...rest
}: WrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  const [tableCornerWidth, setTableCornerWidth] = useState<number | undefined>(undefined)
  const { data, key, maxRowNumber, numRows } = useContext(DataContext)

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

  const tableScrollStyle = useMemo(() => {
    // reserve space for at least 3 characters
    const numCharacters = Math.max(maxRowNumber.toLocaleString('en-US').length, 3)
    return {
      '--column-header-height': `${rowHeight}px`,
      '--row-number-characters': `${numCharacters}`,
    } as CSSProperties
  }, [maxRowNumber])

  return (
    <div ref={ref} className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`} style={tableScrollStyle}>
      <div className={styles.topBorder} role="presentation" />

      {/* Provide the column configuration to the table */}
      <ColumnParametersProvider columnConfiguration={columnConfiguration} columnDescriptors={data.columnDescriptors}>
        {/* Create a new set of widths if the data has changed, but keep it if only the number of rows changed */}
        <ColumnWidthsProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined} numColumns={data.columnDescriptors.length} viewportWidth={viewportWidth} tableCornerWidth={tableCornerWidth}>
          {/* Create a new set of hidden columns if the data has changed, but keep it if only the number of rows changed */}
          <ColumnVisibilityStatesProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnVisibilityStatesSuffix}` : undefined} columnNames={columnNames} initialVisibilityStates={initialVisibilityStates} onColumnsVisibilityChange={onColumnsVisibilityChange}>
            {/* Create a new context if the dataframe changes, to flush the cache (ranks and indexes) */}
            <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange}>
              {/* Create a new selection context if the dataframe has changed */}
              <SelectionProvider key={key} selection={selection} onSelectionChange={onSelectionChange} data={data} numRows={numRows}>
                {/* Create a new navigation context if the dataframe has changed, because the focused cell might not exist anymore */}
                <CellNavigationProvider key={key}>
                  {/* TODO(SL): passing a ref to an element is code smell */}
                  <PortalContainerContext.Provider value={{ containerRef: ref }}>

                    <Scroller setViewportWidth={setViewportWidth} overscan={overscan} padding={padding}>
                      <Slice
                        padding={padding}
                        setTableCornerWidth={setTableCornerWidth}
                        {...rest}
                      />
                    </Scroller>

                  </PortalContainerContext.Provider>
                </CellNavigationProvider>
              </SelectionProvider>
            </OrderByProvider>
          </ColumnVisibilityStatesProvider>
        </ColumnWidthsProvider>
      </ColumnParametersProvider>

      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>
    </div>
  )
}
