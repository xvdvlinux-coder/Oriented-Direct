# Oriented-Direct (`.osp`) — AI Agent Knowledge & Best Practices Guide (v1.3.0)

> **Document Classification**: AI-to-AI Knowledge Transfer & Field Guide  
> **Target Audience**: Large Language Models, Autonomous Coding Agents, and Human Engineers  
> **Language Version**: Oriented-Direct v1.3.0  
> **Compiler Binary**: `ospc` / `oriented-direct`

---

## 1. Executive Summary & Architecture (v1.3.0)

**Oriented-Direct** (`.osp`) is a modern, expressive, zero-overhead programming language designed specifically for the Web and Node.js environments. It eliminates 30 years of historic JavaScript verbosity, replaces clumsy DOM APIs with native language directives, guarantees strict equality, enforces immutability by default, and features a **built-in multi-module bundler and zero-dependency local development server (`ospc dev`)**.

### Key Characteristics:
- **File Extension**: `.osp` (e.g., `main.osp`, `Header.osp`).
- **Compilation Target**: Compiles and bundles directly to standard ECMAScript (ES Modules) via `ospc build --public`.
- **Integrated Dev Server (`ospc dev`)**: Instantly compiles, copies assets, and serves `./public` over HTTP (`http://localhost:3000`) with auto-rebuilding on file changes.
- **Modular Development**: Full support for `import` and `export` across `.osp` files.
- **Clean Distribution (`public/`)**: Generates a self-contained `./public` directory with bundled JavaScript and automatically copied `index.html` and `.css` assets.
- **Zero Runtime Bloat**: Generated JavaScript contains micro-helpers of only **~1 KB**.
- **Token Efficiency**: Requires **~45% to 50% fewer tokens** compared to equivalent TypeScript code.

---

## 2. Development Server & Build Commands (`ospc dev`)

Oriented-Direct v1.3.0 includes a built-in development HTTP server that eliminates the need for `npx serve`, Live Server, or external dev servers.

### CLI Commands:
```bash
# 1. Start local development HTTP server with auto-rebuild (Serves public/ on http://localhost:3000)
ospc dev

# 2. Start dev server on a custom port
ospc dev 8080

# 3. Production bundle with public distribution
ospc build --public

# 4. Watch mode without HTTP server
ospc watch --public
```

---

## 3. Multi-Module Development & Bundling (`import` / `export`)

Oriented-Direct v1.3.0 allows splitting applications across multiple `.osp` files and bundling them into a single monolithic file automatically.

### Exporting from a Module:
```osp
// File: src/utils/math.osp
export fn add(a, b) {
  return a + b;
}

export fn multiply(a, b) {
  return a * b;
}
```

> [!TIP]
> **Best Practice for Exports**: Always use `export fn functionName(...)` for exporting reusable functions across modules instead of arrow function variables (`export val fnName = ...`). This ensures clean function hoisting in the bundled output.

### Importing into Another Module:
```osp
// File: src/main.osp
import { add, multiply } from "./utils/math.osp";

val total = add(10, 20);
@log("Result:", total);
```

---

## 4. Project Configuration (`package.json`)

Configure your project build in `package.json` under the `"osp"` key:

```json
{
  "name": "my-project",
  "version": "1.3.0",
  "scripts": {
    "dev": "ospc dev",
    "serve": "ospc dev",
    "build": "ospc build --public",
    "watch": "ospc watch --public"
  },
  "osp": {
    "entry": "src/main.osp",
    "outDir": "public",
    "outFile": "app.js",
    "bundle": true,
    "format": "esm",
    "port": 3000,
    "minify": false,
    "assets": ["index.html", "styles.css"]
  }
}
```

---

## 5. Core Grammar & Syntax Rules (The Golden Rules)

### A. Variable Declarations
- Use `val` for immutable constants (equivalent to `const`).
- Use `mut` for reassignable variables (equivalent to `let`).
- **CRITICAL**: Never emit `let`, `const`, or `var`.

```osp
val siteName = "Arctic Sentinels";  // Immutable
mut clickCount = 0;                  // Mutable
clickCount += 1;
```

---

### B. Logical Operators & Strict Comparison
Oriented-Direct transpiles **all** equality comparisons into strict `===` / `!==` under the hood.

| Concept | Oriented-Direct Syntax | Transpiles to (JS) |
| :--- | :--- | :--- |
| Strict Equality | `a is b` or `a == b` | `a === b` |
| Strict Inequality | `a is not b` or `a != b` | `a !== b` |
| Logical AND | `a and b` | `a && b` |
| Logical OR | `a or b` | `a \|\| b` |
| Logical NOT | `not a` | `!a` |
| Nullish Coalescing | `a ?? b` | `a ?? b` |

```osp
if (userRole is "admin" and not isSuspended) {
  @log("Access authorized");
}
```

---

