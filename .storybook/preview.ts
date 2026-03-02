import './global.css'

import type { Preview } from '@storybook/react-vite'
import { scan } from 'react-scan'

scan({
  enabled: true,
  log: true,
})

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
