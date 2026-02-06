import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ColumnParameters } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnParametersContext } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnsVisibilityContext } from '../../src/contexts/ColumnsVisibilityContext.js'
import type { ColumnsVisibility } from '../../src/providers/ColumnsVisibilityProvider.js'
import { ColumnsVisibilityProvider } from '../../src/providers/ColumnsVisibilityProvider.js'

interface Props {
  columnParameters: ColumnParameters[]
  columnsVisibility?: ColumnsVisibility
  onColumnsVisibilityChange?: (columnsVisibility: ColumnsVisibility) => void
}

function WrapperComponent({ columnParameters, columnsVisibility, onColumnsVisibilityChange, children }: Props & { children: ReactNode }) {
  return (
    <ColumnParametersContext value={columnParameters}>
      <ColumnsVisibilityProvider columnsVisibility={columnsVisibility} onColumnsVisibilityChange={onColumnsVisibilityChange}>
        {children}
      </ColumnsVisibilityProvider>
    </ColumnParametersContext>
  )
}
function createWrapper(props: Props) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <WrapperComponent {...props}>{children}</WrapperComponent>
  }
  return Wrapper
}

function useColumnsVisibility() {
  return useContext(ColumnsVisibilityContext)
}

function getDefaultColumnParameters(columnNames: string[]) {
  return columnNames.map((name, index) => ({ name, index, sortable: false }))
}

