import { type ReactNode } from 'react'

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

export default function HighTable(props: HighTableProps) {
  return (
    // The DataProvider is remounted on data change, so everything is recreated.
    // TODO(SL): if this becomes a performance issue, we can revisit this behavior, and update the
    // state more granularly.
    <DataProvider data={props.data}>
      <State {...props}>
        <DOM {...props} />
      </State>
    </DataProvider>
  )
}

type StateProps = Pick<HighTableProps, 'columnConfiguration' | 'cacheKey' | 'cellPosition' | 'columnsVisibility' | 'data' | 'focus' | 'numRowsPerPage' | 'orderBy' | 'padding' | 'selection' | 'onCellPositionChange' | 'onColumnsVisibilityChange' | 'onError' | 'onOrderByChange' | 'onSelectionChange'>
  & { children: ReactNode }

function State({
  children,
  columnConfiguration,
  cacheKey,
  cellPosition,
  columnsVisibility,
  data,
  focus,
  numRowsPerPage,
  orderBy,
  padding,
  selection,
  onCellPositionChange,
  onColumnsVisibilityChange,
  onError,
  onOrderByChange,
  onSelectionChange,
}: StateProps) {
  return (
    /* The state is handled with contexts, even if it creates a "Providers hell". No need for state library for now. */
    <ViewportSizeProvider>
      <TableCornerSizeProvider>
        <ColumnParametersProvider
          columnConfiguration={columnConfiguration}
          columnDescriptors={data.columnDescriptors}
        >
          <ColumnWidthsProvider
            // Recreate a context if a new cacheKey is provided.
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
                      {children}
                    </ScrollProvider>
                  </CellNavigationProvider>
                </SelectionProvider>
              </OrderByProvider>
            </ColumnsVisibilityProvider>
          </ColumnWidthsProvider>
        </ColumnParametersProvider>
      </TableCornerSizeProvider>
    </ViewportSizeProvider>
  )
}

type DOMProps = Pick<HighTableProps, 'className' | 'data' | 'maxRowNumber' | 'onError' | 'styled' | 'numRowsPerPage' | 'onDoubleClickCell' | 'onKeyDownCell' | 'onMouseDownCell' | 'overscan' | 'renderCellContent' | 'stringify'>

function DOM({
  className = '',
  data,
  maxRowNumber,
  overscan,
  styled = true,
  onDoubleClickCell,
  onError,
  onKeyDownCell,
  onMouseDownCell,
  renderCellContent,
  stringify,
}: DOMProps) {
  return (
    <Wrapper styled={styled} maxRowNumber={maxRowNumber} className={className}>
      <div className={styles.topBorder} role="presentation" />

      <Scroller>
        <Slice
          data={data}
          overscan={overscan}
          onDoubleClickCell={onDoubleClickCell}
          onError={onError}
          onKeyDownCell={onKeyDownCell}
          onMouseDownCell={onMouseDownCell}
          renderCellContent={renderCellContent}
          stringify={stringify}
        />
      </Scroller>

      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>
    </Wrapper>
  )
}
