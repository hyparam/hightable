interface TableProps {
  header: string[]
  data?: any[][]
}

/**
 * Render a table
 */
export default function HighTable({ header, data }: TableProps) {
  if (!header.length) return

  /**
   * Validate row length
   */
  function rowError(row: any[], rowIndex: number): string | undefined {
    if (row.length !== header.length) {
      return `Row ${rowIndex + 1} length does not match header`
    }
    return undefined
  }

  return <div className='table-container'>
    <div style={{ overflow: 'auto' }}>
      <table className='table'>
        <thead>
          <tr>
            <th></th>
            {header.map((row, index) => (
              <th key={index} style={{ maxWidth: 'inherit' }}>{row}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.map((row, rowIndex) => (
            <tr key={rowIndex} title={rowError(row, rowIndex)}>
              <td>{(rowIndex + 1).toLocaleString()}</td>
              {Array.from(row).map((columnValue, columnIndex) => (
                <td key={columnIndex} style={{ maxWidth: 'inherit' }} title={title(columnValue)}>
                  {columnValue?.toString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className='tableCorner'>&nbsp;</div>
  </div>
}

function title(value: any): string | undefined {
  const str = value?.toString()
  if (str?.length > 20) return str
}
