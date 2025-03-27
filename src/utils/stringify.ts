/**
 * Robust stringification of any value, including json and bigints.
 */
export function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return value.toLocaleString('en-US')
  if (typeof value === 'boolean') return value.toString()
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => indent(stringify(v), 2)).join(',\n')}\n]`
  }
  if (value === null || value === undefined) return JSON.stringify(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    return `{${Object.entries(value)
      .filter((d) => d[1] !== undefined)
      .map(([k, v]) => `${k}: ${stringify(v)}`)
      .join(', ')}}`
  }
  return '{}'
}

function indent(text: string | undefined, spaces: number) {
  return text
    ?.split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n')
}
