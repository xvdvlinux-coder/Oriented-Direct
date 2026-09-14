/**
 * MathL: Abstract Interpretation Domain & Lattice Simulator
 * Implements formal lattices, Galois connections, and safety transfer functions.
 */

export const NullState = {
  BOTTOM: 0,   // Unreachable code / impossible state
  NON_NULL: 1, // Guaranteed non-null and non-undefined
  NULLABLE: 2, // May be null or undefined (e.g. from DOM or dynamic JS interop)
  TOP: 3       // Completely unknown
};

export class NullLattice {
  static join(a, b) {
    if (a === NullState.BOTTOM) return b;
    if (b === NullState.BOTTOM) return a;
    if (a === b) return a;
    return NullState.NULLABLE;
  }

  static meet(a, b) {
    if (a === NullState.TOP) return b;
    if (b === NullState.TOP) return a;
    if (a === b) return a;
    return NullState.BOTTOM;
  }

  static isSubtype(sub, sup) {
    if (sub === NullState.BOTTOM) return true;
    if (sup === NullState.TOP) return true;
    return sub === sup;
  }

  static toString(state) {
    switch (state) {
      case NullState.BOTTOM: return '⊥ (Bottom)';
      case NullState.NON_NULL: return 'NonNull';
      case NullState.NULLABLE: return 'Nullable';
      case NullState.TOP: return '⊤ (Top)';
      default: return 'Unknown';
    }
  }
}

export class TypeShape {
  constructor(kind, options = {}) {
    this.kind = kind; // 'Number' | 'String' | 'Boolean' | 'Function' | 'Object' | 'Struct' | 'Null' | 'Undefined' | 'Any'
    this.arity = options.arity ?? null; // for Functions
    this.fields = options.fields ? new Map(Object.entries(options.fields)) : new Map(); // for Objects & Structs
    this.isSealed = options.isSealed ?? false;
    this.nullState = options.nullState ?? (kind === 'Null' || kind === 'Undefined' ? NullState.NULLABLE : NullState.NON_NULL);
  }

  hasField(name) {
    return this.fields.has(name);
  }

  getField(name) {
    return this.fields.get(name);
  }
}

export class AbstractEnvironment {
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = new Map(); // name -> { typeShape, nullState, isVal, isInitialized }
  }

  define(name, typeShape, isVal = true) {
    this.bindings.set(name, {
      typeShape,
      nullState: typeShape.nullState,
      isVal,
      isInitialized: true
    });
  }

  get(name) {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return null;
  }

  refineNullability(name, newState) {
    const entry = this.get(name);
    if (entry) {
      entry.nullState = newState;
    }
  }

  clone() {
    const copy = new AbstractEnvironment(this.parent);
    for (const [k, v] of this.bindings.entries()) {
      copy.bindings.set(k, { ...v });
    }
    return copy;
  }

  static merge(envA, envB) {
    const merged = new AbstractEnvironment(envA.parent);
    const allKeys = new Set([...envA.bindings.keys(), ...envB.bindings.keys()]);
    for (const key of allKeys) {
      const valA = envA.get(key);
      const valB = envB.get(key);
      if (valA && valB) {
        merged.bindings.set(key, {
          typeShape: valA.typeShape,
          nullState: NullLattice.join(valA.nullState, valB.nullState),
          isVal: valA.isVal && valB.isVal,
          isInitialized: valA.isInitialized && valB.isInitialized
        });
      }
    }
    return merged;
  }
}
