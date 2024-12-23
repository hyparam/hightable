import { describe, expect, it, vi } from 'vitest'
import { createTableControl } from '../src/HighTable.js'

describe('createTableControl', () => {
  it('returns an object with a publisher and setOrderBy function', () => {
    const tableControl = createTableControl()
    const subscriber = vi.fn()
    expect(tableControl).toHaveProperty('publisher')
    expect(tableControl).toHaveProperty('setOrderBy')
    expect(typeof tableControl.publisher.subscribe).toBe('function')
    expect(typeof tableControl.publisher.unsubscribe).toBe('function')
    expect(typeof tableControl.setOrderBy).toBe('function')
  })

  it('publishes SET_ORDER action with correct orderBy when setOrderBy is called', () => {
    const tableControl = createTableControl()
    const subscriber = vi.fn()
    tableControl.publisher.subscribe(subscriber)
    tableControl.setOrderBy('name')

    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith({
      type: 'SET_ORDER',
      orderBy: 'name',
    })
  })

  it('does not call unsubscribed subscriber', () => {
    const tableControl = createTableControl()
    const subscriber = vi.fn()
    tableControl.publisher.subscribe(subscriber)
    tableControl.publisher.unsubscribe(subscriber)
    tableControl.setOrderBy('price')

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('allows multiple subscribers to receive the published action', () => {
    const tableControl = createTableControl()
    const subscriber = vi.fn()
    const anotherSubscriber = vi.fn()
    tableControl.publisher.subscribe(subscriber)
    tableControl.publisher.subscribe(anotherSubscriber)
    tableControl.setOrderBy('quantity')

    expect(subscriber).toHaveBeenCalledWith({
      type: 'SET_ORDER',
      orderBy: 'quantity',
    })
    expect(anotherSubscriber).toHaveBeenCalledWith({
      type: 'SET_ORDER',
      orderBy: 'quantity',
    })
  })
})
