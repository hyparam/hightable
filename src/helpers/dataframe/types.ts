import type { OrderBy } from '../sort.js'

export type Cells = Record<string, any>

export interface ResolvedValue<T = any> {
  value: T
}

export interface DataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
  'dataframe:update': { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy };
  'dataframe:index:update': { rowStart: number, rowEnd: number, orderBy?: OrderBy };
}
