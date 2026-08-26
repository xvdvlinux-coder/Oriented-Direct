# Contributing to Oriented-Direct

Thank you for your interest in contributing to Oriented-Direct (`.osp`). Oriented-Direct is an unambiguous, ultra-direct programming language that transpiles, bundles, and serves modern JavaScript applications.

This document outlines the workflow, development environment setup, coding guidelines, and pull request procedures for contributors.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to the [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to uphold its standards. Please report unacceptable behavior to `conduct@oriented-direct.dev`.

---

## Prerequisites

Before contributing, ensure your development workstation meets the following requirements:

- **Node.js**: Version `18.0.0` or higher (LTS recommended)
- **npm**: Version `8.0.0` or higher
- **Git**: Version `2.30.0` or higher

Verify your local installation:

```bash
node --version
npm --version
git --version
```

---

## Development Setup

### 1. Fork and Clone

Fork the repository on GitHub and clone your fork locally:

```bash
git clone https://github.com/<your-username>/Oriented-Direct.git
cd Oriented-Direct
```

Set up the upstream remote to keep your fork synchronized with the main repository:

```bash
git remote add upstream https://github.com/xvdvlinux-coder/Oriented-Direct.git
git fetch upstream
```

### 2. Install Dependencies

Oriented-Direct is built with minimal external dependencies. Install any development dependencies via npm:

```bash
npm install
```

### 3. Local Link / CLI Testing

You can link the CLI executable globally for local development and testing:

```bash
npm link
```

Verify that the CLI is executable:

```bash
ospc --help
```

---

## Project Structure

The project is structured into modular subsystems under `src/`, accompanied by command-line entry points, test suites, and editor extensions:

```
Oriented-Direct/
├── assets/                  # Brand assets, logos, and visual documentation
├── bin/
│   └── ospc.js              # Command-line interface executable entry point
├── src/
│   ├── index.js             # Public API entry point and subsystem orchestrator
│   ├── lexer/               # Tokenizer and lexical analysis engine
│   │   ├── lexer.js         # Lexical scanner for .osp syntax
│   │   └── tokens.js        # Token type definitions and keyword mappings
│   ├── parser/              # Abstract Syntax Tree (AST) generator
│   │   ├── parser.js        # Recursive descent parser
│   │   └── ast.js           # AST node representations
│   ├── transpiler/          # Code generation engine (AST -> JavaScript)
│   │   ├── transpiler.js    # Core code emitter
│   │   └── runtime.js       # Injected runtime helper routines
│   ├── bundler/             # Multi-module dependency resolver and bundler
│   │   └── bundler.js       # Monolithic bundle generator and tree linker
│   ├── server/              # Built-in zero-dependency HTTP dev server
│   │   ├── server.js        # Static server, routing, and live-reload engine
│   │   └── watcher.js       # File system change watcher
│   ├── sourcemap/           # Source map generator
│   │   ├── sourcemap.js     # Base64-VLQ coordinate encoder and map builder
│   │   └── vlq.js           # Variable-length quantity arithmetic
│   ├── cli/                 # CLI command handlers and argument parsing
│   │   ├── cli.js           # Command dispatcher (build, dev, run, help)
│   │   └── options.js       # Flag definitions and defaults
│   ├── config/              # Project configuration loader
│   │   └── config.js        # Parser for package.json / osp.json configs
│   └── diagnostics/         # Error reporting and diagnostic formatting
│       └── diagnostics.js   # Precise source location and snippet formatter
├── test/
│   └── compiler.test.js     # Comprehensive test suite (21 unit & integration tests)
├── vscode-extension/        # Visual Studio Code syntax & language support extension
├── package.json             # Package manifest, scripts, and configuration
├── README.md                # Language reference and user documentation
├── CHANGELOG.md             # Version history and release notes
├── CONTRIBUTING.md          # Contributor guide (this document)
├── CODE_OF_CONDUCT.md       # Community standards and conduct pledge
├── SECURITY.md              # Security policies and vulnerability reporting
└── LICENSE                  # MIT License
```

---

## Running the Test Suite

Oriented-Direct maintains a zero-regression test suite containing 21 tests covering lexical scanning, AST parsing, JavaScript transpilation, DOM directives, sealed structs, numeric range loops, multi-module bundling, and Base64-VLQ source map generation.

Run the test suite with:

```bash
npm test
```

Or run the test file directly using Node.js:

```bash
node test/compiler.test.js
```

### Writing New Tests

When adding new language features, syntax directives, or fixing bugs:

1. Open `test/compiler.test.js`.
2. Add targeted test cases verifying expected input `.osp` code against generated JavaScript code and runtime behaviors.
3. Verify that all 21 existing tests plus your new assertions pass without warnings.

---

## Code Style and Conventions

- **Module Standard**: Oriented-Direct uses native ECMAScript Modules (`"type": "module"`). Use `import` and `export` statements exclusively.
- **Indentation**: Use 2 spaces for indentation. Do not use hard tabs.
- **Semicolons**: Always terminate statements with semicolons.
- **Quotes**: Prefer double quotes (`"`) for strings, unless escaping is simplified by single quotes (`'`) or backticks (`` ` ``).
- **Naming Conventions**:
  - `camelCase` for variables, function names, and method names.
  - `PascalCase` for classes, AST node types, and struct definitions.
  - `UPPER_SNAKE_CASE` for global constants and token enum keys.
- **No External Bloat**: The compiler, bundler, and dev server are designed to remain lean and fast. Avoid introducing heavy external dependencies for functionality that can be cleanly implemented with standard Node.js built-in APIs (`fs`, `path`, `http`, `crypto`, `events`).
- **Error Diagnostics**: Error messages should produce clear, contextual diagnostics pointing to the exact line and column in the `.osp` source file.

---

## Submitting Issues

We track all bug reports and feature proposals on GitHub Issues.

### Reporting Bugs

Before submitting a bug report:
1. Search existing issues and pull requests to ensure the problem has not already been reported or resolved.
2. Verify that the bug reproduces on the latest `main` branch.

When opening an issue, include:
- A clear, descriptive title.
- Node.js version and operating system.
- A minimal, reproducible `.osp` code example.
- Expected behavior vs. actual behavior.
- Complete compiler or CLI error output.

### Proposing New Features

Feature proposals should detail:
- The problem or use case the feature addresses.
- Proposed `.osp` syntax examples.
- Transpiled JavaScript equivalent.
- Potential impact on existing syntax or backwards compatibility.

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feature/your-feature-name` for new capabilities.
   - `fix/issue-description` for bug fixes.
   - `docs/documentation-update` for documentation improvements.
   - `refactor/subsystem-name` for architectural enhancements.

2. **Commit Hygiene**:
   - Write concise, imperative commit messages (e.g., `feat(parser): add support for pattern matching`, `fix(sourcemap): correct column offset in multiline templates`).
   - Keep commits focused and logically separated.

3. **Pull Request Checklist**:
   - [ ] Created from a feature branch against the `main` branch.
   - [ ] All existing and new tests pass (`npm test`).
   - [ ] New language syntax or compiler options are documented in `README.md` and covered with tests.
   - [ ] No extraneous dependencies or build artifacts committed.
   - [ ] PR description clearly explains the changes and links relevant issues (e.g., `Fixes #42`).

---

## Good First Issues

If you are looking for an approachable place to start contributing, check out issues with the `good-first-issue` or `help-wanted` labels on GitHub.

Examples of great initial contributions:
- Adding edge-case tests to `test/compiler.test.js`.
- Improving error message explanations in `src/diagnostics/diagnostics.js`.
- Enhancing language documentation, syntax examples, or wiki pages.
- Expanding snippets and syntax highlighting in `vscode-extension/`.
- Adding sample projects demonstrating real-world `.osp` usage.

---

## Questions and Community

If you have questions about the codebase, architecture, or roadmap:
- Open a discussion in GitHub Discussions.
- File an issue with the `question` label.
- Email maintainers at `conduct@oriented-direct.dev` for private inquiries.
