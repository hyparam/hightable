# HighTable

![HighTable](hightable.jpg)

[![npm](https://img.shields.io/npm/v/hightable)](https://www.npmjs.com/package/hightable)
[![workflow status](https://github.com/hyparam/hightable/actions/workflows/ci.yml/badge.svg)](https://github.com/hyparam/hightable/actions)
[![mit license](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-83-darkred)

HighTable is a windowed table component for viewing large-scale data in the browser.

HighTable is designed to load only the necessary data to render the current view.

Built on React.

## Features

 - **Virtual Scrolling**: Loads and renders rows based on the viewport, optimizing performance for large datasets.
 - **Customizable Cell Rendering**: Allows for custom rendering of cells.
 - **Event Handling**: Supports double-click events on cells.

## Demo

https://hyparam.github.io/hightable/

## Installation

Ensure you have React set up in your project. Install HighTable package:

```sh
npm i hightable
```

## Usage

```jsx
import HighTable from 'hightable'

const dataframe = {
  header: ['Column 1', 'Column 2', 'Column 3'],
  numRows: 1000,
  rows: async (start, end) => {
    // fetch rows from your data source here
    return fetchRows(start, end)
  },
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

 - `data`: The data model for the table. Must include methods for header and rows fetching.
 - `onDoubleClickCell`: Optional. Called when a cell is double-clicked. Receives the row and column indexes as arguments.
 - `setError`: Callback for error handling.

## Styling

HighTable includes core CSS styling to make the table work, but you can apply CSS styling to customize table elements.
