import { describe, expect, it, vi } from 'vitest'
import { loadColumnWidths, saveColumnWidth } from '../../../src/components/TableHeader/TableHeader.helpers.js'

vi.stubGlobal('localStorage', (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
  }
})())

describe('Column Widths LocalStorage Tests', () => {
  it('should return empty array for a non-existing key', () => {
    const widths = loadColumnWidths('nonExistingKey')
    expect(widths).toEqual([])
  })

  it('should add a new column width', () => {
    const key = 'testKey1'
    const newWidth = { columnIndex: 2, columnName: 'B', width: 150 }
    saveColumnWidth(key, newWidth)
    expect(loadColumnWidths(key)).toContainEqual(newWidth)
  })

  it('should update an existing column width', () => {
    const key = 'testKey2'
    const initialWidth = { columnIndex: 1, columnName: 'A', width: 100 }
    const updatedWidth = { ...initialWidth, width: 200 }
    saveColumnWidth(key, initialWidth)
    saveColumnWidth(key, updatedWidth)
    const widths = loadColumnWidths(key)
    expect(widths).toContainEqual(updatedWidth)
    expect(widths.length).toBe(1)
  })
})