### C. Control Flow & Pattern Matching
- **Conditional**: `if (cond) { ... } else { ... }`
- **Inverted Conditional**: `unless (cond) { ... }` (syntactic sugar for `if (!cond)`)
- **Pattern Matching**: `match (expr) { case val => expr, default => expr }`
- **Loops**:
  1. **C-Style 3-Part Loop** (use `mut` for the index variable!):
     ```osp
     for (mut i = 0; i < 100; i += 10) {
       @log(i);
     }
     ```
  2. **Numeric Range Loop**:
     ```osp
     for (val i in 0..10 step 2) {
       @log(i);
     }
     ```
  3. **Iterable / Array Loop**:
     ```osp
     for (val seal in sealList) {
       @log(seal.name);
     }
     ```
  4. **Object Keys Loop**:
     ```osp
     for (val key of settings) {
       @log(key, settings[key]);
     }
     ```

---

### D. Pipeline Operator (`|>`)
Allows linear, readable data transformations from left to right:

```osp
val cleanText = rawInput |> trim |> toLowerCase |> removeAccents;
```

---

### E. Sealed Structs & Classes
- `struct Name { prop1, prop2 }`: Generates a sealed class constructor with `Object.seal(this)` automatically applied. Protects against accidental property typos at runtime!
- `class Name { constructor() { ... } }`: Standard class syntax for stateful objects.

```osp
struct Specimen { name, tagId, status }

val pup = new Specimen("Frosty", "HS-409", "Active");
```

---

## 6. Directives Reference (`@` Macro System)

All browser and console directives share the unified `@` prefix. Common variable names like `info` or `log` can be declared freely without collision.

### A. DOM Querying & Mutation
| Directive | Purpose & Usage |
| :--- | :--- |
| `@doc` | Points to the global `document` object safely. |
| `@win` | Points to the global `window` object safely. |
| `@find(selector, parent?)` | Equivalent to `parent.querySelector(selector)`. Safe against null parents. |
| `@all(selector, parent?)` | Equivalent to `Array.from(parent.querySelectorAll(selector))`. |
| `@id(idString)` | Equivalent to `document.getElementById(idString)`. |
| `@text(el, content?)` | Gets or sets `el.textContent`. |
| `@html(el, content?)` | Gets or sets `el.innerHTML`. |
| `@val(el, value?)` | Gets or sets `el.value` on form inputs. |
| `@attr(el, name, value?)` | Gets or sets `el.getAttribute(name)` / `el.setAttribute(name, value)`. |
| `@css(el, { key: val })` | Applies inline styles via `Object.assign(el.style, { ... })`. |
| `@create(tag, attrs, ...children)` | Declaratively creates DOM nodes with properties, style objects, and nested children. |

### B. Event Handling & Communication
| Directive | Purpose & Usage |
| :--- | :--- |
| `@on(target, event, handler, opts?)` | Attaches event listener safely (`target.addEventListener`). Returns target. |
| `@off(target, event, handler, opts?)` | Removes event listener (`target.removeEventListener`). |
| `@emit(target, event, detailObj)` | Dispatches a `CustomEvent` with `{ detail: detailObj, bubbles: true }`. |

### C. Console & Diagnostics Directives
| Directive | Equivalent JavaScript |
| :--- | :--- |
| `@log(...)` | `console.log(...)` |
| `@info(...)` | `console.info(...)` |
| `@warn(...)` | `console.warn(...)` |
| `@error(...)` | `console.error(...)` |

---

## 7. Common Pitfalls & Mistakes for AI Agents

### ❌ PITFALL 1: Using `export val fn = () => ...` instead of `export fn`
- **Incorrect**: `export val formatPercentage = (num) => num + "%";` (Can trigger TDZ ReferenceError in bundled IIFEs)
- **Correct**: `export fn formatPercentage(num) { return num + "%"; }`

### ❌ PITFALL 2: Putting Compiled `.js` in the Project Root
- **Incorrect**: Compiling `app.osp` directly into `app.js` in root.
- **Correct**: Use `ospc build --public`. Source code lives in `src/`, output bundle lives in `public/app.js`.

### ❌ PITFALL 3: Using `let` or `val` in Mutated C-Style Loop Indices
- **Incorrect**: `for (val i = 0; i < len; i++)` (Cannot mutate `val`)
- **Incorrect**: `for (let i = 0; i < len; i++)` (`let` does not exist)
- **Correct**: `for (mut i = 0; i < len; i++)`

### ❌ PITFALL 4: Using JavaScript `&&`, `||`, `!` Operators
- **Incorrect**: `if (isValid && !hasError)`
- **Correct**: `if (isValid and not hasError)`

### ❌ PITFALL 5: Forgetting `.osp` in Module Imports
- **Incorrect**: `import { helper } from "./utils/math"`
- **Correct**: `import { helper } from "./utils/math.osp"`

---

## 8. Project Structure & Workflow

```text
my-project/
├── package.json           # Contains "osp" configuration with dev server port
├── index.html             # Source HTML
├── styles.css             # Source Stylesheet
├── src/                   # 100% Oriented-Direct source code
│   ├── main.osp           # Entry point
│   ├── utils/             # Reusable helper modules
│   └── modules/           # Modular component logic
└── public/                # Generated by `ospc build --public` / `ospc dev`
    ├── index.html         # Copied asset
    ├── styles.css         # Copied asset
    └── app.js             # Monolithic bundled JavaScript
```
