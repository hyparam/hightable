import './global.css'

import type { Preview } from '@storybook/react-vite'
import { scan } from 'react-scan'

// Only run the scan in Storybook in isolation mode
// (it does not work in normal mode, see https://github.com/aidenybai/react-scan/issues/285#issuecomment-2707163571)
if (typeof window !== 'undefined' && window.top === window.self) {
  scan({
    enabled: true,
    log: true,
  })
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
