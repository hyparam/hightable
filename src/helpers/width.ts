export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}

export function leftCellStyle(minWidth: number | undefined) {
  const px = minWidth ? `${minWidth}px` : undefined
  return { minWidth: px }
}

export function measureWidth(element: HTMLTableCellElement): number {
  // get computed cell padding
  const style = window.getComputedStyle(element)
  const horizontalPadding = parseInt(style.paddingLeft) + parseInt(style.paddingRight)
  // add 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.offsetWidth - horizontalPadding + 1
}
