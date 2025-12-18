import { render as reactRender } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'

// setup function
export function render(jsx: ReactNode) {
  return {
    // Setup userEvent
    user: userEvent.setup(),
    // Import `render` from React
    // See https://testing-library.com/docs/dom-testing-library/install#wrappers
    ...reactRender(jsx),
  }
}
