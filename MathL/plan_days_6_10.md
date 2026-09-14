# Research Plan: Days 6 to 10 - MathL Laboratory

Date: Days 6-10 Experimental Research Batch
Focus: Advanced Static Analysis, Structural Polymorphism, Asynchronous Event Loop Invariance, Multi-Package Linking, and Holistic Multi-Component Verification.

---

## 1. Overview and Theoretical Objectives

The Days 6 to 10 batch addresses critical semantic challenges bridging the Oriented-Direct compile-time abstract domain with the concrete execution environment of ECMAScript and browser engines:

1. Day 6 (Trial 24): FFI & DOM Lifecycle Invariance
   - Problem: Detached DOM nodes causing memory leaks or null/undefined dereferences when manipulating elements removed from the active document tree.
   - Formalization: Connection lattice L_Conn and lifecycle transition transfer functions.

2. Day 7 (Trial 25): Structural Subtyping & Sealed Struct Polymorphism
   - Problem: Passing sealed structs to functions expecting structural subsets (width and depth subtyping).
   - Formalization: Subtyping lattice ordering S1 <=_Struct S2 iff Keys(S2) subseteq Keys(S1) and forall k in Keys(S2), S1.k <= S2.k.

3. Day 8 (Trial 26): Async Generator & Microtask Queue Event Loop Invariance
   - Problem: Interleaving of microtasks (Promise.then, await) vs macrotasks (setTimeout, event callbacks), ensuring race-free state transitions and unhandled rejection gating.
   - Formalization: Event loop abstract state machine with microtask drain fixpoint and shared mutable state volatilization.

4. Day 9 (Trial 27): Multi-Package Export/Import Linking Resolution
   - Problem: Transitive re-exports (export * from ..., namespace clashes, default vs named exports) across multi-level library modules.
   - Formalization: Transitive export environment computation and star-export collision detection (mapping to Google V8 kSyntaxError conflicting star exports).

5. Day 10 (Trial 28): Holistic Multi-Component Verification on font-preview-app
   - Problem: Verifying end-to-end full application safety across all 7 .osp components in font-preview-app (main.osp, preview.osp, waterfall.osp, uploader.osp, glyphGrid.osp, controls.osp, fontLoader.osp) with models and utilities.
   - Formalization: Unified cross-component DAG verification, inter-module call summaries, and CustomEvent contract validation.

---

## 2. Mathematical Axiom Additions in AXIOM_FORMULATION.md

- Rule XII: DOM Element Tree Connection & Lifecycle Invariance
- Rule XIII: Structural Subtyping & Sealed Struct Polymorphism
- Rule XIV: Async Generator & Microtask Queue Event Loop Invariance
- Rule XV: Multi-Package Transitive Export/Import Resolution

---

## 3. Verification Protocol

- Maintain 100% PASS rate across all 28 trials (trials 1 to 28).
- Strictly 0 modifications in src/ (production compiler pristine).
- Strictly 0 emojis in all code, comments, logs, and documentation.
