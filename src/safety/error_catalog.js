/**
 * Oriented-Direct (ospc) Safety Subsystem - Error Catalog & Taxonomy
 * Complete catalog of compile-time gated safety error codes (E0001 - E0030)
 * Formalized from the 30 MathL Axiomatic Safety Rules and mapped 1:1 to Google V8 C++ error templates.
 * Version: 2.0.0 (ClandleLoop)
 * Strictly zero emojis.
 */

export const SAFETY_ERROR_CATALOG = Object.freeze({
  E0001: Object.freeze({
    code: 'E0001',
    rule: 'Rule I',
    name: 'StrictMemberAccess',
    title: 'Strict Member Access Invariant Violation',
    v8Template: 'NonObjectPropertyLoadWithProperty',
    v8Format: "Cannot read properties of % (reading '%')",
    rustEquivalent: 'Null pointer dereference / Option unwrapping failure',
    defaultMessage: "Variable may be null or undefined at member dereference.",
    notes: [
      'MathL Rule I: Member access requires target in NonNull lattice',
      'Matches Google V8 template kUndefinedOrNullToObject / NonObjectPropertyLoadWithProperty'
    ],
    hints: [
      "Guard the expression with 'unless (target) return;' or 'if (!target) return;' prior to dereference.",
      "Use optional chaining '?.' or null coalescing '??' if a fallback exists."
    ]
  }),

  E0002: Object.freeze({
    code: 'E0002',
    rule: 'Rule II',
    name: 'UnrefinedFlowGuard',
    title: 'Flow Guard Refinement Failure',
    v8Template: 'NonCoercible',
    v8Format: "Cannot coerce nullable value to non-null object",
    rustEquivalent: 'Type narrowing failure across branches',
    defaultMessage: "Control flow branch did not properly narrow nullable state.",
    notes: [
      'MathL Rule II: Flow guards must apply meet operator (lattice meet NonNull) on the execution path'
    ],
    hints: [
      "Ensure branch conditions terminate early via return, break, or throw."
    ]
  }),

  E0003: Object.freeze({
    code: 'E0003',
    rule: 'Rule III',
    name: 'DirectCallArityMismatch',
    title: 'Direct Call Arity Invariant Violation',
    v8Template: 'WrongNumberOfArguments',
    v8Format: "%: wrong number of arguments (expected %, got %)",
    rustEquivalent: 'Function call argument count mismatch',
    defaultMessage: "Function call arity mismatch.",
    notes: [
      'MathL Rule III: Direct call arity must strictly match formal parameter count',
      'Matches Google V8 template kWrongNumberOfArguments'
    ],
    hints: [
      "Check the target function declaration and provide the exact required parameter count."
    ]
  }),

  E0004: Object.freeze({
    code: 'E0004',
    rule: 'Rule IV',
    name: 'NonExhaustiveMatch',
    title: 'Match Expression Exhaustiveness Invariant Violation',
    v8Template: 'NonExhaustiveMatch',
    v8Format: "Non-exhaustive pattern match: missing default branch",
    rustEquivalent: 'E0004: non-exhaustive patterns in match expression',
    defaultMessage: "Match statement is non-exhaustive and lacks a default branch.",
    notes: [
      'MathL Rule IV: Match expressions must partition the complete value domain or provide default',
      'Prevents unhandled runtime branching states'
    ],
    hints: [
      "Add a 'default => ...' case to handle remaining domain values."
    ]
  }),

  E0005: Object.freeze({
    code: 'E0005',
    rule: 'Rule V',
    name: 'ArithmeticNaNLeak',
    title: 'Arithmetic Operation Produces NaN',
    v8Template: 'NonCoercible',
    v8Format: "Cannot perform arithmetic on undefined operand",
    rustEquivalent: 'Arithmetic on uninitialized / undefined state',
    defaultMessage: "Arithmetic operation with undefined operand produces NaN.",
    notes: [
      'MathL Rule V: Arithmetic operators (+, -, *, /) require operands in Number domain',
      'Matches Google V8 template kNonCoercible / arithmetic NaN leak'
    ],
    hints: [
      "Ensure all arithmetic operands are verified non-null and numeric prior to calculation."
    ]
  }),

  E0006: Object.freeze({
    code: 'E0006',
    rule: 'Rule VI',
    name: 'ClosureEscapeVolatility',
    title: 'Closure Escape for Mutable State Invariant Violation',
    v8Template: 'AccessedUninitializedVariable',
    v8Format: "Closure captures mutable variable escaping local lexical lifetime",
    rustEquivalent: 'Borrow across closure escape without move / mutable alias escape',
    defaultMessage: "Mutable variable captured in escaping closure creates data-race hazard.",
    notes: [
      'MathL Rule VI: Variables declared with mut captured by escaping closures are marked volatile',
      'Prevents stale asynchronous reads across event-loop yields'
    ],
    hints: [
      "Declare the binding with 'val' or clone the state before passing into asynchronous callbacks."
    ]
  }),

  E0007: Object.freeze({
    code: 'E0007',
    rule: 'Rule VII',
    name: 'HigherOrderFunctorViolation',
    title: 'Higher-Order Functor Collection Invariant Violation',
    v8Template: 'CalledNonCallable',
    v8Format: "% is not a function in collection transformation",
    rustEquivalent: 'Iterator closure trait mismatch (FnMut / Fn)',
    defaultMessage: "Higher-order collection functor called with invalid callback signature.",
    notes: [
      'MathL Rule VII: Functors (map, filter, reduce) require valid callable handlers'
    ],
    hints: [
      "Provide a valid lambda or function reference compatible with the collection element type."
    ]
  }),

  E0008: Object.freeze({
    code: 'E0008',
    rule: 'Rule VIII',
    name: 'ImmutableReassignmentOrInfiniteLoop',
    title: 'Immutable Binding Reassignment or Loop Non-Termination',
    v8Template: 'ConstAssign',
    v8Format: "Assignment to constant variable.",
    rustEquivalent: 'Cannot assign twice to immutable variable',
    defaultMessage: "Attempted reassignment of immutable binding or loop non-termination.",
    notes: [
      'MathL Rule VIII: Val bindings are single-assignment; loops require convergence criteria',
      'Matches Google V8 template kConstAssign / kStrictReadOnlyProperty'
    ],
    hints: [
      "Declare the variable as 'mut' if reassignment is intended.",
      "Add a break condition or return statement inside while loops to ensure termination."
    ]
  }),

  E0009: Object.freeze({
    code: 'E0009',
    rule: 'Rule IX',
    name: 'InterproceduralSummaryMismatch',
    title: 'Interprocedural Call Contract Mismatch',
    v8Template: 'TypeMismatch',
    v8Format: "Interprocedural argument type mismatch",
    rustEquivalent: 'Function signature contract violation across translation units',
    defaultMessage: "Call site violates memoized interprocedural summary contract.",
    notes: [
      'MathL Rule IX: Call signatures must conform to the target module summary interface'
    ],
    hints: [
      "Align call site arguments with the exported function interface summary."
    ]
  }),

  E0010: Object.freeze({
    code: 'E0010',
    rule: 'Rule X',
    name: 'CustomEventPayloadMismatch',
    title: 'Custom Event Contract Invariance Violation',
    v8Template: 'InvalidEventTarget',
    v8Format: "CustomEvent detail payload does not match listener contract",
    rustEquivalent: 'Event channel message payload type mismatch',
    defaultMessage: "Custom event payload detail does not conform to listener expectations.",
    notes: [
      'MathL Rule X: Event detail schemas must satisfy listener contract expectations'
    ],
    hints: [
      "Check the emitted detail schema against expected listener properties."
    ]
  }),

  E0011: Object.freeze({
    code: 'E0011',
    rule: 'Rule XI',
    name: 'CyclicModuleDependency',
    title: 'Module Dependency Directed Acyclic Graph Violation',
    v8Template: 'CyclicModuleDependency',
    v8Format: "Circular dependency detected between modules",
    rustEquivalent: 'Circular crate / module dependency cycle',
    defaultMessage: "Circular dependency detected between compilation modules.",
    notes: [
      'MathL Rule XI: Module dependency graph must remain strictly acyclic',
      'Matches Google V8 template kCyclicModuleDependency'
    ],
    hints: [
      "Extract shared interfaces or structures into a common independent module."
    ]
  }),

  E0012: Object.freeze({
    code: 'E0012',
    rule: 'Rule XII',
    name: 'DetachedDOMNodeDereference',
    title: 'Detached DOM Element Lifecycle Invariant Violation',
    v8Template: 'DetachedNodeDereference',
    v8Format: "Cannot perform layout measurement or focus on detached DOM node",
    rustEquivalent: 'Use-after-free / detached resource dereference',
    defaultMessage: "Attempted layout measurement or focus on detached DOM element.",
    notes: [
      'MathL Rule XII: DOM elements must be connected to document tree for layout operations',
      'Prevents memory leaks in Blink / V8 and zero-rect layout anomalies'
    ],
    hints: [
      "Append the element to the document tree before calling getBoundingClientRect or focus."
    ]
  }),

  E0013: Object.freeze({
    code: 'E0013',
    rule: 'Rule XIII',
    name: 'SealedStructOrPrototypeViolation',
    title: 'Sealed Struct Invariant or Prototype Pollution Guard',
    v8Template: 'CannotAddPropertyToSealedStruct',
    v8Format: "Cannot add property %, object is not extensible / sealed",
    rustEquivalent: 'Struct field does not exist / prototype tampering prevented',
    defaultMessage: "Attempted assignment of unlisted property to sealed struct or prototype pollution.",
    notes: [
      'MathL Rule XIII: Struct instances are sealed (Object.seal); __proto__ access is strictly forbidden',
      'Matches Google V8 template kCannotAddPropertyToSealedStruct / kImmutablePrototypeSet'
    ],
    hints: [
      "Declare the field in the struct definition or use an unsealed object literal.",
      "Do not access or mutate '__proto__' or 'prototype' directly."
    ]
  }),

  E0014: Object.freeze({
    code: 'E0014',
    rule: 'Rule XIV',
    name: 'UnhandledAsyncMicrotaskRejection',
    title: 'Async Event Loop & Microtask Queue Invariant Violation',
    v8Template: 'UnhandledPromiseRejection',
    v8Format: "Unhandled promise rejection in asynchronous task",
    rustEquivalent: 'Unconsumed Future / unhandled Result::Err',
    defaultMessage: "Asynchronous task or promise lacks rejection handler.",
    notes: [
      'MathL Rule XIV: Microtask drains require rejection handlers on fallible async paths',
      'Matches Google V8 template kUnhandledPromiseRejection'
    ],
    hints: [
      "Wrap await calls in a try-catch block or attach a '.catch()' handler."
    ]
  }),

  E0015: Object.freeze({
    code: 'E0015',
    rule: 'Rule XV',
    name: 'StarExportLinkingConflict',
    title: 'Multi-Package Export Linking Resolution Collision',
    v8Template: 'ConflictingStarExports',
    v8Format: "The requested module contains conflicting star exports for name '%'",
    rustEquivalent: 'Ambiguous glob import symbol conflict',
    defaultMessage: "Conflicting star-exports or unresolved import specifier.",
    notes: [
      'MathL Rule XV: Transitive export environment must resolve symbols unambiguously',
      'Matches Google V8 template kConflictingStarExports / kModuleDoesNotProvideExport'
    ],
    hints: [
      "Explicitly re-export or alias the conflicting identifier to resolve ambiguity."
    ]
  }),

  E0016: Object.freeze({
    code: 'E0016',
    rule: 'Rule XVI',
    name: 'TypedArrayBufferDetachment',
    title: 'TypedArray Detachment or Out-Of-Bounds Memory Invariant Violation',
    v8Template: 'TypedArrayDetachedErrorOperation',
    v8Format: "Cannot perform % on a detached ArrayBuffer",
    rustEquivalent: 'Buffer use-after-free or out-of-bounds slice access',
    defaultMessage: "Cannot operate on detached ArrayBuffer or access out-of-bounds index.",
    notes: [
      'MathL Rule XVI: Buffer detachment lattice prevents operations on transferred buffers',
      'Matches Google V8 template kTypedArrayDetachedErrorOperation / kTypedArrayOOBErrorOperation'
    ],
    hints: [
      "Verify buffer attachment status before constructing views or reading data.",
      "Check view bounds (index < length) prior to indexing."
    ]
  }),

  E0017: Object.freeze({
    code: 'E0017',
    rule: 'Rule XVII',
    name: 'InfiniteDOMMutationCascade',
    title: 'Reactive DOM Mutation Cascade Invariant Violation',
    v8Template: 'InfiniteDOMMutationCascade',
    v8Format: "Synchronous DOM mutation observer triggers infinite recursive cascade",
    rustEquivalent: 'Unbounded recursive mutation loop',
    defaultMessage: "MutationObserver callback synchronously mutates observed subtree without exit condition.",
    notes: [
      'MathL Rule XVII: Observer callbacks must terminate mutation cascades',
      'Prevents browser UI thread freezes and call-stack overflow'
    ],
    hints: [
      "Disconnect the observer during mutations or add a depth-bounding guard."
    ]
  }),

  E0018: Object.freeze({
    code: 'E0018',
    rule: 'Rule XVIII',
    name: 'ReactiveSignalDependencyCycle',
    title: 'Reactive Signal Dependency Cycle Invariant Violation',
    v8Template: 'ReactiveDependencyCycle',
    v8Format: "Cyclic dependency detected in reactive signal graph",
    rustEquivalent: 'Cyclic reference graph in reactive computation',
    defaultMessage: "Cyclic dependency detected in reactive signal dependency graph.",
    notes: [
      'MathL Rule XVIII: Reactive signal graphs must be strictly acyclic directed graphs',
      'Prevents infinite update loops in reactive state engines'
    ],
    hints: [
      "Break the cycle by separating the computed signal from direct mutation side-effects."
    ]
  }),

  E0019: Object.freeze({
    code: 'E0019',
    rule: 'Rule XIX',
    name: 'UncloneableCrossThreadPayload',
    title: 'Structured Clone Cross-Thread FFI Invariant Violation',
    v8Template: 'DataCloneError',
    v8Format: "Cannot postMessage uncloneable object across thread boundary",
    rustEquivalent: 'Send / Sync trait violation for cross-thread data transfer',
    defaultMessage: "Attempted to transfer uncloneable object across thread boundary.",
    notes: [
      'MathL Rule XIX: PostMessage payloads must belong to Cloneable / Transferable lattice',
      'Matches Google V8 template kDataCloneError / kCircularStructure'
    ],
    hints: [
      "Remove functions, DOM elements, or circular references prior to calling postMessage."
    ]
  }),

  E0020: Object.freeze({
    code: 'E0020',
    rule: 'Rule XX',
    name: 'CrossEngineConformanceFault',
    title: 'Multi-Engine Runtime Conformance Invariant Discrepancy',
    v8Template: 'CrossEngineTaxonomyDiscrepancy',
    v8Format: "Behavior deviates from cross-engine portable safety semantics",
    rustEquivalent: 'Architecture-specific undefined behavior discrepancy',
    defaultMessage: "Construct produces non-conforming runtime behavior across target JS engines.",
    notes: [
      'MathL Rule XX: Abstract state must conservatively enclose V8, WebKit, and SpiderMonkey semantics'
    ],
    hints: [
      "Use standard portable ECMAScript constructs."
    ]
  }),

  E0021: Object.freeze({
    code: 'E0021',
    rule: 'Rule XXI',
    name: 'UseAfterDispose',
    title: 'Explicit Resource Management Lifecycle Invariant Violation',
    v8Template: 'DisposableStackIsDisposed',
    v8Format: "Cannot call % on an already-disposed DisposableStack",
    rustEquivalent: 'Use-after-free / access after Drop',
    defaultMessage: "Attempted access to resource after stack disposal.",
    notes: [
      'MathL Rule XXI: DisposableStack resources follow linear active-to-disposed lifecycle',
      'Matches Google V8 template kDisposableStackIsDisposed'
    ],
    hints: [
      "Ensure all resource accesses occur before scope exit or explicit stack disposal."
    ]
  }),

  E0022: Object.freeze({
    code: 'E0022',
    rule: 'Rule XXII',
    name: 'UnalignedWasmMemoryAccess',
    title: 'WebAssembly / C-ABI Memory Alignment Invariant Violation',
    v8Template: 'UnalignedMemoryAccess',
    v8Format: "Pointer % is not aligned to natural struct boundary %",
    rustEquivalent: 'Misaligned raw pointer dereference',
    defaultMessage: "Unaligned memory pointer access or buffer overrun in C-ABI struct marshalling.",
    notes: [
      'MathL Rule XXII: Pointers into raw memory buffers must satisfy natural byte alignment',
      'Prevents WebAssembly trap instructions and GPU vertex buffer corruption'
    ],
    hints: [
      "Align struct offsets to natural word boundaries (multiples of 2, 4, or 8 bytes)."
    ]
  }),

  E0023: Object.freeze({
    code: 'E0023',
    rule: 'Rule XXIII',
    name: 'UnguardedExperimentalWebAPI',
    title: 'Dynamic Feature Detection Gating Invariant Violation',
    v8Template: 'CannotReadPropertyOfUndefined',
    v8Format: "Cannot read properties of undefined (reading '%')",
    rustEquivalent: 'Unchecked platform feature access without cfg attribute',
    defaultMessage: "Experimental Web API invoked without feature detection guard.",
    notes: [
      'MathL Rule XXIII: WebGPU, WebAudio, and modern APIs require flow-sensitive feature checks',
      'Prevents immediate runtime TypeErrors in clients without hardware / flag support'
    ],
    hints: [
      "Guard access with 'if ('gpu' in navigator) { ... } else { ... }'."
    ]
  }),

  E0024: Object.freeze({
    code: 'E0024',
    rule: 'Rule XXIV',
    name: 'DeepImmutableFreezeMutation',
    title: 'Deep Immutability Freeze Invariant Violation',
    v8Template: 'StrictReadOnlyProperty',
    v8Format: "Cannot assign to read only property '%' of object '%'",
    rustEquivalent: 'Mutation of immutable reference (&T)',
    defaultMessage: "Attempted property mutation on deep-frozen immutable object graph.",
    notes: [
      'MathL Rule XXIV: Deeply frozen structures reject property mutation at compile-time',
      'Matches Google V8 template kStrictReadOnlyProperty / kCannotFreezeArrayBufferView'
    ],
    hints: [
      "Perform shallow/deep cloning before mutating properties on frozen state."
    ]
  }),

  E0025: Object.freeze({
    code: 'E0025',
    rule: 'Rule XXV',
    name: 'IncrementalCacheStateDrift',
    title: 'Incremental Analysis Cache State Invalidation Drift',
    v8Template: 'IncrementalStateDrift',
    v8Format: "Incremental analysis cache entry drifted from source hash",
    rustEquivalent: 'Incremental compilation cache invalidation mismatch',
    defaultMessage: "Incremental cache entry inconsistent with dependency interface signatures.",
    notes: [
      'MathL Rule XXV: Incremental cache updates must preserve whole-program fixed point'
    ],
    hints: [
      "Clean cache via 'ospc build --clean' if persistent drift occurs."
    ]
  }),

  E0026: Object.freeze({
    code: 'E0026',
    rule: 'Rule XXVI',
    name: 'CrossRealmObjectLeak',
    title: 'Sandboxed Realm Boundary Security Invariant Violation',
    v8Template: 'CallSiteMethodCrossedShadowRealmBoundary',
    v8Format: "Cannot pass non-primitive value across ShadowRealm boundary",
    rustEquivalent: 'FFI boundary memory isolation breach',
    defaultMessage: "Attempted to pass raw object across sandboxed realm boundary without membrane wrap.",
    notes: [
      'MathL Rule XXVI: Realm boundaries only admit primitives and membrane-wrapped callables',
      'Matches Google V8 template kCallSiteMethodCrossedShadowRealmBoundary'
    ],
    hints: [
      "Serialize data to JSON primitives or wrap functions in callable membranes."
    ]
  }),

  E0027: Object.freeze({
    code: 'E0027',
    rule: 'Rule XXVII',
    name: 'NonCoerciblePatternDestructure',
    title: 'Pattern Destructuring Coercibility Invariant Violation',
    v8Template: 'NonCoercible',
    v8Format: "Cannot destructure '%' as it is %",
    rustEquivalent: 'Destructuring pattern match on potentially None / Err without guard',
    defaultMessage: "Cannot destructure nullable or non-iterable target without flow guard.",
    notes: [
      'MathL Rule XXVII: Destructuring targets must be proven CoercibleObject or CoercibleIterable',
      'Matches Google V8 template kNonCoercible / kNonCoercibleWithProperty / kNonIterable'
    ],
    hints: [
      "Guard the target with 'unless (target) return;' prior to destructuring.",
      "Provide default values in pattern: val { x = 0 } = target."
    ]
  }),

  E0028: Object.freeze({
    code: 'E0028',
    rule: 'Rule XXVIII',
    name: 'TemporalDeadZoneOrUndeclared',
    title: 'Temporal Dead Zone (TDZ) Dominance or Undeclared Identifier',
    v8Template: 'AccessedUninitializedVariable',
    v8Format: "Cannot access '%' before initialization",
    rustEquivalent: 'Use of uninitialized variable / identifier not in scope',
    defaultMessage: "Lexical identifier referenced before initialization or undeclared in scope.",
    notes: [
      'MathL Rule XXVIII: Lexical references must be strictly dominated by variable initialization',
      'Matches Google V8 template kAccessedUninitializedVariable / kNotDefined'
    ],
    hints: [
      "Move variable declaration before the first reference in the block scope.",
      "Ensure the identifier is declared with 'val' or 'mut'."
    ]
  }),

  E0029: Object.freeze({
    code: 'E0029',
    rule: 'Rule XXIX',
    name: 'CircularErrorCauseChain',
    title: 'Exception Hierarchy & Cause Chaining Acyclicity Violation',
    v8Template: 'CircularStructure',
    v8Format: "Circular reference in value argument not supported in error causes",
    rustEquivalent: 'Recursive error source loop in std::error::Error::source',
    defaultMessage: "Circular reference detected in Error.cause exception chain.",
    notes: [
      'MathL Rule XXIX: Error cause graphs must be strictly acyclic',
      'Matches Google V8 template kCircularStructure / kAggregateError'
    ],
    hints: [
      "Break circular causality by referencing independent error instances."
    ]
  }),

  E0030: Object.freeze({
    code: 'E0030',
    rule: 'Rule XXX',
    name: 'InvalidCLIOption',
    title: 'Compiler CLI Flag Gating Specification Violation',
    v8Template: 'InvalidCLIOption',
    v8Format: "Invalid configuration option value for compile-time safety gating",
    rustEquivalent: 'Invalid rustc compiler flag / codegen option',
    defaultMessage: "CLI flag assignment violates safety configuration lattice domain.",
    notes: [
      'MathL Rule XXX: Compiler configuration must satisfy monotonic safety lattice domains'
    ],
    hints: [
      "Check 'ospc --help' for valid CLI flag arguments."
    ]
  })
});

/**
 * Lookup diagnostic entry from catalog
 * @param {string} code
 * @returns {object|null}
 */
export function getCatalogEntry(code) {
  return SAFETY_ERROR_CATALOG[code] || null;
}
