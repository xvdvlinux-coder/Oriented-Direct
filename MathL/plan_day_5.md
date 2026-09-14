# Plan de Trabajo: Día #5 — Laboratorio MathL

**Fecha**: Día #5 del Plan Experimental de 30 Días  
**Objetivo Principal**: Análisis Interprocedimental (Resúmenes de Función $\mathcal{F}^\sharp$), Contratos de Eventos Reactivos (`@emit` / `@on`), Detección de Dependencias Circulares en Módulos y Verificación del Componente de UI Completo `controls.osp`.

---

## 1. Justificación y Desafíos Matemáticos del Día #5

El Día #5 aborda la interacción entre **múltiples funciones y módulos a escala de aplicación completa**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DESAFÍOS TÉCNICOS DEL DÍA #5                                    │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│  1. Resúmenes de         │  2. Contratos de Eventos    │  3. Detección de Ciclos       │
│  Función Interprocedural │  Reactivos (@emit / @on)    │  de Importación (Anti-TDZ)    │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Los 3 Pilares Teóricos a Formalizar

### A. Resúmenes de Función Interprocedimentales ($\mathcal{F}^\sharp$)
- En lugar de re-analizar el cuerpo de una función en cada llamada, el analizador calcula un **resumen funcional abstracto**:
  $$\mathcal{F}^\sharp: \mathcal{D}^\sharp_{\text{params}} \longrightarrow \mathcal{D}^\sharp_{\text{return}}$$
- Permite verificar llamadas complejas entre módulos con complejidad $\mathcal{O}(V + E)$ en lugar de tiempo exponencial.

### B. Contratos de Eventos Reactivos del DOM (`@emit` / `@on`)
- En aplicaciones interactivas de frontend, los componentes se comunican mediante eventos:
  $$\text{EventContract}(\text{type}) = \Sigma_{\text{detail}}$$
- El guardián verifica que el objeto emitido con `@emit(target, "update", payload)` coincida exactamente con lo que el callback en `@on(target, "update", (e) => ...)` espera leer en `e.detail`.

### C. Invariante de Grafo Acíclico de Módulos ($\text{Acyclic}(\mathcal{G}_{\text{Modules}})$)
- Mapea el error de V8 `kCyclicModuleDependency` (`Detected cycle while resolving name '%' in '%'`).
- El analizador construye el grafo de dependencias de `import` y demuestra que es un DAG (Grafo Acíclico Dirigido), evitando excepciones en tiempo de carga por TDZ circular.

---

## 3. Batería de Nuevos Ensayos Experimentales (Día #5)

- **Ensayo #20 (`trial_20_interprocedural_call_summaries.js`)**:
  - Inferencia y aplicación de resúmenes de función entre módulos sin inlining recursivo.
- **Ensayo #21 (`trial_21_custom_event_payload_contract.js`)**:
  - Validación de contratos estáticos entre emisores de eventos personalizados (`@emit`) y receptores (`@on`).
- **Ensayo #22 (`trial_22_circular_dependency_tdz_guard.js`)**:
  - Detección de ciclos de importación circular en tiempo de compilación para prevenir fallos de inicialización en V8.
- **Ensayo #23 (`trial_23_full_component_stress_test.js`)**:
  - Análisis completo del componente de interfaz gráfica [`src/components/controls.osp`](file:///c:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/scratch/font-preview-app/src/components/controls.osp) (138 líneas de DOM, sliders, eventos y estado).

---

## 4. Entregables del Día #5

1. Actualización de [`MathL/AXIOM_FORMULATION.md`](./AXIOM_FORMULATION.md) con las Reglas IX, X y XI.
2. Implementación y ejecución de los Ensayos 20, 21, 22 y 23 en `MathL/trials/`.
3. Verificación de la suite acumulada (23 ensayos en total) al 100% de éxito.
4. Mantenimiento estricto del aislamiento de `src/` (código de producción intacto).
