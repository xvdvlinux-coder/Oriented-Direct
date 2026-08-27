# Oriented-Direct (.osp) — AI Agent Knowledge & Best Practices Guide (v1.4.0)

> Document Classification: AI-to-AI Knowledge Transfer & Field Guide  
> Target Audience: Large Language Models, Autonomous Coding Agents, and Human Engineers  
> Language Version: Oriented-Direct v1.4.0  
> Compiler Binary: ospc / oriented-direct

---

## 1. Executive Summary & Architecture (v1.4.0)

Oriented-Direct (.osp) is a modern, expressive, zero-overhead programming language designed specifically for the Web and Node.js environments. It eliminates 30 years of historic JavaScript verbosity, replaces clumsy DOM APIs with native language directives, guarantees strict equality, enforces immutability by default, and features a built-in multi-module bundler, local development server (ospc dev), and high-precision native Source Maps (.map).

### Key Characteristics:
- File Extension: .osp (e.g., main.osp, Header.osp).
- Compilation Target: Compiles and bundles directly to standard ECMAScript (ES Modules) via ospc build --public.
- Integrated Dev Server (ospc dev): Instantly compiles, copies assets, generates Source Maps, and serves ./public over HTTP (http://localhost:3000) with auto-rebuilding on file changes.
- Modular Development: Full support for import and export across .osp files.
- Clean Distribution (public/): Generates a self-contained ./public directory with bundled JavaScript and automatically copied index.html and .css assets.
- Zero Runtime Bloat: Generated JavaScript contains micro-helpers of only ~1 KB.
- Token Efficiency: Requires ~45% to 50% fewer tokens compared to equivalent TypeScript code.
- Native Base64-VLQ Source Maps: 0.0% coordinate drift with embedded sourcesContent for immediate in-browser DevTools debugging.

---

## 2. Development Server & Build Commands (ospc dev)

Oriented-Direct v1.4.0 includes a built-in development HTTP server and multi-mode Source Map engine:

### CLI Commands:
```bash
# 1. Start local development HTTP server with auto-rebuild and Source Maps (Serves public/ on http://localhost:3000)
ospc dev

# 2. Start dev server on a custom port
ospc dev 8080

# 3. Production bundle with public distribution & external Source Map (.map)
ospc build --public --sourcemap

# 4. Bundle with inline Base64 Source Map
ospc build src/main.osp --bundle -s inline -o public/app.js

# 5. Watch mode without HTTP server
ospc watch --public
```

---

## 3. Multi-Module Development & Bundling (import / export)

Oriented-Direct v1.4.0 allows splitting applications across multiple .osp files and bundling them into a single monolithic file automatically.

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

Best Practice for Exports: Always use `export fn functionName(...)` for exporting reusable functions across modules instead of arrow function variables (`export val fnName = ...`). This ensures clean function hoisting in the bundled output.

### Importing into Another Module:
```osp
// File: src/main.osp
import { add, multiply } from "./utils/math.osp";

val total = add(10, 20);
@log("Result:", total);
```

---

## 4. Project Configuration (package.json)

Configure your project build in package.json under the "osp" key:

```json
{
  "name": "my-project",
  "version": "1.4.0",
  "scripts": {
    "dev": "ospc dev",
    "serve": "ospc dev",
    "build": "ospc build --public --sourcemap",
    "watch": "ospc watch --public"
  },
  "osp": {
    "entry": "src/main.osp",
    "outDir": "public",
    "outFile": "app.js",
    "bundle": true,
    "format": "esm",
    "port": 3000,
    "sourcemap": true,
    "minify": false,
    "assets": ["index.html", "styles.css"]
  }
}
```

---

## 5. Core Grammar & Syntax Rules (The Golden Rules)

### A. Variable Declarations
- Use `val` for immutable constants (equivalent to const).
- Use `mut` for reassignable variables (equivalent to let).
- CRITICAL: Never emit let, const, or var.

```osp
val siteName = "Arctic Sentinels";  // Immutable
mut clickCount = 0;                  // Mutable
clickCount += 1;
```

---

### B. Logical Operators & Strict Comparison
Oriented-Direct transpiles all equality comparisons into strict `===` / `!==` under the hood.

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
- Conditional: `if (cond) { ... } else { ... }`
- Inverted Conditional: `unless (cond) { ... }` (syntactic sugar for `if (!cond)`)
- Pattern Matching: `match (expr) { case val => expr, default => expr }`
- Loops:
  1. C-Style 3-Part Loop (use `mut` for the index variable!):
     ```osp
     for (mut i = 0; i < 100; i += 10) {
       @log(i);
     }
     ```
  2. Numeric Range Loop:
     ```osp
     for (val i in 0..10 step 2) {
       @log(i);
     }
     ```
  3. Iterable / Array Loop:
     ```osp
     for (val item in itemList) {
       @log(item.name);
     }
     ```
  4. Object Keys Loop:
     ```osp
     for (val key of settings) {
       @log(key, settings[key]);
     }
     ```

---

### D. Pipeline Operator (|>)
Allows linear, readable data transformations from left to right:

```osp
val cleanText = rawInput |> trim |> toLowerCase |> removeAccents;
```

---

## 6. Directives Reference (@ Macro System)

All browser and console directives share the unified `@` prefix. Common variable names like `info` or `log` can be declared freely without collision.

### A. DOM Querying & Mutation
| Directive | Purpose & Usage |
| :--- | :--- |
| `@doc` | Points to the global document object safely. |
| `@win` | Points to the global window object safely. |
| `@find(selector, parent?)` | Equivalent to parent.querySelector(selector). Safe against null parents. |
| `@all(selector, parent?)` | Equivalent to Array.from(parent.querySelectorAll(selector)). |
| `@id(idString)` | Equivalent to document.getElementById(idString). |
| `@text(el, content?)` | Gets or sets el.textContent. |
| `@html(el, content?)` | Gets or sets el.innerHTML. |
| `@val(el, value?)` | Gets or sets el.value on form inputs. |
| `@attr(el, name, value?)` | Gets or sets el.getAttribute(name) / el.setAttribute(name, value). |
| `@css(el, { key: val })` | Applies inline styles via Object.assign(el.style, { ... }). |
| `@create(tag, attrs, ...children)` | Declaratively creates DOM nodes with properties, style objects, and nested children. |

### B. Event Handling & Communication
| Directive | Purpose & Usage |
| :--- | :--- |
| `@on(target, event, handler, opts?)` | Attaches event listener safely (target.addEventListener). Returns target. |
| `@off(target, event, handler, opts?)` | Removes event listener (target.removeEventListener). |
| `@emit(target, event, detailObj)` | Dispatches a CustomEvent with { detail: detailObj, bubbles: true }. |

### C. Console & Diagnostics Directives
| Directive | Equivalent JavaScript |
| :--- | :--- |
| `@log(...)` | console.log(...) |
| `@info(...)` | console.info(...) |
| `@warn(...)` | console.warn(...) |
| `@error(...)` | console.error(...) |

---

## 7. Battle-Tested Pitfalls & Hard-Won Solutions (v1.4.0 Experience)

When developing in Oriented-Direct, you may encounter cases where code looks syntactically clean in .osp but causes unexpected issues during compilation or runtime in app.js. Here are the definitive solutions:

---

### PITFALL 1: Unquoted Reserved Keywords in Object Literals
- Problem: Words like class, step, type, val, default, case, for, in are language keywords. Writing them unquoted inside object literals (`{ class: "btn", step: "0.1" }`) triggers `[Oriented-Direct ParseError] Expected object property key (got 'class')`.
- Solution: Always quote HTML attribute names and keyword properties in objects:
  ```osp
  // Incorrect:
  val input = @create("input", { type: "range", class: "slider", step: 0.1 });

  // Correct:
  val input = @create("input", { "type": "range", "class": "slider", "step": 0.1 });
  ```

---

### PITFALL 2: Using Reserved Keywords as Function Parameters
- Problem: Naming a callback parameter val, mut, or fn (e.g., `(field, val) => { ... }`) causes `[Oriented-Direct ParseError] Unexpected token 'val'`.
- Solution: Use meaningful, non-keyword parameter names such as `(fieldName, fieldValue)` or `(key, value)`:
  ```osp
  // Incorrect:
  fn update(val) { ... }
  (field, val) => { ... }

  // Correct:
  fn update(value) { ... }
  (fieldName, fieldValue) => { ... }
  ```

---

### PITFALL 3: Model Initialization with export struct in Multi-Module Bundles
- Problem: `export struct ModelName { ... }` in bundled multi-module scope can emit nested class body braces (`class Model { static _export = ...; { constructor... } }`), resulting in runtime `SyntaxError: Unexpected token '{' (at app.js:133)`.
- Solution: Use pure factory functions that return sealed state objects:
  ```osp
  // Risk in multi-module bundles:
  export struct FontState { isLoaded, name, size }

  // Idiomatic & 100% Robust:
  export fn createInitialState(config) {
    val state = {
      "isLoaded": false,
      "name": "Default Font",
      "size": config.defaultSize
    };
    return state;
  }
  ```

---

### PITFALL 4: Partial Object Updates Overwriting State with undefined
- Problem: In Oriented-Direct, `if (changed.prop != null)` transpiles to strict identity `if (changed.prop !== null)`. Since `undefined !== null` is true in JavaScript, emitting a partial object (e.g. `{ "size": 30 }`) causes `lineHeight` and `letterSpacing` to evaluate as true, assigning undefined to neighboring state properties and resetting all sliders simultaneously ("they all drag together").
- Solution: Decouple component updates with targeted key-value handlers:
  ```osp
  // Prone to undefined overwrites:
  onUpdate({ "size": 30 }); // main.osp: if (changed.lh != null) state.lh = undefined

  // Robust & Fully Isolated:
  onUpdateField("fontSize", 30);

  // In main.osp:
  (fieldName, fieldValue) => {
    if (fieldName is "fontSize") state.fontSize = fieldValue;
    if (fieldName is "lineHeight") state.lineHeight = fieldValue;
    updateStyles(state);
  }
  ```

---

### PITFALL 5: Chained Promise Methods vs. async/await with try/catch
- Problem: Chaining `.catch(...)` directly on a Promise triggers parser errors because `catch` is a reserved keyword for try/catch statements.
- Solution: Use modern async / await wrapped in try / catch blocks:
  ```osp
  // Incorrect:
  fontFace.load().then(onSuccess).catch(onError);

  // Correct & Idiomatic Oriented-Direct:
  @on(reader, "load", async (e) => {
    try {
      val loaded = await fontFace.load();
      @doc.fonts.add(loaded);
      onSuccess(loaded);
    } catch (err) {
      @error("Failed to load fontFace:", err);
      onError(err);
    }
  });
  ```

---

### PITFALL 6: Direct Constructor Access with Directives (@win.Constructor)
- Problem: Direct parentheses grouping like `new (@win.FontFace)(...)` or `new (@win.FileReader)()` can cause AST token grouping ambiguities.
- Solution: Extract the constructor reference to a local val:
  ```osp
  // Ambiguous:
  val reader = new (@win.FileReader)();

  // Clean & Reliable:
  val FileReaderClass = @win.FileReader;
  val reader = new FileReaderClass();
  ```

---

### PITFALL 7: Putting Compiled .js in the Project Root
- Problem: Compiling main.osp directly into main.js in root.
- Solution: Use `ospc build --public`. Source code lives in src/, output bundle lives in public/app.js.

---

## 8. Project Structure & Workflow

```text
my-project/
├── .gitignore             # Ignores public/, node_modules/
├── LICENSE                # License file
├── package.json           # Contains "osp" configuration with dev server port
├── index.html             # Source HTML
├── styles.css             # Source Stylesheet
├── README.md              # Project documentation
├── src/                   # 100% Oriented-Direct source code
│   ├── main.osp           # Entry point
│   ├── utils/             # Reusable helper modules
│   └── components/        # Modular component logic
└── public/                # Generated by ospc build --public / ospc dev
    ├── index.html         # Copied asset
    ├── styles.css         # Copied asset
    ├── app.js             # Monolithic bundled JavaScript
    └── app.js.map         # High-precision Source Map
```
