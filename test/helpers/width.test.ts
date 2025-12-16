import { describe, expect, it } from 'vitest'

import { cellStyle } from '../../src/helpers/width.js'

describe('cellStyle', () => {
  it('returns correct style for defined width', () => {
    const style = cellStyle(100)
    expect(style).toEqual({ minWidth: '100px', maxWidth: '100px' })
  })

  it('returns correct style for undefined width', () => {
    const style = cellStyle(undefined)
    expect(style).toEqual({ minWidth: undefined, maxWidth: undefined })
  })
})
