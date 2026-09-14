# Runtime Error Taxonomy: Formal Classification of $\mathcal{S}_{\mathrm{err}}$ with V8 C++ Mapping

This document formalizes the mathematical taxonomy of all execution states belonging to the failure state set $\mathcal{S}_{\mathrm{err}}$ in ECMAScript/V8, directly mapped to the C++ runtime exception templates in Google's **V8 engine (`src/common/message-template.h`)**.

---

## 1. Class $\mathcal{S}_{\mathrm{TypeError}}$: Type & Invocability Invariants

$$\mathcal{S}_{\mathrm{TypeError}} = \mathcal{S}_{\mathrm{NullDeref}} \cup \mathcal{S}_{\mathrm{Uncallable}} \cup \mathcal{S}_{\mathrm{SealedViolation}} \cup \mathcal{S}_{\mathrm{ConstReassignment}} \cup \mathcal{S}_{\mathrm{PrototypePollution}}$$

### 1.1 $\mathcal{S}_{\mathrm{NullDeref}}$ (Null / Undefined Property Access)
- **V8 C++ Template**: `NonObjectPropertyLoadWithProperty` (`"Cannot read properties of % (reading '%')"`) & `NonObjectPropertyStoreWithProperty` (`"Cannot set properties of % (setting '%')"`)
- **Predicate**: $\exists e = o.k \in \mathcal{C} : (\text{Val}(o) \in \{ \text{null}, \text{undefined} \} \;\land\; \text{Op}(e) \in \{ \text{Load}, \text{Store} \})$
- **Runtime Manifestation**: `TypeError: Cannot read properties of null/undefined (reading 'k')`
- **MathL Guard**: Verified by $\mathcal{L}_{\text{Null}}$ flow analysis. Proves that $\sigma^\sharp(o) \sqsubseteq \mathbf{NonNull}$ via `unless (o)`, `o?.k`, or `o ?? default`.

### 1.2 $\mathcal{S}_{\mathrm{Uncallable}}$ (Non-Function Call Invocations)
- **V8 C++ Template**: `NotCallable` (`"% is not a function"`) & `CalledNonCallable` (`"% is not a function"`)
- **Predicate**: $\exists e = f(\vec{a}) \in \mathcal{C} : \neg \text{IsCallable}(\text{Val}(f))$
- **Runtime Manifestation**: `TypeError: f is not a function`
- **MathL Guard**: Verified by $\mathcal{L}_{\text{Type}}$ checking $\text{Type}(f) \sqsubseteq \text{Func}(n)$.

### 1.3 $\mathcal{S}_{\mathrm{SealedViolation}}$ (Dynamic Extension of Sealed Structs)
- **V8 C++ Template**: `ObjectNotExtensible` (`"Cannot add property %, object is not extensible"`)
- **Predicate**: $\exists e = (s.k = v) \in \mathcal{C} : (\text{Object.isSealed}(\text{Val}(s)) \;\land\; k \notin \text{Keys}(s))$
- **Runtime Manifestation**: `TypeError: Cannot add property k, object is not extensible`
- **MathL Guard**: In Oriented-Direct, `struct` instantiations are sealed. The analyzer checks field membership $k \in \text{Fields}(\text{Struct})$ at compile-time.

### 1.4 $\mathcal{S}_{\mathrm{ConstReassignment}}$ (Immutable Binding Reassignment)
- **V8 C++ Template**: `ConstAssign` (`"Assignment to constant variable."`)
- **Predicate**: $\exists e = (v = w) \in \mathcal{C} : \text{Kind}(v) = \mathbf{val}$
- **Runtime Manifestation**: `TypeError: Assignment to constant variable.`
- **MathL Guard**: Verified by single-assignment check on $\mathbf{val}$ declarations ($|\text{Assignments}(v)| = 1$).

### 1.5 $\mathcal{S}_{\mathrm{PrototypePollution}}$ (Prototype Tampering & Modification)
- **V8 C++ Template**: `ImmutablePrototypeSet` (`"Immutable prototype object '%' cannot have their prototype set"`) & `CyclicProto` (`"Cyclic __proto__ value"`)
- **Predicate**: $\exists e = (o.\_\_\text{proto}\_\_ = p) \lor (o.\text{prototype} = p)$
- **Runtime Manifestation**: `TypeError: Immutable prototype object cannot have their prototype set`
- **MathL Guard**: Property access or assignment to `__proto__` is statically rejected.

