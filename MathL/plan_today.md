# Plan de Trabajo: Día #2 — Laboratorio MathL

**Fecha**: Día #2 del Plan Experimental de 30 Días  
**Objetivo Principal**: Refactorización y formalización matemática avanzada del Axioma de Seguridad ($\mathbf{Axiom}_{\text{Gated-Safety}}$), diseño de operadores de ensanchamiento (*Widening* $\nabla$) para bucles y nuevos ensayos de verificación interprocedimental.

---

## 1. Metas Matemáticas y Teóricas del Día #2

1. **Refinamiento Formal de la Conexión de Galois $(\alpha, \gamma)$**:
   - Definir formalmente la función de abstracción $\alpha: \mathcal{P}(\mathcal{S}) \to \mathcal{S}^\sharp$ que proyecta los estados dinámicos de JavaScript y Oriented-Direct al retículo abstracto.
   - Definir la función de concreción $\gamma: \mathcal{S}^\sharp \to \mathcal{P}(\mathcal{S})$ y demostrar la monotonía:
     $$\forall s \in \mathcal{S}, \quad s \in \gamma(\alpha(\{s\}))$$

2. **Operador de Ensanchamiento y Puntos Fijos en Bucles (*Widening* $\nabla$)**:
   - Modelar la convergencia matemática en bucles `for`, `while` y `loop` para evitar bucles infinitos en el analizador durante la inferencia de tipos y nulabilidad.
   - Garantizar que las variables mutadas dentro de un bucle alcancen un punto fijo abstracto ($\text{lfp}(F^\sharp)$) en tiempo finito.

3. **Formalización de Particiones de Dominio en `match`**:
   - Definir el algoritmo de partición exhaustiva para expresiones `match` sobre literales, rangos numéricos y variantes de estado.

---

## 2. Batería de Ensayos Experimentales Planificados (Día #2)

- **Ensayo #08 (`trial_08_loop_fixpoint_widening.js`)**:
  - Simulación de análisis de punto fijo sobre bucles con variables mutables (`mut`), comprobando que el estado abstracto converge de forma segura sin sobreaproximación excesiva.
- **Ensayo #09 (`trial_09_match_exhaustiveness_verifier.js`)**:
  - Verificación matemática de exhaustividad en expresiones `match`, bloqueando casos donde un valor potencial del dominio quede sin cubrir y sin rama `default`.
- **Ensayo #10 (`trial_10_async_promise_safety.js`)**:
  - Verificación de límites asíncronos (`async` / `await` y llamadas que pueden lanzar excepciones como `JSON.parse` o `fetch`), garantizando que estén envueltas en bloques `try / catch`.

---

## 3. Entregables del Día #2

1. Actualización de [`AXIOM_FORMULATION.md`](file:///c:/Users/Emmanuel/Documents/WebApp/MathL/AXIOM_FORMULATION.md) con la formalización de la Conexión de Galois y el operador $\nabla$.
2. Implementación de los ensayos 8, 9 y 10 en `MathL/trials/`.
3. Verificación del modelo dual contra fragmentos reales del proyecto showcase ([`font-preview-app`](https://github.com/xvdvlinux-coder/font-preview-app)).
4. Mantenimiento estricto del código de producción en `src/` (100% intacto, todo confinado a `MathL/`).
