export function cellStyle(width?: number, minWidth?: number) {
  if (width !== undefined) {
    const px = `${width}px`
    return { minWidth: px, maxWidth: px }
  }
  // if (minWidth !== undefined) {
  //   const px = `${minWidth}px`
  //   return { minWidth: px }
  // }
  return {}
}

// These two functions can be mocked in unit tests
export function getOffsetWidth(element: Pick<HTMLElement, 'offsetWidth'>): number {
  // add 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.offsetWidth + 1
}
export function getClientWidth(element: Pick<HTMLElement, 'clientWidth'>): number {
  // remove 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.clientWidth - 1
}