---

## 2. Class $\mathcal{S}_{\mathrm{ReferenceError}}$: Scope & Initialization Invariants

$$\mathcal{S}_{\mathrm{ReferenceError}} = \mathcal{S}_{\mathrm{TDZ}} \cup \mathcal{S}_{\mathrm{UndeclaredIdentifier}}$$

### 2.1 $\mathcal{S}_{\mathrm{TDZ}}$ (Temporal Dead Zone Violations)
- **V8 C++ Template**: `AccessedUninitializedVariable` (`"Cannot access '%' before initialization"`)
- **Predicate**: $\exists \text{read}(x) \in \text{CFG} : \neg \text{Dominates}(\text{Declaration}(x), \text{read}(x))$
- **Runtime Manifestation**: `ReferenceError: Cannot access 'x' before initialization`
- **MathL Guard**: Verified by CFG Dominator Tree analysis on variable lexical scopes.

### 2.2 $\mathcal{S}_{\mathrm{UndeclaredIdentifier}}$ (Missing Symbols)
- **V8 C++ Template**: `NotDefined` (`"% is not defined"`)
- **Predicate**: $\exists \text{ref}(x) \in \mathcal{C} : x \notin \text{Scope}(\text{ref}) \;\land\; x \notin \text{Globals}$
- **Runtime Manifestation**: `ReferenceError: x is not defined`
- **MathL Guard**: Scope symbol table lookup against local bindings, imports, and the unified platform dictionary.

---

## 3. Class $\mathcal{S}_{\mathrm{RangeError}}$: Boundary & Allocation Invariants

### 3.1 $\mathcal{S}_{\mathrm{InvalidArrayLength}}$
- **V8 C++ Template**: `InvalidArrayLength` (`"Invalid array length"`)
- **Predicate**: $\exists e = \text{new Array}(n) : (n < 0 \;\lor\; n > 2^{32}-1 \;\lor\; n \ne \lfloor n \rfloor)$
- **Runtime Manifestation**: `RangeError: Invalid array length`
- **MathL Guard**: Abstract integer interval analysis on numeric array allocations.

---

## 4. Class $\mathcal{S}_{\mathrm{NaNLeak}}$: Arithmetic Contamination Invariants

- **Predicate**: $\exists e = (a \odot b) \in \mathcal{C} : (\text{Val}(a) = \text{undefined} \;\lor\; \text{Val}(b) = \text{undefined}) \implies \text{Val}(e) = \text{NaN}$
- **Runtime Manifestation**: Silent arithmetic failure propagating `NaN` into physics, canvas rendering, or CSS string templates.
- **MathL Guard**: Arithmetic operators ($+, -, *, /, \%$) require operands strictly verified as $\text{Type} \sqsubseteq \text{Number}$.

---

## 5. V8 Exception Template Mapping Matrix

| MathL Failure State | V8 C++ Template Identifier | V8 Format String | Compile-Time Gate |
| :--- | :--- | :--- | :--- |
| $\mathcal{S}_{\mathrm{NullDeref}}$ | `NonObjectPropertyLoadWithProperty` | `"Cannot read properties of % (reading '%')"` | `unless (o) return;`, `o?.k`, `o ?? def` |
| $\mathcal{S}_{\mathrm{Uncallable}}$ | `NotCallable` | `"% is not a function"` | Static function signature & arity check |
| $\mathcal{S}_{\mathrm{SealedViolation}}$ | `ObjectNotExtensible` | `"Cannot add property %, object is not extensible"` | Sealed struct schema verification |
| $\mathcal{S}_{\mathrm{ConstReassignment}}$ | `ConstAssign` | `"Assignment to constant variable."` | Single assignment on `val` |
| $\mathcal{S}_{\mathrm{TDZ}}$ | `AccessedUninitializedVariable` | `"Cannot access '%' before initialization"` | CFG Dominator analysis |
| $\mathcal{S}_{\mathrm{UndeclaredIdentifier}}$ | `NotDefined` | `"% is not defined"` | Scope resolution & symbol dictionary |
| $\mathcal{S}_{\mathrm{InvalidArrayLength}}$ | `InvalidArrayLength` | `"Invalid array length"` | Numeric interval check ($n \ge 0$) |
