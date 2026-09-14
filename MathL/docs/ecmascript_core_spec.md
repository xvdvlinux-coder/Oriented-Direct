# Comprehensive ECMAScript (JavaScript) Core Specification Reference

This document formalizes the runtime semantics, evaluation rules, type conversions, and execution model of ECMAScript (ECMA-262) for the **MathL** static analyzer.

---

## 1. Type Universe & Value Semantics

ECMAScript defines exactly eight runtime types:
1. **Undefined**: The singleton value `undefined`. Returned by uninitialized variables and non-existent object properties.
2. **Null**: The singleton value `null`. Represents the intentional absence of any object value.
3. **Boolean**: `true` and `false`.
4. **Number**: IEEE 754 double-precision 64-bit floating-point format, including `+Infinity`, `-Infinity`, and `NaN`.
5. **BigInt**: Arbitrary precision integers.
6. **String**: Sequence of 16-bit unsigned integer values (UTF-16 code units).
7. **Symbol**: Unique, immutable identifier used as object property keys.
8. **Object**: Mutable collection of named properties (key-value pairs) and internal prototype links (`[[Prototype]]`).

---

## 2. Type Conversions & Coercion Rules

### 2.1 Abstract Equality Comparison (`==`) vs Strict Equality (`===`)
- **Strict Equality (`===`)**:
  - If `Type(x)` is different from `Type(y)`, return `false`.
  - If `Type(x)` is Number: if `x` is `NaN`, return `false`; if `+0` and `-0`, return `true`.
  - If `x` and `y` refer to the same Object instance, return `true`; otherwise `false`.
- **Loose Equality (`==`) (Eliminated by Oriented-Direct)**:
  - Subject to complex multi-step coercion: `null == undefined` is `true`; `0 == ""` is `true`; `false == "0"` is `true`.
  - **MathL Invariant**: All comparison operations in Oriented-Direct map exclusively to strict identity (`===` and `!==`).

### 2.2 ToBoolean Conversion
- **Falsy Values**: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.
- **Truthy Values**: All other values, including all Objects (`{}`, `[]`, `new Boolean(false)`).

### 2.3 ToNumber Conversion
- `undefined` $\to$ `NaN`
- `null` $\to$ `+0`
- `true` $\to$ `1`, `false` $\to$ `0`
- `String` $\to$ Parsed numeric value or `NaN` if non-numeric characters exist.

---

## 3. Object Model & Property Access Semantics

### 3.1 Prototype Chain Lookup (`[[Get]]`)
When evaluating property access `O.P`:
1. If `O` is `undefined` or `null`, throw `TypeError: Cannot read properties of undefined/null`.
2. Let `desc` be `O.[[GetOwnProperty]](P)`.
3. If `desc` is `undefined`:
   - Let `proto` be `O.[[Prototype]]`.
   - If `proto` is `null`, return `undefined`.
   - Repeat step 2 with `proto`.
4. If `desc` is a value property, return `desc.value`.
5. If `desc` is an accessor, invoke `desc.get()`.

### 3.2 Property Assignment (`[[Set]]`)
- In Strict Mode: Attempting to assign to a non-writable property, a sealed object's new key, or a frozen object throws `TypeError`.
- **MathL Invariant on Structs**: Because `struct` in Oriented-Direct executes `Object.seal(this)`, attempting to assign an unlisted property `record.unlistedKey = 1` triggers a runtime `TypeError` in strict mode.

---

## 4. Execution Contexts & Lexical Environments

### 4.1 Temporal Dead Zone (TDZ)
- Variables declared with `let` or `const` exist in the lexical scope from block entry, but accessing them before the actual declaration statement evaluates throws a `ReferenceError`.
- **MathL Invariant**: The static analyzer verifies that every identifier's read node is strictly dominated by its declaration assignment node in the Control Flow Graph.

### 4.2 Function Invocation (`[[Call]]`)
1. Let `func` be the evaluated function reference.
2. If `IsCallable(func)` is `false`, throw `TypeError: func is not a function`.
3. If `func` is called with fewer arguments than declared parameters, trailing parameters are bound to `undefined`.
4. **MathL Invariant**: The static analyzer verifies call arity and guarantees `IsCallable(func)` before emission.
