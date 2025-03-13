export function measureWidth(element: HTMLTableCellElement): number | undefined {
  // get computed cell padding
  const style = window.getComputedStyle(element)
  const horizontalPadding = parseInt(style.paddingLeft) + parseInt(style.paddingRight)
  return element.offsetWidth - horizontalPadding
}
