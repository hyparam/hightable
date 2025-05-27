export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}

export function leftCellStyle(minWidth: number | undefined) {
  const px = minWidth ? `${minWidth}px` : undefined
  return { minWidth: px }
}

export function measureWidth(element: HTMLTableCellElement): number {
  // add 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.offsetWidth + 1
}
