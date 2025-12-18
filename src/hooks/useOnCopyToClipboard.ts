import type { ClipboardEvent } from 'react'
import { useCallback } from 'react'

export function useOnCopy(
  text?: string
): (event: ClipboardEvent<HTMLTableCellElement>) => void {
  return useCallback((event: ClipboardEvent<HTMLTableCellElement>) => {
    if (text === undefined || !document.getSelection()?.isCollapsed) {
      return
    }
    event.preventDefault()
    navigator.clipboard.writeText(text).catch((err) => {
      // TODO(SL): handle the error properly
      console.debug('Failed to write to clipboard: ', err)
    })
  }, [text])
}
