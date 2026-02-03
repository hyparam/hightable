import type { HighTableProps } from '../../types.js'
import Wrapper from './Wrapper.js'

export default function HighTable({ ...rest }: HighTableProps) {
  return (
    <Wrapper {...rest} />
  )
}
