export type Cells = Record<string, any>

export interface ResolvedValue {
  value: any
}

export interface CommonDataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
}
