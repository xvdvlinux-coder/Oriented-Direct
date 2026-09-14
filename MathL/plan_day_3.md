# Plan de Trabajo: Día #3 — Laboratorio MathL

**Fecha Programada**: Día #3 del Plan Experimental de 30 Días  
**Objetivo Principal**: Descarga e ingeniería inversa del código fuente de motores JavaScript (V8 / Node.js / QuickJS) para mapear el origen exacto de todas las excepciones de DevTools en predicados matemáticos de $\mathbf{Axiom}_{\text{Gated-Safety}}$, y ejecución de nuevos ensayos experimentales.

---

## 1. Justificación y Metodología (Día #3)

Para que el Guardián Dual ($\mathcal{J} \times \mathcal{O}$) garantice **cero errores en tiempo de ejecución en la consola de DevTools**, no basta con analizar la teoría: debemos examinar el **código fuente en C++ del propio motor JavaScript** donde se generan los mensajes de error en runtime.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE INVESTIGACIÓN DEL DÍA #3                               │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│  1. Ingesta de Código    │  2. Mapeo de Excepciones    │  3. Formulación de Guardias   │
│  Fuente de Motores JS    │  en C++ hacia MathL         │  en el Axioma Matemático      │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Plan de Descarga y Fuentes de Código de Motores JS

Se descargarán los archivos fuente clave de los repositorios oficiales de **V8 (Google Chrome / Node.js)** y **QuickJS / WebKit**:

1. **V8 `src/common/message-template.h`**:
   - Contiene la tabla completa en C++ de todos los códigos de error del motor V8:
     - `kTypeErrorCannotReadProperty` (`Cannot read properties of %s`)
     - `kTypeErrorNotCallable` (`%s is not a function`)
     - `kTypeErrorCannotAssignToReadOnly` (`Cannot assign to read only property`)
     - `kReferenceErrorNotDefined` (`%s is not defined`)
     - `kReferenceErrorTDZ` (`Cannot access '%s' before initialization`)
     - `kRangeErrorInvalidArrayLength` (`Invalid array length`)

2. **V8 `src/execution/messages.cc` y `src/runtime/runtime-classes.cc`**:
   - Contiene la lógica interna donde V8 detecta violaciones de sellado de objetos (`Object.isSealed`), acceso a variables fuera de ámbito y errores en desestructuración.

3. **V8 `src/objects/elements.cc` & Prototype Lookup Engines**:
   - Código que realiza la búsqueda en la cadena de prototipos y lanza `TypeError` cuando se accede a propiedades en `null` o `undefined`.

---

## 3. Integración en el Axioma Matemático ([`AXIOM_FORMULATION.md`](./AXIOM_FORMULATION.md))

Cada código de error de C++ de V8 se traducirá a un **predicado de guardia formal**:

| Código de Error V8 (C++) | Causa en Runtime de JS | Predicado Formal en $\mathbf{Axiom}_{\text{Gated-Safety}}$ |
| :--- | :--- | :--- |
| `kTypeErrorCannotReadProperty` | Desreferenciación de `null`/`undefined` | $\forall e = o.k \implies \sigma^\sharp(o) \sqsubseteq \mathbf{NonNull}$ |
| `kTypeErrorNotCallable` | Invocación de no-función | $\forall e = f(\vec{a}) \implies \sigma^\sharp(f) \sqsubseteq \text{Func}(n)$ |
| `kTypeErrorCannotAssignToReadOnly` | Reasignación de `val` | $\forall v \in \text{val} \implies \|\text{Assignments}(v)\| = 1$ |
| `kReferenceErrorTDZ` | Acceso previo a declaración | $\forall \text{read}(x) \implies \text{Dominates}(\text{Decl}(x), \text{read}(x))$ |
| `kRangeErrorInvalidArrayLength` | Longitud de array no entera o negativa | $\forall n \in \text{ArrayLen} \implies n \ge 0 \;\land\; n \in \mathbb{Z}$ |

---

## 4. Batería de Nuevos Ensayos Experimentales (Día #3)

Se programarán 4 nuevos ensayos en `MathL/trials/`:

- **Ensayo #12 (`trial_12_v8_message_template_mapper.js`)**:
  - Parsea el archivo C++ `message-template.h` descargado de V8 y valida que el 100% de los códigos de `TypeError` y `ReferenceError` tengan un guardia formal en MathL.
- **Ensayo #13 (`trial_13_prototype_pollution_guard.js`)**:
  - Simula intentos de acceso a `__proto__` o mutación del prototipo global de JavaScript, demostrando que el guardián bloquea la contaminación de prototipos en tiempo de compilación.
- **Ensayo #14 (`trial_14_canvas_webgl_state_invariance.js`)**:
  - Prueba el guardián contra fragmentos avanzados de WebGL y Canvas 2D, verificando aridades y tipos de argumentos contra las firmas de los motores Web.
- **Ensayo #15 (`trial_15_end_to_end_verification_pipeline.js`)**:
  - Pipeline de integración completa que verifica código multifichero (.osp con imports/exports) contra todos los 1.579 símbolos del guardián unificado.

---

## 5. Entregables del Día #3

1. Descarga de los archivos fuente de V8 en `MathL/docs/raw_sources/v8/`.
2. Actualización de [`runtime_error_taxonomy.md`](./docs/runtime_error_taxonomy.md) vinculando cada estado $\mathcal{S}_{\text{err}}$ con el código C++ de V8.
3. Creación y ejecución de los Ensayos 12, 13, 14 y 15 en `MathL/trials/`.
4. Mantenimiento estricto del código de producción en `src/` (100% aislado).
