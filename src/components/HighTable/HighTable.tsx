import { DataProvider } from '../../providers/DataProvider.js'
import { ErrorProvider } from '../../providers/ErrorProvider.js'
import type { HighTableProps } from '../../types.js'
import Wrapper from './Wrapper.js'

export default function HighTable({ data, maxRowNumber, onError, ...rest }: HighTableProps) {
  return (
    <ErrorProvider onError={onError}>
      <DataProvider data={data} maxRowNumber={maxRowNumber}>
        <Wrapper {...rest} />
      </DataProvider>
    </ErrorProvider>
  )
}
