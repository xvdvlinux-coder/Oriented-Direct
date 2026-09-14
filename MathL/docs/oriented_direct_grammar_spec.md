# Oriented-Direct (`.osp`) Formal Grammar & Language Specification for MathL

This document formalizes the syntactic grammar rules, keywords, AST structures, and semantics of the **Oriented-Direct universe ($\mathcal{O}$)** for the MathL dual-language guardian.

---

## 1. Lexical Grammar & Keywords Universe ($\mathcal{O}_{\text{Lex}}$)

### 1.1 Variable & Mutability System
- `val`: Immutable constant binding. Single-assignment invariant: $\forall x \in \text{val}, |\text{Assignments}(x)| = 1$. Compiles to ECMAScript `const`.
- `mut`: Mutable variable binding. Must be explicitly declared. Compiles to ECMAScript `let`.
- **Banned Lexemes**: `var`, `let`, `const`.

### 1.2 Function & Invocations
- `fn`: Named and anonymous function declarations. Static arity tracking: $\text{Arity}(fn) = |\text{params}|$.
- `async` / `await`: Asynchronous functions and promise resolution.
- `return`: Explicit function exit and return value binding.

### 1.3 Control Flow & Pattern Matching
- `if (condition) { ... } else { ... }`: Standard conditional branching.
- `unless (condition) { ... }`: Inverted conditional. Evaluates branch when condition is falsy. Promotes condition to `NonNull` when containing `return`.
- `match (target) { case pattern => expr, default => expr }`: Pattern matching construct. Requires exhaustiveness over target domain or explicit `default`.

### 1.4 Iteration Paradigms
- **C-Style Loop**: `for (mut i = 0; i < N; i += S) { ... }` (Requires `mut` control variable).
- **Range Loop**: `for (val i in Start..End step Step) { ... }` (Abstract interval $[Start, End]$ with step $Step$).
- **Collection Loop**: `for (val item in Array) { ... }` (Extracts element type $\tau$ from `Array<τ>`).
- **Object Keys Loop**: `for (val key of Object) { ... }` (Extracts string key domain).
- `loop { ... }`: Continuous loop construct.

### 1.5 Sealed Data Models (`struct`) & Classes
- `struct Name { f_1, f_2, ..., f_n }`: Sealed data structure. Formally enforces $\text{Keys}(\text{Instance}) = \{ f_1, \dots, f_n \}$ and $\text{Object.isSealed} = \text{true}$.
- `class Name extends Base { ... }`: Standard ES class with constructor, static members, and methods.

### 1.6 Pipeline Operator (`|>`)
- `x |> f |> g`: Linear functional transformation. Desugars to $g(f(x))$.

---

## 2. Directives Macro System Universe ($\mathcal{O}_{\text{Directives}}$)

Every `@` directive has a strict signature and return contract:

| Directive | Formal Signature | Invariant & Nullability Contract |
| :--- | :--- | :--- |
| `@doc` | `() -> Document` | Guaranteed `NonNull` in browser context. |
| `@win` | `() -> Window` | Guaranteed `NonNull` in browser context. |
| `@find` | `(selector: String, parent?: HTMLElement) -> HTMLElement \| Null` | Returns **`Nullable`**. Requires flow guard before member access. |
| `@all` | `(selector: String, parent?: HTMLElement) -> Array<HTMLElement>` | Guaranteed `NonNull` Array (empty if no matches). |
| `@id` | `(id: String) -> HTMLElement \| Null` | Returns **`Nullable`**. Requires flow guard before member access. |
| `@on` | `(target: EventTarget \| Null, event: String, fn: Function, opts?: Object) -> target` | Safe against `Null` target (no-op if null). |
| `@off` | `(target: EventTarget \| Null, event: String, fn: Function, opts?: Object) -> target` | Safe against `Null` target. |
| `@emit` | `(target: EventTarget \| Null, event: String, detail?: Object) -> target` | Safe against `Null` target. |
| `@create` | `(tag: String, attrs?: Object, ...children: Any) -> HTMLElement` | Guaranteed `NonNull` element. |
| `@text` | `(el: HTMLElement \| Null, text?: String) -> String \| Undefined` | Safe getter/setter. |
| `@html` | `(el: HTMLElement \| Null, html?: String) -> String \| Undefined` | Safe getter/setter. |
| `@css` | `(el: HTMLElement \| Null, styles: Object) -> el` | Safe style application. |
| `@attr` | `(el: HTMLElement \| Null, name: String, val?: String) -> String \| Undefined` | Safe attribute getter/setter. |
| `@val` | `(el: HTMLElement \| Null, val?: String) -> String \| Undefined` | Safe input value getter/setter. |
| `@log` | `(...args: Any) -> void` | Diagnostic output to `console.log`. |
| `@info` | `(...args: Any) -> void` | Diagnostic output to `console.info`. |
| `@warn` | `(...args: Any) -> void` | Diagnostic output to `console.warn`. |
| `@error` | `(...args: Any) -> void` | Diagnostic output to `console.error`. |
