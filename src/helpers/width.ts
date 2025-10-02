export function cellStyle(width?: number) {
  if (width === undefined) {
    return {}
  }
  const px = `${width}px`
  return { minWidth: px, maxWidth: px }
}

// These two functions can be mocked in unit tests
export function getOffsetWidth(element: Pick<HTMLElement, 'offsetWidth'>): number {
  return element.offsetWidth
}
export function getClientWidth(element: Pick<HTMLElement, 'clientWidth'>): number {
  return element.clientWidth
}
