export type Cells = Record<string, any>

export interface ResolvedValue<T = any> {
  value: T
}

export interface CommonDataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
}
