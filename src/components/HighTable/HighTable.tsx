import { ErrorProvider } from '../../providers/ErrorProvider.js'
import type { HighTableProps } from '../../types.js'
import Wrapper from './Wrapper.js'

export default function HighTable({ onError, ...rest }: HighTableProps) {
  return (
    <ErrorProvider onError={onError}>
      <Wrapper {...rest} />
    </ErrorProvider>
  )
}