describe('ColumnsVisibilityProvider', () => {
  describe('in uncontrolled mode (without columnsVisibility)', () => {
    describe('if there are 3 columns and no initiallyHidden column', () => {
      const defaultColumnNames = ['column1', 'column2', 'column3']
      const columnParameters = getDefaultColumnParameters(defaultColumnNames)
      it('all the columns are visible', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        expect(result.current.numberOfVisibleColumns).toBe(3)
        expect(result.current.visibleColumnsParameters).toEqual(columnParameters)
        expect(result.current.isHiddenColumn?.('column1')).toBe(false)
        expect(result.current.isHiddenColumn?.('column2')).toBe(false)
        expect(result.current.isHiddenColumn?.('column3')).toBe(false)
      })
      it('any column can be hidden', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        expect(result.current.getHideColumn?.('column1')).toBeDefined()
        expect(result.current.getHideColumn?.('column2')).toBeDefined()
        expect(result.current.getHideColumn?.('column3')).toBeDefined()
      })
      it('hides a column when getHideColumn is called and used', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        const hideColumn1 = result.current.getHideColumn?.('column1')
        act(() => {
          hideColumn1?.()
        })
        expect(result.current.numberOfVisibleColumns).toBe(2)
        expect(result.current.visibleColumnsParameters).toEqual(columnParameters.filter(c => c.name !== 'column1'))
        expect(result.current.isHiddenColumn?.('column1')).toBe(true)
        expect(result.current.isHiddenColumn?.('column2')).toBe(false)
        expect(result.current.isHiddenColumn?.('column3')).toBe(false)
      })
      it('can hide two columns, but not three', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        const hideColumn1 = result.current.getHideColumn?.('column1')
        act(() => {
          hideColumn1?.()
        })
        const hideColumn2 = result.current.getHideColumn?.('column2')
        act(() => {
          hideColumn2?.()
        })
        expect(result.current.isHiddenColumn?.('column1')).toBe(true)
        expect(result.current.isHiddenColumn?.('column2')).toBe(true)
        expect(result.current.isHiddenColumn?.('column3')).toBe(false)
        expect(result.current.getHideColumn?.('column1')).toBeUndefined()
        expect(result.current.getHideColumn?.('column2')).toBeUndefined()
        expect(result.current.getHideColumn?.('column3')).toBeUndefined()
      })
      it('cannot hide a column if the column name does not exist', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        expect(result.current.getHideColumn?.('nonExistingColumn')).toBeUndefined()
      })
      it('does not show the showAllColumns function as there are no hidden columns', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        expect(result.current.showAllColumns).toBeUndefined()
      })
      it('shows the showAllColumns function when there is one hidden column, and shows all columns when it is called', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        const hideColumn1 = result.current.getHideColumn?.('column1')
        act(() => {
          hideColumn1?.()
        })
        expect(result.current.showAllColumns).toBeDefined()
        act(() => {
          result.current.showAllColumns?.()
        })
        expect(result.current.numberOfVisibleColumns).toBe(3)
        expect(result.current.isHiddenColumn?.('column1')).toBe(false)
        expect(result.current.isHiddenColumn?.('column2')).toBe(false)
        expect(result.current.isHiddenColumn?.('column3')).toBe(false)
        expect(result.current.showAllColumns).toBeUndefined()
      })
      it('shows the showAllColumns function when there are 2 hidden columns, and shows all columns when it is called', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        const hideColumn1 = result.current.getHideColumn?.('column1')
        act(() => {
          hideColumn1?.()
        })
        const hideColumn2 = result.current.getHideColumn?.('column2')
        act(() => {
          hideColumn2?.()
        })
        expect(result.current.showAllColumns).toBeDefined()
        act(() => {
          result.current.showAllColumns?.()
        })
        expect(result.current.numberOfVisibleColumns).toBe(3)
        expect(result.current.isHiddenColumn?.('column1')).toBe(false)
        expect(result.current.isHiddenColumn?.('column2')).toBe(false)
        expect(result.current.isHiddenColumn?.('column3')).toBe(false)
        expect(result.current.showAllColumns).toBeUndefined()
      })
      describe('if onColumnsVisibilityChange is provided', () => {
        it('is not called on init', () => {
          const onColumnsVisibilityChange = vi.fn()
          renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters, onColumnsVisibilityChange }) })
          expect(onColumnsVisibilityChange).not.toHaveBeenCalled()
        })
        it('is called with the new value of columnsVisibility state when a column is hidden', () => {
          const onColumnsVisibilityChange = vi.fn()
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters, onColumnsVisibilityChange }) })
          act(() => {
            result.current.getHideColumn?.('column1')?.()
          })
          expect(onColumnsVisibilityChange).toHaveBeenCalledWith({ column1: { hidden: true } })
        })
        it('is called with the new value of columnsVisibility state when two columns are hidden', () => {
          const onColumnsVisibilityChange = vi.fn()
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters, onColumnsVisibilityChange }) })
          act(() => {
            result.current.getHideColumn?.('column1')?.()
          })
          act(() => {
            result.current.getHideColumn?.('column2')?.()
          })
          expect(onColumnsVisibilityChange).toHaveBeenCalledWith({ column1: { hidden: true }, column2: { hidden: true } })
        })
        it('is called with the new value of columnsVisibility state when showAllColumns is called', () => {
          const onColumnsVisibilityChange = vi.fn()
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters, onColumnsVisibilityChange }) })
          act(() => {
            result.current.getHideColumn?.('column1')?.()
          })
          act(() => {
            result.current.getHideColumn?.('column2')?.()
          })
          act(() => {
            result.current.showAllColumns?.()
          })
          expect(onColumnsVisibilityChange).toHaveBeenCalledWith({})
        })
      })
      describe('if one column is initially hidden', () => {
        const columnParameters = [
          { name: 'column1', index: 0, sortable: false },
          { name: 'column2', index: 1, sortable: false, initiallyHidden: true },
          { name: 'column3', index: 2, sortable: false },
        ]
        it('the initially hidden column is not visible, and the other two columns are visible', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.numberOfVisibleColumns).toBe(2)
          expect(result.current.visibleColumnsParameters).toEqual(columnParameters.filter(c => c.name !== 'column2'))
          expect(result.current.isHiddenColumn?.('column1')).toBe(false)
          expect(result.current.isHiddenColumn?.('column2')).toBe(true)
          expect(result.current.isHiddenColumn?.('column3')).toBe(false)
        })
      })
      describe('if two columns are initially hidden', () => {
        const columnParameters = [
          { name: 'column1', index: 0, sortable: false, initiallyHidden: true },
          { name: 'column2', index: 1, sortable: false, initiallyHidden: true },
          { name: 'column3', index: 2, sortable: false },
        ]
        it('the initially hidden columns are not visible, and the other column is visible', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.numberOfVisibleColumns).toBe(1)
          expect(result.current.visibleColumnsParameters).toEqual(columnParameters.filter(c => c.name === 'column3'))
          expect(result.current.isHiddenColumn?.('column1')).toBe(true)
          expect(result.current.isHiddenColumn?.('column2')).toBe(true)
          expect(result.current.isHiddenColumn?.('column3')).toBe(false)
        })
        it('no column can be hidden as there are already 2 hidden columns', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.getHideColumn?.('column1')).toBeUndefined()
          expect(result.current.getHideColumn?.('column2')).toBeUndefined()
          expect(result.current.getHideColumn?.('column3')).toBeUndefined()
        })
      })
      describe('if all columns are initially hidden', () => {
        const columnParameters = [
          { name: 'column1', index: 0, sortable: false, initiallyHidden: true },
          { name: 'column2', index: 1, sortable: false, initiallyHidden: true },
          { name: 'column3', index: 2, sortable: false, initiallyHidden: true },
        ]
        it('no column is visible', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.numberOfVisibleColumns).toBe(0)
          expect(result.current.visibleColumnsParameters).toEqual([])
          expect(result.current.isHiddenColumn?.('column1')).toBe(true)
          expect(result.current.isHiddenColumn?.('column2')).toBe(true)
          expect(result.current.isHiddenColumn?.('column3')).toBe(true)
        })
        it('no column can be hidden', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.getHideColumn?.('column1')).toBeUndefined()
          expect(result.current.getHideColumn?.('column2')).toBeUndefined()
          expect(result.current.getHideColumn?.('column3')).toBeUndefined()
          expect(result.current.showAllColumns).toBeDefined()
        })
        it('can show all columns using showAllColumns, and then all columns are visible and can be hidden', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.showAllColumns).toBeDefined()
          act(() => {
            result.current.showAllColumns?.()
          })
          expect(result.current.numberOfVisibleColumns).toBe(3)
          expect(result.current.visibleColumnsParameters).toEqual(columnParameters)
          expect(result.current.isHiddenColumn?.('column1')).toBe(false)
          expect(result.current.isHiddenColumn?.('column2')).toBe(false)
          expect(result.current.isHiddenColumn?.('column3')).toBe(false)
          expect(result.current.getHideColumn?.('column1')).toBeDefined()
          expect(result.current.getHideColumn?.('column2')).toBeDefined()
          expect(result.current.getHideColumn?.('column3')).toBeDefined()
        })
      })
    })

    describe('if there are no columns', () => {
      it('showAllColumns is undefined, and no column is visible', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters: [] }) })
        expect(result.current.numberOfVisibleColumns).toBe(0)
        expect(result.current.visibleColumnsParameters).toEqual([])
        expect(result.current.showAllColumns).toBeUndefined()
      })
      it('getHideColumn returns undefined for any column name', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters: [] }) })
        expect(result.current.getHideColumn?.('anyColumn')).toBeUndefined()
      })
      it('isHiddenColumn returns false for any column name', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters: [] }) })
        expect(result.current.isHiddenColumn?.('anyColumn')).toBe(false)
      })
    })

    describe('if there is 1 column', () => {
      const columnParameters = getDefaultColumnParameters(['onlyColumn'])
      it('the only column is visible, and cannot be hidden', () => {
        const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
        expect(result.current.numberOfVisibleColumns).toBe(1)
        expect(result.current.visibleColumnsParameters).toEqual(columnParameters)
        expect(result.current.isHiddenColumn?.('onlyColumn')).toBe(false)
        expect(result.current.getHideColumn?.('onlyColumn')).toBeUndefined()
      })

      describe('if the only column is initially hidden', () => {
        const columnParameters = [{ name: 'onlyColumn', index: 0, sortable: false, initiallyHidden: true }]

        it('it is not visible and cannot be hidden', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.numberOfVisibleColumns).toBe(0)
          expect(result.current.visibleColumnsParameters).toEqual([])
          expect(result.current.isHiddenColumn?.('onlyColumn')).toBe(true)
          expect(result.current.getHideColumn?.('onlyColumn')).toBeUndefined()
        })

        it('it can be shown using showAllColumns, and cannot be hidden afterward', () => {
          const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters }) })
          expect(result.current.showAllColumns).toBeDefined()
          act(() => {
            result.current.showAllColumns?.()
          })
          expect(result.current.numberOfVisibleColumns).toBe(1)
          expect(result.current.visibleColumnsParameters).toEqual(columnParameters)
          expect(result.current.isHiddenColumn?.('onlyColumn')).toBe(false)
          expect(result.current.getHideColumn?.('onlyColumn')).toBeUndefined()
        })

        describe('if onColumnsVisibilityChange is provided', () => {
          it('is called with the column is shown', () => {
            const onColumnsVisibilityChange = vi.fn()
            const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnParameters, onColumnsVisibilityChange }) })
            expect(onColumnsVisibilityChange).not.toHaveBeenCalled()
            act(() => {
              result.current.showAllColumns?.()
            })
            expect(onColumnsVisibilityChange).toHaveBeenCalledWith({})
          })
        })
      })
    })
  })
})
