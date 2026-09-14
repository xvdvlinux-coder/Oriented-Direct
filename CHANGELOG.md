# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-09-14 - ClandleLoop

### Added

- **Compile-Time Gated Safety Architecture (MathL Integration)**:
  - Integration of the 30 formal mathematical safety rules developed during the 30-day MathL research campaign into the production compiler pipeline.
  - Zero runtime debt: compile-time verification grounded in Galois connections, abstract domain lattices, and fixed-point iteration, preserving pristine JavaScript emission with zero runtime overhead.
  - Integrated `SafetyAnalyzer` in `src/safety/safety_analyzer.js` executed automatically during `transpile`, `compile`, and multi-module `bundle` passes.
- **Abstract Domain Lattices & Formal Environments (`src/safety/abstract_domain.js`)**:
  - `NullState` and `NullLattice`: 4-point lattice (Bottom, NonNull, Nullable, Top) governing strict null dereference verification and meet refinement.
  - `TypeShape`: Structural shape descriptor tracking function arity, field sets, sealed struct flags, and nullability states.
  - `AbstractEnvironment`: Lexical scope tracking with parent chains, immutability flags (`val` vs `mut`), initialization tracking for TDZ safety, and closure escape volatility tracking.
- **Rust/Clang-Style Terminal Diagnostics (`src/safety/diagnostic_formatter.js`)**:
  - High-precision terminal diagnostics with line/column gutters, multi-column caret underlines (`^^^^`), secondary annotations, actionable compiler hints, and source map position resolution.
  - Structured `SafetyError` class representing compile-time safety violations with clean, human-readable terminal output and no cluttering stack traces.
  - Strictly verified zero emojis across all compiler diagnostics and reports.
- **The 30 Formal Mathematical Safety Invariants**:
  - Rule I: Strict Member Access Invariant (Null dereference guards).
  - Rule II: Flow Guard Refinement (`unless (x) return;`, `if (!x) return;`, and `if (x == null) return;`).
  - Rule III: Direct Call Arity Invariant (Compile-time arity verification).
  - Rule IV: Match Expression Exhaustiveness.
  - Rule V: Fallible Operations & Exception Boundaries.
  - Rule VI: Closure Escape Analysis for Mutable State (`mut` variable volatility tracking).
  - Rule VII: Higher-Order Functor Collection Invariant.
  - Rule VIII: Aliased State Mutation Safety & Immutability (`val` re-assignment rejection and infinite loop termination).
  - Rule IX: Interprocedural Call Summaries.
  - Rule X: Custom Event Contract Invariance.
  - Rule XI: Module Dependency Directed Acyclic Graph.
  - Rule XII: DOM Element Tree Connection Lifecycle (`@find`, `@all`, `@id`, `@create`, `@doc`, `@win`).
  - Rule XIII: Sealed Struct Invariance & Prototype Pollution Rejection (`__proto__` and `prototype` compile-time blocking).
  - Rule XIV: Async Generator & Microtask Queue Order.
  - Rule XV: Transitive Star-Export Linking Resolution.
  - Rule XVI: TypedArray Detachment & Wasm Bounds.
  - Rule XVII: Reactive DOM Mutation Cascade Guards.
  - Rule XVIII: Reactive Signal Acyclic Digraph.
  - Rule XIX: Cross-Thread Structured Clone Worker FFI.
  - Rule XX: Cross-Engine Conformance & Complexity.
  - Rule XXI: Explicit Resource Management (RAII disposable stacks).
  - Rule XXII: Wasm / C-ABI Buffer Marshalling & Alignment.
  - Rule XXIII: Dynamic Feature Detection & Gating.
  - Rule XXIV: Deep Recursive Freeze Immutability.
  - Rule XXV: Multi-File Incremental Analysis Cache.
  - Rule XXVI: Sandboxed Realm Boundary Security.
  - Rule XXVII: Dynamic Pattern Destructuring Coercibility.
  - Rule XXVIII: Strict Lexical Scope TDZ Dominance.
  - Rule XXIX: Error Subtyping Hierarchy & Cause Chains.
  - Rule XXX: Compiler CLI Flag Gating Specification.
- **Comprehensive Master Error Catalog (`src/safety/error_catalog.js`)**:
  - Centralized catalog of all 30 formal error codes (`E0001` through `E0030`).
  - 1:1 mapping to Google V8 C++ error templates (`message-template.h`) and corresponding Rust compiler/borrow checker mechanisms.
  - Automatic note and hint attachment to diagnostics.
- **Differential Stress & Equivalence Verification**:
  - Full side-by-side differential test harness (`test/differential_stress_test.mjs`) verifying 100% lexer, parser, AST, and codegen parity against stable release v1.4.0 across 1,029 automated checks (including a 1,000-program generative fuzzer) with zero performance regression.
- **CLI Gating Configuration (`bin/ospc.js`, `src/cli/runner.js`)**:
  - New CLI flag `--no-safety` (and `--no-gated-safety`) to explicitly disable compile-time gated safety invariants when needed.
  - New CLI flag `--strict-nulls` to enforce strict compile-time nullability checks (enabled by default).
  - Clean error handling in `ospc build`, `ospc run`, `ospc dev`, and `ospc watch` displaying formatted diagnostics without stack traces.

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
