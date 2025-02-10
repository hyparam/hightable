# CHANGELOG

## [Unreleased](https://github.com/hyparam/hightable/compare/v0.9.1...HEAD)

### Changed

- **Breaking** only support `AsyncRow[]` (instead of `AsyncRow[] | Promise<Row[]>`) as the return type of the `rows` function in the `DataFrame` object ([#36](https://github.com/hyparam/hightable/pull/36)).
- **Breaking** changed the format of rows. Instead of `Record<string, any>` with an optional `__index__` field, rows are now `Row` objects with a mandatory index: `{index: number, cells: Record<string, any>[]}` ([#36](https://github.com/hyparam/hightable/pull/36)).

### Fixed

- build the package with the lowest compatible React version: React 18.2.0. Note that HighTable is compatible with higher versions, like ^19.

### Refactored

- use `Promise.all` to fail fast when fetching the cells ([#37](https://github.com/hyparam/hightable/pull/37)).

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
