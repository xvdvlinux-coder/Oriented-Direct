# Plan de Trabajo: Día #4 — Laboratorio MathL

**Fecha Programada**: Día #4 del Plan Experimental de 30 Días  
**Objetivo Principal**: Análisis de Cierres Léxicos (*Closures*), Análisis de Escape (*Escape Analysis*) de variables mutables, Inferencia en Funciones de Orden Superior (`.map()`, `.filter()`) y prueba de estrés sobre carga asíncrona de fuentes en `font-preview-app`.

---

## 1. Justificación y Desafíos Matemáticos del Día #4

Tras consolidar en el Día #3 la correspondencia con las 498 plantillas de error en C++ de Google V8, el Día #4 se enfoca en los **tres problemas más complejos de la verificación estática en lenguajes dinámicos**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DESAFÍOS TÉCNICOS DEL DÍA #4                                    │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│  1. Escape Analysis      │  2. Funciones de Orden      │  3. Fronteras Asíncronas      │
│  en Closures y Callbacks │  Superior (.map, .filter)   │  en Carga de Archivos Reales  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Los 3 Pilares Teóricos a Formalizar

### A. Análisis de Escape y Captura de Variables `mut` en Closures
- **Problema**: Cuando una función interna o un callback captura una variable mutable de su ámbito superior:
  ```osp
  mut contador = 0;
  @on(boton, "click", () => {
    contador += 1; // Mutación asíncrona fuera del flujo lineal
  });
  ```
- **Formalización Matemática**:
  - Definir la relación de escape $\text{Escapes}(v, \text{Scope})$.
  - Si una variable $v$ es $\mathbf{mut}$ y se captura dentro de un callback asíncrono, su estado en el retículo debe marcarse con un flag de **Mutación Asíncrona Concurrente**, garantizando que accesos posteriores en el hilo principal no asuman valores estáticos congelados.

### B. Inferencia de Flujo en Funciones de Orden Superior (*Higher-Order Functions*)
- **Problema**: Métodos como `lista.map((x) => x.prop)` transforman colecciones sin tipos manuales.
- **Formalización Matemática**:
  - Modelar la firma abstracta de functores: $\text{Map}: \text{Array}\langle \tau \rangle \times (\tau \to \rho) \to \text{Array}\langle \rho \rangle$.
  - Garantizar que si $\tau$ es $\mathbf{Nullable}$, el analizador exija guardia dentro del callback antes de desreferenciar `x.prop`.

### C. Verificación de Carga de Binarios Asíncronos (Caso Real `fontLoader.osp`)
- **Problema**: La carga de fuentes tipográficas involucra `FileReader`, `readAsArrayBuffer`, `FontFace`, `Promise` y eventos `@on(reader, "load", ...)`.
- **Objetivo**: Probar que el Guardián Dual valida todo el flujo asíncrono de `fontLoader.osp` con **cero excepciones en tiempo de ejecución y cero falsos positivos**.

---

## 3. Batería de Nuevos Ensayos Experimentales (Día #4)

Se programarán 4 nuevos ensayos en `MathL/trials/`:

- **Ensayo #16 (`trial_16_closure_escape_analysis.js`)**:
  - Simula el análisis de escape de variables `mut` capturadas en funciones anónimas y eventos `@on`.
- **Ensayo #17 (`trial_17_higher_order_collection_inference.js`)**:
  - Comprueba la propagación de tipos y nulabilidad a través de transformaciones funcionales (`.map()`, `.filter()`, `.reduce()`).
- **Ensayo #18 (`trial_18_font_loader_async_stress_test.js`)**:
  - Prueba de estrés sobre el archivo real [`src/utils/fontLoader.osp`](file:///c:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/utils/fontLoader.osp), verificando el manejo de `FontFace`, `FileReader` y excepciones en Promesas.
- **Ensayo #19 (`trial_19_aliased_mutation_safety.js`)**:
  - Simula dos referencias compartidas a un mismo objeto de estado mutable, verificando que el analizador rastree mutaciones aliadas sin corrupción de estado.

---

## 4. Entregables del Día #4

1. Documento de formalización del Análisis de Escape en [`MathL/AXIOM_FORMULATION.md`](./AXIOM_FORMULATION.md).
2. Implementación y ejecución de los Ensayos 16, 17, 18 y 19 en `MathL/trials/`.
3. Verificación de la suite acumulada (19 ensayos en total) al 100% de éxito.
4. Mantenimiento del código de producción de `src/` completamente aislado e intacto.
