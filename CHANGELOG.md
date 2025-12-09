# CHANGELOG

## [0.25.0](https://github.com/hyparam/hightable/compare/v0.24.1...v0.25.0) - 2025-12-09

### Added

- export dataframe from new entrypoint `hightable/dataframe` without react dependency ([#346](https://github.com/hyparam/hightable/pull/346)).

### Fixed

- fix environments without `crypto` (http://) by switching from randomUUID to incremental key ([#343](https://github.com/hyparam/hightable/pull/343)).

## [0.24.1](https://github.com/hyparam/hightable/compare/v0.24.0...v0.24.1) - 2025-12-01

### Fixed

- update numRows in data context when data frame changes ([#340](https://github.com/hyparam/hightable/pull/340)).

## [0.24.0](https://github.com/hyparam/hightable/compare/v0.23.0...v0.24.0) - 2025-11-29

### Changed

- **Breaking** - removed `columnsMetadata` option from `arrayDataFrame` and added `columnDescriptors` option instead ([#338](https://github.com/hyparam/hightable/pull/338)). This allows creating array dataframes with known column names but zero rows.

## [0.23.0](https://github.com/hyparam/hightable/compare/v0.22.2...v0.23.0) - 2025-11-28

### Changed

- **Breaking** - pass `exclusiveSort` as an explicit prop of `TableHeader` instead of reading from the data frame ([#334](https://github.com/hyparam/hightable/pull/334)).

### Removed

- **Breaking** - removed `filterDataFrame` helper function ([#336](https://github.com/hyparam/hightable/pull/336)).

### Added

- support updating `numRows` dynamically ([#337](https://github.com/hyparam/hightable/pull/337)).

### Fixed

- fix styles for tall headers ([#331](https://github.com/hyparam/hightable/pull/331)).

## [0.22.2](https://github.com/hyparam/hightable/compare/v0.22.1...v0.22.2) - 2025-11-18

### Fixed

- restore styles deleted by error in a previous commit ([#328](https://github.com/hyparam/hightable/pull/328)). The affected versions are v0.21.1 and v0.22.0.

## [0.22.1](https://github.com/hyparam/hightable/compare/v0.22.0...v0.22.1) - 2025-11-16

### Changed

- **Breaking** - prop `onColumnsVisibilityChange` now receives an object of type `{ [columnName: string]: { hidden: true } | undefined }` instead of an array of hidden column names ([#327](https://github.com/hyparam/hightable/pull/327)).


## [0.22.0](https://github.com/hyparam/hightable/compare/v0.21.1...v0.22.0) - 2025-11-15

### Changed

- **Breaking** - Moved `columnClassNames` prop into column configuration as `className` field ([#326](https://github.com/hyparam/hightable/pull/326)).

## [0.21.1](https://github.com/hyparam/hightable/compare/v0.21.0...v0.21.1) - 2025-11-14

### Added

- New `initiallyHidden` parameter in column configuration to hide a column at start ([#322](https://github.com/hyparam/hightable/pull/322)).
- `headerComponent` in column configuration can now be a function that receives the header controls, and returns a React node ([#321](https://github.com/hyparam/hightable/pull/321)).

### Refactored

- upgrade development dependencies: ([#323](https://github.com/hyparam/hightable/pull/323)).

## [0.21.0](https://github.com/hyparam/hightable/compare/v0.20.4...v0.21.0) - 2025-11-06

### Added

- add optional `maxRowNumber` prop to `HighTable` to help autosize the row numbers column on a filtered data frame ([#316](https://github.com/hyparam/hightable/pull/316)).

### Changed

- **Breaking** - autosize the row numbers column, with new CSS variables ([#316](https://github.com/hyparam/hightable/pull/316)).

### Refactored

- upgrade development dependencies: ([#315](https://github.com/hyparam/hightable/pull/315), [#319](https://github.com/hyparam/hightable/pull/319)).

## [0.20.4](https://github.com/hyparam/hightable/compare/v0.20.3...v0.20.4) - 2025-10-29

### Fixed

- fixed infinite rerender: ([#313](https://github.com/hyparam/hightable/pull/313)).

### Refactored

- upgrade development dependencies: ([#312](https://github.com/hyparam/hightable/pull/312)).

## [0.20.3](https://github.com/hyparam/hightable/compare/v0.20.2...v0.20.3) - 2025-10-24

### Added

- copy cell contents to clipboard on Ctrl+C / Cmd+C: ([#306](https://github.com/hyparam/hightable/pull/306)).

### Fixed

- fixed the scrollbar gutter: ([#308](https://github.com/hyparam/hightable/pull/308)).

### Refactored

- remove or replace wrong occurrences of .toBeDefined() in tests: ([#305](https://github.com/hyparam/hightable/pull/305)).
- upgrade development dependencies: ([#309](https://github.com/hyparam/hightable/pull/309)).

## [0.20.2](https://github.com/hyparam/hightable/compare/v0.20.1...v0.20.2) - 2025-10-16

### Changed

- fix the scrollbar gutter ([#300](https://github.com/hyparam/hightable/pull/300)).

### Refactored

- fix flaky tests: ([#301](https://github.com/hyparam/hightable/pull/301) - thanks @jpetitcolas).
- upgrade development dependencies: ([#303](https://github.com/hyparam/hightable/pull/303)).
- remove useEffect hooks: ([#303](https://github.com/hyparam/hightable/pull/303)).

## [0.20.1](https://github.com/hyparam/hightable/compare/v0.20.0...v0.20.1) - 2025-10-06

### Changed

- adjust columns width on component resize ([#288](https://github.com/hyparam/hightable/pull/288)).
- change the autosize behavior: don't extend measured width, shrink if needed, but not to less than 33% or 150px, respect the min width configuration ([#289](https://github.com/hyparam/hightable/pull/289) and [#290](https://github.com/hyparam/hightable/pull/290)).

### Refactored

- upgrade development dependencies: ([#291](https://github.com/hyparam/hightable/pull/291)).

## [0.20.0](https://github.com/hyparam/hightable/compare/v0.19.7...v0.20.0) - 2025-09-24

### Added

- explicitly set the table background and text color ([#281](https://github.com/hyparam/hightable/pull/281)).

### Changed

- more discrete color and size for the column resizer and resized column indicator ([#282](https://github.com/hyparam/hightable/pull/282)).

### Removed

- **Breaking** removed the `--light-border-color` CSS variable ([#283](https://github.com/hyparam/hightable/pull/283)).

### Fixed

- fix the column menu items background and border radius ([#281](https://github.com/hyparam/hightable/pull/281)).

### Refactored

- extract and sort the colors in CSS variables ([#283](https://github.com/hyparam/hightable/pull/283)).

## [0.19.7](https://github.com/hyparam/hightable/compare/v0.19.6...v0.19.7) - 2025-09-23

### Fixed

- fix CSS rules to be more precise ([#279](https://github.com/hyparam/hightable/pull/279)).

### Refactored

- upgrade development dependencies: ([#278](https://github.com/hyparam/hightable/pull/278)).

## [0.19.6](https://github.com/hyparam/hightable/compare/v0.19.5...v0.19.6) - 2025-09-23

### Fixed

- fix the color of the column menu items, to prevent them from being styled by the default button styles ([#276](https://github.com/hyparam/hightable/pull/276)).

### Refactored

- use CSS variables for all the colors: ([#276](https://github.com/hyparam/hightable/pull/276)).
- move the HighTable.module.css file to the src folder, for better visibility ([#276](https://github.com/hyparam/hightable/pull/276)).

## [0.19.5](https://github.com/hyparam/hightable/compare/v0.19.4...v0.19.5) - 2025-09-17

### Refactored

- update dev dependencies ([#274](https://github.com/hyparam/hightable/pull/274)).
- fix two incoherences with Promise.all and one type ([#274](https://github.com/hyparam/hightable/pull/274)).

## [0.19.4](https://github.com/hyparam/hightable/compare/v0.19.3...v0.19.4) - 2025-09-12

### Added

- export `Direction` type ([#272](http://github.com/hyparam/hightable/pull/272)).

## [0.19.3](https://github.com/hyparam/hightable/compare/v0.19.2...v0.19.3) - 2025-09-09

### Added

- add DataFrame field `exclusiveSort` to limit sorting to one column ([#267](https://github.com/hyparam/hightable/pull/267)).

## [0.19.2](https://github.com/hyparam/hightable/compare/v0.19.1...v0.19.2) - 2025-09-09

### Added

- extend support to React 19 ([#269](https://github.com/hyparam/hightable/pull/269)).

### Fixed

- ignore Alt, Shift and Meta keys when navigating the cells ([#264](https://github.com/hyparam/hightable/pull/264)).

### Refactored

- updated the README and comments ([#262](https://github.com/hyparam/hightable/pull/262)).

## [0.19.1](https://github.com/hyparam/hightable/compare/v0.19.0...v0.19.1) - 2025-08-22

### Added

- export `validateGetCellParams`, `validateGetRowNumberParams` and `validateOrderBy` helpers ([#260](https://github.com/hyparam/hightable/pull/260)).

### Fixed

- fix orderBy validation ([#259](https://github.com/hyparam/hightable/pull/259))

## [0.19.0](https://github.com/hyparam/hightable/compare/v0.18.5...v0.19.0) - 2025-08-22

### Changed

- **Breaking** the `header` field is replaced with `columnDescriptors` in `DataFrame` ([#256](https://github.com/hyparam/hightable/pull/256)). It is an array of objects with the following properties:
  - `name`: the column name.
  - `sortable`: whether the column is sortable (default: `false`).
  - `metadata`: optional metadata for the column, which can be used to store additional information about the column. Not used by HighTable.
- **Breaking** the `getCell`, `getRowNumber` and `fetch` methods must handle and validate (using `validateOrderBy` for example) the optional `orderBy` parameter ([#254](https://github.com/hyparam/hightable/pull/254)).
- **Breaking** make `eventTarget` and `fetch` fields optional in `DataFrame` ([#254](https://github.com/hyparam/hightable/pull/254)).
- **Breaking** remove the intermediary `UnsortableDataFrame` and `SortableDataFrame` types ([#254](https://github.com/hyparam/hightable/pull/254)).
- **Breaking** remove the `createStaticFetch` helper function, which is not needed anymore now that `fetch` is optional ([#254](https://github.com/hyparam/hightable/pull/254)).
- **Breaking** remove the `sortable` field in `columnConfiguration` prop ([#256](https://github.com/hyparam/hightable/pull/256)).
- **Breaking** make `DataFrame` generic to pass the optional `.metadata` and `.columnDescriptors[].metadata` types ([#256](https://github.com/hyparam/hightable/pull/256)).
- validate the row and column in the fetch method within sortableDataFrame ([#253](https://github.com/hyparam/hightable/pull/253)).

### Refactored

- remove the unused `cloneEventTarget` function. It was not exported.
- updated dev dependencies ([#257](https://github.com/hyparam/hightable/pull/257)).

## [0.18.5](https://github.com/hyparam/hightable/compare/v0.18.4...v0.18.5) - 2025-08-18

### Fixed

- preserve the metadata when sorting or filtering a dataframe ([#251](https://github.com/hyparam/hightable/pull/251)).

## [0.18.4](https://github.com/hyparam/hightable/compare/v0.18.3...v0.18.4) - 2025-08-15

### Added

- hide columns (and show hidden columns) from the column header menu ([#244](https://github.com/hyparam/hightable/pull/244)).
- new option prop, `renderCellContent`, to customize cells rendering ([#236](https://github.com/hyparam/hightable/pull/236)).
- new option prop, `onColumnsVisibilityChange`, to get the list of hidden columns ([#246](https://github.com/hyparam/hightable/pull/246)).

### Fixed

- fix row height when the text includes emojis ([#237](https://github.com/hyparam/hightable/pull/237)).
- fix columns width when a column only contains undefined values ([#245](https://github.com/hyparam/hightable/pull/245)).
- only resize the columns on left click ([#247](https://github.com/hyparam/hightable/pull/247)).

### Refactored

- updated dev dependencies ([#248](https://github.com/hyparam/hightable/pull/248)).

## [0.18.3](https://github.com/hyparam/hightable/compare/v0.18.2...v0.18.3) - 2025-08-06

### Added

- minWidth to the column configuration option to override global min width ([#238](https://github.com/hyparam/hightable/pull/238)).

## [0.18.2](https://github.com/hyparam/hightable/compare/v0.18.1...v0.18.2) - 2025-08-01

### Added

- export dataframe helper functions like `checkSignal`, `validateColumn` or `validateRow` ([#233](https://github.com/hyparam/hightable/pull/233)).

## [0.18.1](https://github.com/hyparam/hightable/compare/v0.18.0...v0.18.1) - 2025-07-29

### Added

- export type `ResolvedValue` ([#225](https://github.com/hyparam/hightable/pull/225)).

## [0.18.0](https://github.com/hyparam/hightable/compare/v0.17.2...v0.18.0) - 2025-07-29

### Changed

- **Breaking** change the DataFrame interface.
  - the previous Dataframe interface is now called `DataFrameV1`, and a conversion function `convertV1ToDataFrame` is provided to convert it to the new format.
  - the functions `rowCache` and `getGetColumn` are deprecated and removed.
  - the functions `asyncRows`, `awaitRow`, `awaitRows`, `resolvableRow`, `resolvablePromise`, `wrapPromise`, and `wrapResolved`, and the types `ResolvablePromise`, `AsyncRow`, `Cells`, `PartialRow`, `ResolvableRow`, `Row` are deprecated, but still provided.
  - the DataFrame interface is now the union of `UnsortableDataFrame` and `SortableDataFrame`. It is recommended to use them to be explicit about the support of sorting.
- the DataFrame interface now relies on the `fetch` method that must be called to fill the cache, and the `getCell` and `getRowNumber` methods that give synchronous access to the cached data. It means that the new DataFrame is not row oriented anymore and handle the data at the cell level. It also provides an `eventTarget` field to listen to the `resolve` events sent when the data is fetched. Also note that the `fetch` method accepts an `AbortSignal` option to abort a fetch request. See the [README](README.md) for more details.
- new functions and types are provided:
  - `filterDataFrame` to derive a new DataFrame using a filter function.
  - `createEventTarget` to create an event target that can be used in a DataFrame.
  - `DataFrameEvents`, `CustomEventTarget` and `TypedCustomEvent` to handle custom events in a DataFrame.

### Fixed

- fix an error when clicking "select all" on an empty dataframe ([#216](https://github.com/hyparam/hightable/pull/216)).
- ensure the row numbers column has always a minimum width, even for an empty dataframe ([#216](https://github.com/hyparam/hightable/pull/216)).

## [0.17.2](https://github.com/hyparam/hightable/compare/v0.17.1...v0.17.2) - 2025-06-17

### Added

- Added sortable option to the columnConfiguration property
  - Currently disable only, sortable: true will be ignored

## [0.17.1](https://github.com/hyparam/hightable/compare/v0.17.0...v0.17.1) - 2025-06-13

### Added

- Added external facing columnConfiguration property to HighTable component
  - Format is { [columnName]: { ...configuration } }
  - Currently only supports one property, headerComponent which allows overriding the header cell with a custom React component

## [0.17.0](https://github.com/hyparam/hightable/compare/v0.16.0...v0.17.0) - 2025-06-04

### Changed

- **Breaking** change the algorithm to compute the column widths ([#197](https://github.com/hyparam/hightable/pull/197), [#201](https://github.com/hyparam/hightable/pull/201)):
  - no column can be narrower than minWidth (hardcoded to 50px).
  - a column resized manually (with mouse or keyboard), including autoresize, is highlighted visually with a blue dot. It's called a "fixed width".
  - the fixed widths are saved in local storage, and restored when the table is mounted.
  - an autoresized column can be unconstrained by the same action as autoresizing (double-click or space or enter on the resizer).
  - when resizing a column, the other columns are let unchanged.
  - on mount or table resize, the free columns are resized to fill the available space, shrinking or growing to fit the table width.
  - the localstorage key now has the syntax `${cacheKey}:column:states` instead of `${cacheKey}:columns:widths`, to invalidate the existing entries, since the format has changed.
- **Breaking** change the role (hence the CSS selector) of the resizer from `separator` to `spinbutton` ([#202](https://github.com/hyparam/hightable/pull/202)).
- add support for ArrowUp, ArrowDown, PageUp, PageDown and Home in the column resizer ([#202](https://github.com/hyparam/hightable/pull/202)).
- use border-box sizing to compute the width of the columns ([#196](https://github.com/hyparam/hightable/pull/196)).

### Refactored

- updated dev dependencies ([#204](https://github.com/hyparam/hightable/pull/204)).

## [0.16.0](https://github.com/hyparam/hightable/compare/v0.15.6...v0.16.0) - 2025-05-23

### Added

- support for selecting rows with the keyboard: Space/Enter on checkboxes, Escape to unselect, Ctrl/Meta+a to select/deselect all, select a row with Shift+Space on any cell of the row ([#183](https://github.com/hyparam/hightable/pull/183), [#184](https://github.com/hyparam/hightable/pull/184), [#187](https://github.com/hyparam/hightable/pull/187)).

### Changed

- **Breaking** when the selection is expanded (shift+click), the new anchor is the clicked cell (before, anchor was unchanged) ([#186](https://github.com/hyparam/hightable/pull/186)).
- **Breaking** when the selection is expanded (shift+click), if the clicked cell is the anchor, the row is toggled (before, it was a no-op) ([#186](https://github.com/hyparam/hightable/pull/186)).
- **Breaking** remove the ability to navigate with Space / Shift+Space, which was a shortcut for PageUp/PageDown ([#176](https://github.com/hyparam/hightable/pull/176)).
- Faster resolvablePromise by skipping wrapPromise ([#175](https://github.com/hyparam/hightable/pull/175)).
- Restore color to the checkboxes when actionable ([#189](https://github.com/hyparam/hightable/pull/189)).
- Change sort arrows style and an icon (two arrows) when unsorted ([#193](https://github.com/hyparam/hightable/pull/193)).

### Fixed

- fix an issue when focusing a header cell after focusing the table ([#191](https://github.com/hyparam/hightable/pull/191)).

### Refactored

- add `asyncRows` tests ([fb4438b](https://github.com/hyparam/hightable/commit/fb4438b8385ae61ff5bd9c5c8ee24b5342c79b4b)).
- exclude stories from tests ([fb4438b](https://github.com/hyparam/hightable/commit/fb4438b8385ae61ff5bd9c5c8ee24b5342c79b4b)).
- updated dev dependencies ([#192](https://github.com/hyparam/hightable/pull/192), [#194](https://github.com/hyparam/hightable/pull/194)).
- removed unneeded variable `enableInteractions` ([#177](https://github.com/hyparam/hightable/pull/177)).
- use a context for data, orderBy and selection ([#178](https://github.com/hyparam/hightable/pull/178), [#179](https://github.com/hyparam/hightable/pull/179), [#180](https://github.com/hyparam/hightable/pull/180), [#182](https://github.com/hyparam/hightable/pull/182)).
- add the optional attribute `aria-rowindex` to the cells ([#185](https://github.com/hyparam/hightable/pull/185)).

## [0.15.6](https://github.com/hyparam/hightable/compare/v0.15.5...v0.15.6) - 2025-05-16

### Added

- added a top border element to HighTable ([#170](https://github.com/hyparam/hightable/pull/170)).

### Fixed

- clicking a cell when the table scroller is focused selects the cell ([#169](https://github.com/hyparam/hightable/pull/169)).

### Refactored

- updated dev dependencies ([#172](https://github.com/hyparam/hightable/pull/172)).

## [0.15.5](https://github.com/hyparam/hightable/compare/v0.15.4...v0.15.5) - 2025-05-14

### Fixed

- avoid shifting the contents when hovering the table ([#162](https://github.com/hyparam/hightable/pull/162)).

### Changed

- focus the first cell when the table is mounted, instead of the table ([#163](https://github.com/hyparam/hightable/pull/163)).
- limit column autoresize to 40rem (640px) instead of 2000px ([#161](https://github.com/hyparam/hightable/pull/161)).
- remove red row error ([8c1585b](https://github.com/hyparam/hightable/commit/8c1585b0ad0e56b6abc8aeddb1a2924b75beb09d)).

### Refactored

- updated dev dependencies ([#164](https://github.com/hyparam/hightable/pull/164)).

## [0.15.4](https://github.com/hyparam/hightable/compare/v0.15.3...v0.15.4) - 2025-05-10

### Added

- add `onKeyDownCell` prop to `HighTable` to react to key press on a table cell. For accessibility, it should be passed if onDoubleClickCell is passed ([#140](https://github.com/hyparam/hightable/pull/140)).
- support navigation with the keyboard ([#140](https://github.com/hyparam/hightable/pull/140), [#152](https://github.com/hyparam/hightable/pull/152), [#153](https://github.com/hyparam/hightable/pull/153)).

### Refactored

- updated dev dependencies ([#155](https://github.com/hyparam/hightable/pull/155)).

## [0.15.3](https://github.com/hyparam/hightable/compare/v0.15.2...v0.15.3) - 2025-05-06

### Added

- handle unknown number of rows (iceberg, filtered data) ([#149](https://github.com/hyparam/hightable/pull/149)).

### Refactored

- updated dev dependencies ([#148](https://github.com/hyparam/hightable/pull/148)).
- fix a storybook story by caching the rows ([#145](https://github.com/hyparam/hightable/pull/145)).

## [0.15.2](https://github.com/hyparam/hightable/compare/v0.15.1...v0.15.2) - 2025-04-29

### Added

- export `getGetColumn` ([#134](https://github.com/hyparam/hightable/pull/134)).
- add a caption for the table and related aria attributes ([#135](https://github.com/hyparam/hightable/pull/135)).
- add `aria-colindex` to the cells ([#139](https://github.com/hyparam/hightable/pull/139)).

### Changed

- focus the table when entering the page, allowing to scroll with the keyboard, and highlight it ([#135](https://github.com/hyparam/hightable/pull/135)).
- use custom `data-...` attributes instead of misuing `aria-posinset` and `aria-setsize` to give the sort order in header columns ([#139](https://github.com/hyparam/hightable/pull/139)).

### Fixed

- increase contrast of the row indexes ([#138](https://github.com/hyparam/hightable/pull/138)).
- switch the up and down arrows in the header cells when sorting ([#135](https://github.com/hyparam/hightable/pull/135)).

### Refactored

- updated dev dependencies ([#141](https://github.com/hyparam/hightable/pull/141)).

## [0.15.1](https://github.com/hyparam/hightable/compare/v0.15.0...v0.15.1) - 2025-04-24

### Added

- show a placeholder (blurred number) while row index is loading ([#131](https://github.com/hyparam/hightable/pull/131)).

### Changed

- get row index as soon as possible when unsorted ([#130](https://github.com/hyparam/hightable/pull/130)).

### Refactored

- updated dev dependencies ([#132](https://github.com/hyparam/hightable/pull/132)).

## [0.15.0](https://github.com/hyparam/hightable/compare/v0.14.2...v0.15.0) - 2025-04-16

### Changed

- set `aria-sort="none"` on header cells only if the data is sortable. Otherwise the attribute is not present ([#125](https://github.com/hyparam/hightable/pull/125)).

### Removed

- **Breaking** removed `aria-disabled` on header cells. Use `aria-sort` existence instead to check if sorting is enabled ([#125](https://github.com/hyparam/hightable/pull/125)).

### Fixed

- added right padding to the header cells (in the `.styled` class) when sorting is enabled to avoid overlap with the sort caret ([#122](https://github.com/hyparam/hightable/pull/122), [#125](https://github.com/hyparam/hightable/pull/125)).
- don't save to localstorage if cacheKey is not provided ([#123](https://github.com/hyparam/hightable/pull/123)).
- don't autoresize the columns when data has changed, if localstorage contains values ([#123](https://github.com/hyparam/hightable/pull/123)).
- added 1 pixel to measured column width to avoid rounding errors ([#125](https://github.com/hyparam/hightable/pull/125)).

### Refactored

- updated dev dependencies ([#120](https://github.com/hyparam/hightable/pull/120)).
- fixed an import in a storybook file. The bug did not affect the library ([#121](https://github.com/hyparam/hightable/pull/121)).

## [0.14.2](https://github.com/hyparam/hightable/compare/v0.14.1...v0.14.2) - 2025-04-14

### Added

- add `columnClassNames` prop (array of class names, indexed by column index in `data.header`) to `HighTable` to style the columns ([#112](https://github.com/hyparam/hightable/pull/112)).
- provide the sort order with `aria-posinset` and `aria-setsize` to style the column header cells ([#111](https://github.com/hyparam/hightable/pull/111) and [#114](https://github.com/hyparam/hightable/pull/114)).

### Fixed

- show an empty cell when it resolves to undefined, instead of an infinitely loading placeholder ([#110](https://github.com/hyparam/hightable/pull/110)).

### Refactor

- move component tests to src ([#109](https://github.com/hyparam/hightable/pull/109)).

## [0.14.1](https://github.com/hyparam/hightable/compare/v0.14.0...v0.14.1) - 2025-04-07

### Added

- Export `wrapResolved` ([#105](https://github.com/hyparam/hightable/pull/105)).

### Fixed

- Fix CSS for placeholders animation ([#106](https://github.com/hyparam/hightable/pull/106)).

## [0.14.0](https://github.com/hyparam/hightable/compare/v0.13.5...v0.14.0) - 2025-04-04

### Changed

- Add `wrapResolved` as a faster version of `wrapPromise` ([#103](https://github.com/hyparam/hightable/pull/103)).
- **Breaking** `wrapPromise<T>` now ONLY accepts an argument of type `Promise<T>`, and no longer accepts an argument of type `T`. In those cases use `wrapResolved<T>`

## [0.13.5](https://github.com/hyparam/hightable/compare/v0.13.4...v0.13.5) - 2025-04-03

### Fixed

- fix scroll jitter ([#100](https://github.com/hyparam/hightable/pull/100)).

## [0.13.4](https://github.com/hyparam/hightable/compare/v0.13.3...v0.13.4) - 2025-04-02

### Fixed

- fix column widths ([#95](https://github.com/hyparam/hightable/pull/95), [#96](https://github.com/hyparam/hightable/pull/96)).

## [0.13.3](https://github.com/hyparam/hightable/compare/v0.13.2...v0.13.3) - 2025-04-01

### Refactor

- update development dependencies ([#89](https://github.com/hyparam/hightable/pull/89)).

## [0.13.2](https://github.com/hyparam/hightable/compare/v0.13.1...v0.13.2) - 2025-03-27

### Refactor

- fix the return type of `stringify` ([#85](https://github.com/hyparam/hightable/pull/85)).
- update development dependencies ([#86](https://github.com/hyparam/hightable/pull/86)).

## [0.13.1](https://github.com/hyparam/hightable/compare/v0.13.0...v0.13.1) - 2025-03-27

### Changed

- Export the default function to stringify cell values as `stringify`, and align the code with the same function in `hyperparam`. The only change is that arrays are now indented ([#82](https://github.com/hyparam/hightable/pull/82)).

### Fixed

- Fix the CSS stacking order to prevent cell placeholders to float above the row headers ([#81](https://github.com/hyparam/hightable/pull/81)).

### Refactored

- Use the variable name `styles` instead of `classes` for CSS module classes ([#83](https://github.com/hyparam/hightable/pull/83)).

## [0.13.0](https://github.com/hyparam/hightable/compare/v0.12.1...v0.13.0) - 2025-03-21

### Added

- add a `className` prop to the `HighTable` component ([#74](https://github.com/hyparam/hightable/pull/74)).
- add a `styled` prop to the `HighTable` component to apply or disable the default theme ([#75](https://github.com/hyparam/hightable/pull/75)).

### Changed

- **Breaking** the `OrderBy` type is now an array of column sorts: `{ column: string; direction: 'ascending' | 'descending' }[]`. If empty, the data is not sorted. If it contains one element, the data is sorted along the column, in the specified direction. If it contains multiple elements, the first column is used to sort, then the second one is used to handle the ties, and so on ([#67](https://github.com/hyparam/hightable/pull/67), [#68](https://github.com/hyparam/hightable/pull/68), [#69](https://github.com/hyparam/hightable/pull/69)).
- **Breaking** the `orderBy` property in `rows` method uses the new `OrderBy` type. If `data.sortable` is `true`, the data frame is able to sort along the columns as described above.
- **Breaking** the `orderBy` property in `HighTable` and `TableHeader` uses the new `OrderBy` type.
- **Breaking** the `onOrderByChange` property in `HighTable` and `TableHeader` that takes the new `OrderBy` argument.
- **Breaking** click on a column header has a new behavior: it sorts along that column first, and uses the other columns of `orderBy` as secondary sorts. If the column was already the first column, it follows the cycle ascending -> descending -> no sort ([#69](https://github.com/hyparam/hightable/pull/69)).
- **Breaking** the top left cell of the table now handles the checkbox to select all the rows (and the absolutely positioned div is removed). It can affect overriden CSS ([#70](https://github.com/hyparam/hightable/pull/70)).
- **Breaking** all CSS classes have been removed. Use the `className` prop to apply custom styles ([#75](https://github.com/hyparam/hightable/pull/75)).
- changed the format of the keys in local storage when storing the column widths. Each column now has its own key ([#71](https://github.com/hyparam/hightable/pull/71)).
- split the CSS styles into mandatory functional styles and optional theme styles ([#75](https://github.com/hyparam/hightable/pull/75)).
- the selection checkboxes are now disabled while the data is being loaded ([#77](https://github.com/hyparam/hightable/pull/77)).
- sortableDataFrame now supports sorting along multiple columns ([#69](https://github.com/hyparam/hightable/pull/69)).

### Refactored

- Use small components instead of defining all the elements in HighTable and TableHeader ([#70](https://github.com/hyparam/hightable/pull/70)).
- Structure the code files in directories: components/, hooks/, utils/ and helpers/ ([#70](https://github.com/hyparam/hightable/pull/70)).
- Specify CSS as a CSS module ([#74](https://github.com/hyparam/hightable/pull/74), [#75](https://github.com/hyparam/hightable/pull/75)).

## [0.12.1](https://github.com/hyparam/hightable/compare/v0.12.0...v0.12.1) - 2025-03-07

### Refactored

- upgraded dependencies.

## [0.12.0](https://github.com/hyparam/hightable/compare/v0.11.0...v0.12.0) - 2025-03-07

### Refactored

- Build the library with Vite instead of Rollup ([#63](https://github.com/hyparam/hightable/pull/63)).
- Harmonize the ESLint and Typescript rules with the other hyparam projects ([#63](https://github.com/hyparam/hightable/pull/63)).

## [0.11.0](https://github.com/hyparam/hightable/compare/v0.10.0...v0.11.0) - 2025-02-27

### Added

- expose the `stringify` function as a prop of the `HighTable` component ([ef4a642](https://github.com/hyparam/hightable/commit/ef4a642c0c8dc5478abb675e200e2bab2c274518)).
- export the new function `getGetColumn()` and let the data frame provide its own `getColumn()` function. `getColumn({column, start, end}): any[]` let fetch the data of an individual column ([#53](https://github.com/hyparam/hightable/pull/53)).

### Changed

- **Breaking** the `rows` method in a data frame now takes a single object argument with the following properties: `start`, `end` and `orderBy` ([#52](https://github.com/hyparam/hightable/pull/52)).
- **Breaking** the rows selection now refers to the position in the data source, not in the table. It is therefore independent of the sort ([#34](https://github.com/hyparam/hightable/pull/34)).
- **Breaking** the minimal supported React version is now 18.3.1 ([ef4a642](https://github.com/hyparam/hightable/commit/ef4a642c0c8dc5478abb675e200e2bab2c274518)).
- **Breaking** for accessibility, the top-left cell of the table is now a `<td>` element instead of a `<th>` element ([#57](https://github.com/hyparam/hightable/pull/57)).
- changed colors in CSS.
- for accessibility, increased the font size of the cell numbers and made it proportional to the default user font size ([#57](https://github.com/hyparam/hightable/pull/57) and [#59](https://github.com/hyparam/hightable/pull/59)).

### Refactored

- updated the link to the demo in the README ([ef4a642](https://github.com/hyparam/hightable/commit/ef4a642c0c8dc5478abb675e200e2bab2c274518)).
- removed call to `act()` in tests where not required ([#54](https://github.com/hyparam/hightable/pull/54)).
- small code reorganization ([#56](https://github.com/hyparam/hightable/pull/56)).
- simplify the internal state management ([#55](https://github.com/hyparam/hightable/pull/55) and [#58](https://github.com/hyparam/hightable/pull/58)).

## [0.10.0](https://github.com/hyparam/hightable/compare/v0.9.2...v0.10.0) - 2025-02-11

### Changed

- **Breaking** only support `AsyncRow[]` (instead of `AsyncRow[] | Promise<Row[]>`) as the return type of the `rows` function in the `DataFrame` object ([#36](https://github.com/hyparam/hightable/pull/36)).
- **Breaking** changed the format of rows. Instead of `Record<string, any>` with an optional `__index__` field, rows are now `Row` objects with a mandatory index: `{index: number, cells: Record<string, any>[]}` ([#36](https://github.com/hyparam/hightable/pull/36)).
- **Breaking** revert to being compatible only with React 18 ([#47](https://github.com/hyparam/hightable/pull/47)).

### Fixed

- use the minimal supported React version (18.2.0) to build the package ([#41](https://github.com/hyparam/hightable/pull/41)).

### Refactored

- use `Promise.all` to fail fast when fetching the cells ([#37](https://github.com/hyparam/hightable/pull/37)).
- upgrade the dev dependencies ([#42](https://github.com/hyparam/hightable/pull/42)).
- move the code related to promises and rows to separate files ([#43](https://github.com/hyparam/hightable/pull/43) and [#44](https://github.com/hyparam/hightable/pull/44)).
- decouple scroll and data fetch ([#45](https://github.com/hyparam/hightable/pull/45)).
- use useCallback to avoid creating functions on each rendering ([#46](https://github.com/hyparam/hightable/pull/46)).
- add this CHANGELOG file ([#39](https://github.com/hyparam/hightable/pull/39) and [#40](https://github.com/hyparam/hightable/pull/40)).
- add doc about how to create a dataframe in the README ([#48](https://github.com/hyparam/hightable/pull/48)).

## [0.9.2](https://github.com/hyparam/hightable/compare/v0.9.1...v0.9.2) - 2025-01-30 [DEPRECATED]

The package was [deprecated](https://www.npmjs.com/package/hightable/v/0.9.2) because it was published with React 19 instead of the minimal one (18.2.0).

### Changed

- add compatibility with React > 18 ([#35](https://github.com/hyparam/hightable/pull/35)).

## [0.9.1](https://github.com/hyparam/hightable/compare/v0.9.0...v0.9.1) - 2025-01-22

### Added

- add `orderBy`, `onOrderByChange`, `selection` and `onSelectionChange` props to `HighTable` ([#22](https://github.com/hyparam/hightable/pull/22)). Their behavior is described in the README:

  ```typescript
  orderBy?: OrderBy; // order by column (if defined, the component order is controlled by the parent)
  onOrderByChange?: (orderBy: OrderBy) => void; // orderBy change handler
  selection?: Selection; // selection state (if defined, the component selection is controlled by the parent)
  onSelectionChange?: (selection: Selection) => void; // selection change handler
  ```

### Changed

- **Breaking** in CSS: use the new `show-corner-selection` class, and allow showing selected rows without the parent `selectable` class ([#22](https://github.com/hyparam/hightable/pull/22)).
- **Breaking** the `orderBy` prop in `TableHeader` is now an `OrderBy` object, not a string ([#22](https://github.com/hyparam/hightable/pull/22)).
- **Breaking** the `setOrderBy` prop in `TableHeader` is renamed to `onOrderByChange` and takes an `OrderBy` argument instead of a string ([#22](https://github.com/hyparam/hightable/pull/22)).
- **Breaking** the `Selection` type is now an object containing the ranges of selected rows and the optional anchor. The previous definition of `Selection` is now called `Ranges` ([#22](https://github.com/hyparam/hightable/pull/22)).
- export `State`, `Action` and `reducer` ([#22](https://github.com/hyparam/hightable/pull/22)) (we should revert as they are internal-only!).

### Removed

- **Breaking** the `tableControl` and `selectable` props have been removed from `HighTable` ([#22](https://github.com/hyparam/hightable/pull/22)). Use the new props instead to control the selection and order of the table.

### Fixed

- add missing React Hooks dependencies to `useCallback` and `useEffect` hooks ([#28](https://github.com/hyparam/hightable/pull/28)).

### Refactored

- use `useCallback` for props of `TableHeader` to avoid unnecessary re-renders ([#28](https://github.com/hyparam/hightable/pull/28)).
- check React Hooks dependencies with eslint ([#28](https://github.com/hyparam/hightable/pull/28)).
- add roles to the HTML elements ([#28](https://github.com/hyparam/hightable/pull/28)) to help screen readers and to test with testing-library based on semantics as recommended.

## [0.9.0](https://github.com/hyparam/hightable/compare/v0.8.1...v0.9.0) - 2025-01-15

### Changed

- **Breaking** the rows selection refers to the position in the table, not in the data source. It is therefore dependent on the sort ([#34](https://github.com/hyparam/hightable/pull/34)).
- show the "data index", ie the position of the row in the data source, in case of error in the title attribute. If not available, don't show any row number ([#34](https://github.com/hyparam/hightable/pull/34)).

### Fixed

- fix an off-by-one error for the rows selection ([#34](https://github.com/hyparam/hightable/pull/34)).

### Refactored

- change data and table index variable names for clarity ([#34](https://github.com/hyparam/hightable/pull/34)).
- add comments and doc strings ([#34](https://github.com/hyparam/hightable/pull/34)).

## <= 0.8.1

The changelog is not available for versions below 0.9.0.

Refer to https://keepachangelog.com/ when updating this file. Valid sections names: Added, Changed, Deprecated, Removed, Fixed, Security + we add Refactored (which should not change functionality, and is aimed at developers).
