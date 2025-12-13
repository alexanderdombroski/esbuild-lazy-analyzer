# Change Log

<!-- Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file. -->

## Table of Contents

- [1.4](#140---2025-12-13) - Eager Filter
- [1.3](#130---2025-12-07) - Graph Modal
- [1.2](#120---2025-12-02) - Improved Tooltips
- [1.1](#110---2025-11-21) - Graph Improvements
- [1.0](#101---2025-11-11) - Initial Release

## [1.4.0] - 2025-12-13

### Added

- Toggleable button to hide lazy imports

## [1.3.0] - 2025-12-07

### Added

- Added modal to look closer at imports of specific files
- Added button to make it easier to remove nodes of choice

### Fixed

- Improved build minification
- Graph nodes use consistent size

## [1.2.0] - 2025-12-02

### Added

- List of bundled files on chunk graph tooltips
- Improved tooltips of enabled nodes list

### Fixed

- Ensure tooltip doesn't appear off screen

## [1.1.0] - 2025-11-21

### Added

- Improved tooltips on import graph
- Ability to remove nodes from graph

### Fixed

- When regenerating the file, it will remember the last used tab

## [1.0.1] - 2025-11-11

### Added

- Entry points appear blue on import graph

### Fixed

- d3 chart errors

## [1.0.0] - 2025-11-09

### Added

- JavaScript cli to analyze esbuild metafiles
- Specify with --metafile where to read esbuild metafile
- Specify with --outmeta where to put processed json data
- Specify with --outreport where to put html visuals
