export type Cells = Record<string, any>

export interface ResolvedValue {
  value: any
}

export interface CancellableJob {
  // table can call cancel when a user scrolls out of view. dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  cancel(): void
}

export interface CommonDataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
}
