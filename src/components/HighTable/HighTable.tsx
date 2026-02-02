import { DataProvider } from '../../providers/DataProvider.js'
import { ErrorProvider } from '../../providers/ErrorProvider.js'
import type { HighTableProps } from '../../types.js'
import Wrapper from './Wrapper.js'

export default function HighTable({ data, maxRowNumber, onError, onWarn, ...rest }: HighTableProps) {
  return (
    <ErrorProvider onError={onError} onWarn={onWarn}>
      <DataProvider data={data} maxRowNumber={maxRowNumber}>
        <Wrapper {...rest} />
      </DataProvider>
    </ErrorProvider>
  )
}
