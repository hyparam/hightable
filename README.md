# HighTable

![HighTable](hightable.jpg)

[![npm](https://img.shields.io/npm/v/hightable)](https://www.npmjs.com/package/hightable)
[![workflow status](https://github.com/hyparam/hightable/actions/workflows/ci.yml/badge.svg)](https://github.com/hyparam/hightable/actions)
[![mit license](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-94-darkred)

HighTable is a virtualized table component for React, designed to efficiently display large datasets in the browser. It loads and renders only the rows necessary for the current viewport, enabling smooth scrolling and performance even with millions of rows. HighTable supports asynchronous data fetching, dynamic loading, and optional column sorting.

## Features

 - **Virtualized Scrolling**: Efficiently renders only the visible rows, optimizing performance for large datasets.
 - **Asynchronous Data Loading**: Fetches data on-demand as the user scrolls, supporting datasets of any size.
 - **Column Sorting**: Optional support for sorting data by columns.
 - **Column Resizing**: Allows for resizing columns to fit the available space and auto-sizing.
 - **Event Handling**: Supports double-click events on cells.
 - **Loading Placeholder**: Displays animated loading indicator per-cell.

## Demo

Live table demo: https://hyparam.github.io/hightable/

## Installation

Ensure you have React set up in your project. Install the HighTable package via npm:

```sh
npm i hightable
```

## Data Model

HighTable uses a data model called `DataFrame`, which defines how data is fetched and structured. The `DataFrame` object should have the following properties:

 - `header`: An array of strings representing the column names.
 - `numRows`: The total number of rows in the dataset.
 - `rows`: An asynchronous function that fetches rows. It should accept start and end row indices and return an array of row objects.
 - `sortable` (optional): A boolean indicating whether the table supports column sorting.

Each row object should be a mapping of column names to cell values.

### DataFrame Example

Data is provided to the table via a `DataFrame` interface.

```typescript
const dataframe = {
  header: ['ID', 'Name', 'Email'],
  numRows: 1000000,
  rows(start: number, end: number, orderBy?: string): Promise<Record<string, any>> {
    // Fetch rows from your data source here
    return fetchRowsFromServer(start, end, orderBy)
  },
  sortable: true, // Set to true if your data source supports sorting
}
```

## Usage

Here's a basic example of how to use HighTable in your React application:

```jsx
import HighTable from 'hightable'

const dataframe = {
  header: ['ID', 'Name', 'Email'],
  numRows: 1000000,
  rows(start, end, orderBy) {
    // fetch rows from your data source here
    return fetchRowsFromServer(start, end, orderBy)
  },
  sortable: true,
}

function App() {
  function onDoubleClickCell(row, col) {
    console.log(`Double clicked row ${row}, column ${col}`)
  }

  return <HighTable
    data={dataframe}
    setError={console.error}
    onDoubleClickCell={onDoubleClickCell} />
}
```

## Props

HighTable accepts the following props:

 - `data`: The data model for the table. Must include methods for header and rows fetching.
 - `onDoubleClickCell` (optional): Called when a cell is double-clicked. Receives the row and column indexes as arguments.
 - `onError` (optional): Callback for error handling.

### Prop Types

```typescript
interface TableProps {
  data: DataFrame
  onDoubleClickCell?: (row: number, col: number) => void
  onError?: (error: Error) => void
}
```

## Sorting

If your data source supports sorting, set the sortable property to true in your DataFrame object. When sorting is enabled, the rows function will receive an additional orderBy parameter, which represents the column name to sort by.

Ensure your rows function handles the orderBy parameter appropriately to return sorted data.

## Styling

HighTable includes basic CSS styling to make the table functional. You can customize the appearance of the table using CSS.
