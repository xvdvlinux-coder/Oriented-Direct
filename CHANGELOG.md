# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-08-26

### Added

- **High-Precision Source Maps (Base64-VLQ)**:
  - Native Base64-VLQ coordinate tracking with running differential deltas in `src/sourcemap/`.
  - Full support for `sourcesContent` embedding to map DevTools breakpoints, stack traces, and console logs directly to `.osp` source lines in real-time.
  - Enabled by default in `ospc dev` mode and configurable via `-s, --sourcemap [inline|external]`.
- **Built-in Local Development Server**:
  - Zero-dependency HTTP development server (`ospc dev`, `ospc serve`) running at `http://localhost:3000` with network address display.
  - Automatic file system watcher with live re-compilation and hot reload upon file changes.
  - Automatic static asset routing, stylesheet compilation, and HTML template distribution.
- **Multi-Module Bundler**:
  - Native multi-file dependency resolver and bundler engine in `src/bundler/`.
  - Support for modular `.osp` file imports (`import { Component } from "./components/Component.osp"`).
  - Bundles entire multi-module source trees into single, monolithic JavaScript output files with zero external bundler dependencies.
- **Project Configuration**:
  - Project configuration support through `package.json` (`"osp"` configuration object) and standalone `osp.json` configuration files.
  - Configurable entry points, output directories (`public/` or `dist/`), bundle modes, server ports, and asset copying rules.
- **Direct DOM and Browser Directives**:
  - DOM query directives: `@find(selector, parent?)`, `@all(selector, parent?)`, and `@id(name)`.
  - Event listener directives: `@on(el, evt, fn)`, `@off(el, evt, fn)`, and `@emit(el, evt, detail)`.
  - Element creation and manipulation: `@create(tag, attrs?, text?)`, `@html(el, content?)`, `@text(el, content?)`, `@css(el, prop, val?)`, `@attr(el, name, val?)`, and `@val(el, val?)`.
  - Direct browser references: `@doc` (`document`) and `@win` (`window`).
  - Direct logging directives: `@log(...)`, `@info(...)`, `@warn(...)`, and `@error(...)`, leaving common identifier names (`info`, `log`, `warn`, `error`, `data`) free for user variable bindings.
- **Sealed Structs**:
  - Support for `struct` definitions with automatic constructor generation and runtime object sealing via `Object.seal`.
- **Numeric Range Loops & C-Style Loops**:
  - Expressive range-based iteration: `for (val i in 0..100 step 10)`.
  - Support for 3-part C-style iteration: `for (mut i = 0; i < len; i += 1)`.
  - Support for iterable and collection iteration: `for (val item in list)`.
- **Visual Studio Code Extension**:
  - Extension package (`vscode-extension/`) providing full syntax highlighting, language grammars, code snippets, and `.osp` file icon associations.

---

## [1.0.0] - 2026-07-01

### Added

- **Core Transpiler**:
  - Lexical scanner, recursive descent parser, and Abstract Syntax Tree code generator transpiling `.osp` source files into clean ECMAScript.
- **Variable Declarations & Immutability**:
  - Immutable variable bindings via `val` (transpiles to `const`).
  - Mutable variable bindings via `mut` (transpiles to `let`).
- **Strict Equality & Logical Operators**:
  - Strict equality operators: `==` and `is` transpiling to `===`.
  - Strict inequality operators: `!=` and `is not` transpiling to `!==`.
  - Logical operators: `and` (`&&`), `or` (`||`), and `not` (`!`).
  - Nullish coalescing (`??`) and optional chaining (`?.`).
- **Command Line Interface (CLI)**:
  - `ospc build`: Transpile `.osp` source files to target JavaScript files.
  - `ospc run`: Immediate compilation and execution in Node.js.
  - CLI help and version reporting commands (`ospc --help`, `ospc --version`).

---

[1.4.0]: https://github.com/xvdvlinux-coder/Oriented-Direct/compare/v1.0.0...v1.4.0
[1.0.0]: https://github.com/xvdvlinux-coder/Oriented-Direct/releases/tag/v1.0.0
