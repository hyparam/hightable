export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}

export function measureWidth(element: HTMLTableCellElement): number {
  // get computed cell padding
  const style = window.getComputedStyle(element)
  const horizontalPadding = parseInt(style.paddingLeft) + parseInt(style.paddingRight)
  return element.offsetWidth - horizontalPadding
}
