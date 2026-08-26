<p align="center">
  <img src="assets/logo.svg" width="130" height="130" alt="Oriented-Direct Logo" />
</p>

<h1 align="center">Oriented-Direct (<code>.osp</code>)</h1>

<p align="center">
  <strong>An unambiguous, ultra-direct programming language that transpiles, bundles, and serves modern JavaScript applications.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@xvdxlinux/oriented-direct"><img src="https://img.shields.io/npm/v/@xvdxlinux/oriented-direct?style=flat-square&color=00f5ff" alt="npm version" /></a>
  <a href="https://github.com/xvdvlinux-coder/Oriented-Direct/actions/workflows/ci.yml"><img src="https://github.com/xvdvlinux-coder/Oriented-Direct/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/xvdvlinux-coder/Oriented-Direct/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="Node.js: >=18" /></a>
  <img src="https://img.shields.io/badge/tests-21%20passing-success.svg?style=flat-square" alt="Tests: 21 Passing" />
</p>

---

## Language Selection / Selección de Idioma
- [English Documentation](#english-documentation)
- [Documentación en Castellano](#documentación-en-castellano)
- [Official GitHub Wiki](https://github.com/xvdvlinux-coder/Oriented-Direct/wiki)

---

# English Documentation

## Quick Start

```bash
# Install globally via npm
npm install -g @xvdxlinux/oriented-direct

# Start local development server with live reload & network IP
ospc dev

# Or run instantly with npx (zero installation):
npx @xvdxlinux/oriented-direct dev
```

---

## 1. Introduction & Highlights
**Oriented-Direct** (`.osp`) is a modern programming language engineered to eliminate ambiguities, verbosity, and historical baggage from JavaScript and TypeScript.

### Key Highlights:
1. **Built-in Local Development Server (`ospc dev`)**:
   - Run `ospc dev` (or `ospc --dev` / `ospc serve`) to build, bundle, copy static assets, and start a zero-dependency local HTTP server at `http://localhost:3000` with automatic re-compilation on file changes.
2. **Multi-Module Development & Built-in Bundler**:
   - Write modular code across multiple `.osp` files (`import { Button } from "./components/Button.osp"`).
   - Bundle an entire multi-file project into a single, monolithic `.js` file with zero external bundlers required.
3. **Project Configuration via `package.json` / `osp.json`**:
   - Configure entry points, output directories, bundling modes, dev server port, and assets directly in your `package.json`. Run `ospc build` or `ospc dev` without memorizing parameters.
4. **Clean Separation of Concerns (`--public`)**:
   - Automatically compile/bundle source code from `src/` to a dedicated distribution folder (`public/`), copying `index.html`, `.css` stylesheets, and static assets into place.
5. **Direct Browser & DOM Directives**:
   - Direct DOM keywords: `@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`, `@warn`, `@error`.
6. **Elimination of Ambiguity & Free Identifiers**:
   - Variables are strictly **`val`** (immutable) or **`mut`** (mutable).
   - Common words like `info`, `log`, `warn`, `error`, `data` are free to use as variables (`val info = @attr(...)`).
   - Universal strict equality: `==` and `!=` transpile to `===` and `!==`.
7. **Flexible Loops & Sealed Structs**:
   - 3-part C-style loops (`for (mut x = 0; x < width; x += 40)`), numeric ranges (`for (val i in 0..100 step 10)`), iterables (`for (val item in list)`).
   - `struct` generates constructors and runtime property protection via `Object.seal`.
8. **High-Precision Source Maps (`.map`)**:
   - Native Base64-VLQ coordinate tracking with running differential deltas and `sourcesContent` embedding.
   - Maps DevTools breakpoints, stack traces, and console messages directly to `.osp` source lines in real-time.
   - Enabled by default in `ospc dev` mode and configurable via `-s, --sourcemap [inline|external]`.

---

## 2. Syntax Reference

### 2.1 Variables & Mutability
| Oriented-Direct (`.osp`) | Transpiled JavaScript (`.js`) | Description |
| :--- | :--- | :--- |
| `val name = "Alice";` | `const name = "Alice";` | Immutable binding |
| `mut counter = 0;` | `let counter = 0;` | Mutable binding |
| `val info = @attr(el, "data-id");` | `const info = $attr(el, "data-id");` | Unrestricted common variable identifiers |

### 2.2 Equality & Logical Operators
| Oriented-Direct (`.osp`) | Transpiled JavaScript (`.js`) | Description |
| :--- | :--- | :--- |
| `a == b` or `a is b` | `(a === b)` | Strict equality |
| `a != b` or `a is not b` | `(a !== b)` | Strict inequality |
| `a and b` | `(a && b)` | Logical AND |
| `a or b` | `(a || b)` | Logical OR |
| `not a` | `!(a)` | Logical NOT |
| `a ?? b` | `a ?? b` | Nullish coalescing |
| `a?.b` | `a?.b` | Optional chaining |

### 2.3 Direct DOM & Browser Directives
| Directive | JavaScript Equivalent | Purpose |
| :--- | :--- | :--- |
| `@doc` | `document` | Direct reference to DOM document |
| `@win` | `window` | Direct reference to window |
| `@find(selector, parent?)` | `document.querySelector(selector)` | Query single DOM element |
| `@all(selector, parent?)` | `Array.from(document.querySelectorAll(selector))` | Query all matching DOM elements |
| `@id(elementId)` | `document.getElementById(elementId)` | Direct get element by ID |
| `@on(target, event, fn)` | `target.addEventListener(event, fn)` | Event listener attachment |
| `@off(target, event, fn)` | `target.removeEventListener(event, fn)` | Event listener removal |
| `@emit(target, event, data)` | `target.dispatchEvent(new CustomEvent(...))` | Dispatch custom events |
| `@create(tag, attrs, ...children)` | `document.createElement(...)` | Declarative element creation |
| `@html(target, htmlString?)` | `target.innerHTML` getter / setter | Set or get innerHTML |
| `@text(target, textString?)` | `target.textContent` getter / setter | Set or get textContent |
| `@css(target, styleObject)` | `Object.assign(target.style, styleObject)` | Apply CSS styles directly |
| `@attr(target, key, val?)` | `target.setAttribute / getAttribute` | Set or get HTML attributes |
| `@val(target, value?)` | `target.value` getter / setter | Set or get input values |
| `@log(...)` | `console.log(...)` | Direct console logging |
| `@info(...)` | `console.info(...)` | Direct console info logging |
| `@warn(...)` | `console.warn(...)` | Direct console warning |
| `@error(...)` | `console.error(...)` | Direct console error |

---

## 3. Project Configuration (`package.json` / `osp.json`)

Define build & server settings inside your `package.json` under `"osp"`:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "osp": {
    "entry": "src/main.osp",
    "outDir": "public",
    "outFile": "app.js",
    "bundle": true,
    "port": 3000,
    "assets": ["index.html", "*.css", "images/**/*"]
  }
}
```

---

## 4. CLI Compiler, Bundler & Dev Server (`ospc`)

### Installation / Setup:

```bash
# 1. Global installation via npm (recommended):
npm install -g @xvdxlinux/oriented-direct

# 2. Or run instantly with npx (zero installation):
npx @xvdxlinux/oriented-direct dev

# 3. Add as a dev dependency to an existing project:
npm install -D @xvdxlinux/oriented-direct
```

*(Alternatively, if working from source, run `npm link` inside the cloned directory).*

### CLI Commands & Workflows:
```bash
# 1. Start local dev server (auto-builds, watches, source maps enabled, and serves public/ at http://localhost:3000)
ospc dev

# 2. Start dev server on a custom port
ospc dev 8080

# 3. Build using package.json config
ospc build

# 4. Build with Source Map generation
ospc build --public --sourcemap

# 5. Build for public distribution (bundle JS and copy HTML/CSS/assets to public/)
ospc build --public

# 6. Bundle a specific entry file with inline source map
ospc build src/main.osp --bundle -s inline -o public/app.bundle.js

# 7. Execute directly in Node.js
ospc run src/server.osp
```

---

## 5. Integration with `index.html` & `.css`

```text
my-project/
├── package.json         # Includes "osp" configuration
├── index.html           # Root static HTML
├── styles.css           # Root styles
├── src/
│   ├── main.osp         # Entry point
│   ├── Component.osp    # Component module
│   └── utils.osp        # Helper module
└── public/              # Generated by `ospc build --public` or `ospc dev`
    ├── index.html       # Copied
    ├── styles.css       # Copied
    ├── app.js           # Monolithic JavaScript bundle
    └── app.js.map       # Source Map (when external sourcemap enabled)
```

In your `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Oriented-Direct App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>

  <!-- Script bundled by Oriented-Direct -->
  <script type="module" src="app.js"></script>
</body>
</html>
```

---
---

# Documentación en Castellano

## Inicio Rápido

```bash
# Instalar globalmente desde npm
npm install -g @xvdxlinux/oriented-direct

# Iniciar servidor de desarrollo con recarga en vivo, IP de red y Source Maps automáticos
ospc dev

# O ejecutar directamente con npx (sin instalar nada):
npx @xvdxlinux/oriented-direct dev
```

---

## 1. Introducción y Novedades de la Versión 1.4.0
**Oriented-Direct** (`.osp`) es un lenguaje de programación moderno diseñado para resolver las ambigüedades, la verbosidad y las inconsistencias históricas de JavaScript y TypeScript.

### Características Principales:
1. **Servidor de Desarrollo Local Integrado (`ospc dev`)**:
   - Ejecuta `ospc dev` (o `ospc serve` / `ospc --dev`) para compilar, empaquetar, copiar assets y levantar un servidor HTTP local en `http://localhost:3000` con recompilación en tiempo real sin dependencias externas ni necesidad de herramientas adicionales.
2. **Desarrollo Modular y Empaquetador Integrado**:
   - Organiza tu código en múltiples módulos `.osp` (`import { Componente } from "./components/Componente.osp"`).
   - Genera un bundle `.js` monolítico, autocontenido y optimizado con `ospc build --bundle`.
3. **Configuración de Proyecto en `package.json` / `osp.json`**:
   - Declara el archivo de entrada, carpeta de salida, puerto del dev server y assets en `package.json`.
4. **Separación de Responsabilidades (`--public`)**:
   - Mantén el código fuente en `src/` y genera la carpeta de distribución (`public/`) con `index.html`, hojas `.css` y el bundle `.js`.
5. **Directivas Directas de DOM y Navegador**:
   - Directivas ultra concisas: `@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`, `@warn`, `@error`.
6. **Identificadores Libres y Sin Ambigüedades**:
   - Variables estrictamente inmutables con **`val`** o mutables con **`mut`**.
   - Palabras como `info`, `log`, `warn`, `error` o `data` quedan disponibles para nombrar variables (`val info = @attr(...)`).
   - Comparación estricta universal: `==` y `!=` transpilan a `===` y `!==`.
7. **Bucles Flexibles y Estructuras Selladas**:
   - Bucles C-Style (`for (mut x = 0; x < width; x += 40)`), rangos numéricos (`for (val i in 0..100 step 10)`) e iterables.
   - `struct` con constructor automático y protección contra propiedades no definidas (`Object.seal`).
8. **Source Maps de Alta Precisión (`.map`)**:
   - Motor nativo Base64-VLQ con deltas diferenciales y embebido de `sourcesContent`.
   - Mapea las trazas de error, puntos de interrupción y mensajes de consola en DevTools directamente a las líneas de los archivos fuente `.osp`.
   - Activo automáticamente en modo `ospc dev` y configurable mediante `-s, --sourcemap [inline|external]`.

---

## 2. Referencia de Sintaxis

### 2.1 Variables y Mutabilidad
| Oriented-Direct (`.osp`) | JavaScript Transpilado (`.js`) | Descripción |
| :--- | :--- | :--- |
| `val nombre = "Carlos";` | `const nombre = "Carlos";` | Declaración inmutable |
| `mut contador = 0;` | `let contador = 0;` | Declaración mutable |
| `val info = @attr(el, "data-id");` | `const info = $attr(el, "data-id");` | Identificadores libres de colisión |

### 2.2 Igualdad y Operadores Lógicos
| Oriented-Direct (`.osp`) | JavaScript Transpilado (`.js`) | Descripción |
| :--- | :--- | :--- |
| `a == b` o `a is b` | `(a === b)` | Igualdad estricta universal |
| `a != b` o `a is not b` | `(a !== b)` | Desigualdad estricta |
| `a and b` | `(a && b)` | Operador lógico Y |
| `a or b` | `(a || b)` | Operador lógico O |
| `not a` | `!(a)` | Negación lógica |
| `a ?? b` | `a ?? b` | Coalescencia nula |
| `a?.b` | `a?.b` | Acceso seguro encadenado |

### 2.3 Directivas Directas del DOM y Consola
| Directiva | Equivalente en JavaScript | Propósito |
| :--- | :--- | :--- |
| `@doc` | `document` | Referencia directa al documento DOM |
| `@win` | `window` | Referencia directa al objeto window |
| `@find(selector, padre?)` | `document.querySelector(selector)` | Seleccionar un elemento del DOM |
| `@all(selector, padre?)` | `Array.from(document.querySelectorAll(selector))` | Seleccionar todos los elementos coincidentes |
| `@id(idElemento)` | `document.getElementById(idElemento)` | Obtención directa por ID |
| `@on(objetivo, evento, fn)` | `objetivo.addEventListener(evento, fn)` | Suscribir manejador de eventos |
| `@off(objetivo, evento, fn)` | `objetivo.removeEventListener(evento, fn)` | Remover manejador de eventos |
| `@emit(objetivo, evento, datos)` | `objetivo.dispatchEvent(new CustomEvent(...))` | Emitir eventos personalizados |
| `@create(etiqueta, atributos, ...hijos)` | `document.createElement(...)` | Creación declarativa de elementos |
| `@html(objetivo, cadenaHtml?)` | Getter / Setter de `innerHTML` | Asignar u obtener contenido HTML |
| `@text(objetivo, cadenaTexto?)` | Getter / Setter de `textContent` | Asignar u obtener texto plano |
| `@css(objetivo, objetoEstilos)` | `Object.assign(objetivo.style, objetoEstilos)` | Aplicar estilos CSS directamente |
| `@attr(objetivo, clave, valor?)` | `setAttribute / getAttribute` | Asignar u obtener atributos HTML |
| `@val(objetivo, valor?)` | Getter / Setter de `.value` | Asignar u obtener valor de inputs |
| `@log(...)` | `console.log(...)` | Registro directo en consola |
| `@info(...)` | `console.info(...)` | Registro informativo en consola |
| `@warn(...)` | `console.warn(...)` | Advertencia en consola |
| `@error(...)` | `console.error(...)` | Error en consola |

---

## 3. Configuración del Proyecto (`package.json` / `osp.json`)

```json
{
  "name": "mi-proyecto",
  "version": "1.0.0",
  "osp": {
    "entry": "src/principal.osp",
    "outDir": "public",
    "outFile": "app.js",
    "bundle": true,
    "port": 3000,
    "assets": ["index.html", "*.css", "imagenes/**/*"]
  }
}
```

---

## 4. Compilador, Empaquetador y Servidor de Desarrollo (`ospc`)

### Instalación y Configuración:

```bash
# 1. Instalación global desde npm (recomendado):
npm install -g @xvdxlinux/oriented-direct

# 2. O ejecutar instantáneamente con npx (sin instalar nada):
npx @xvdxlinux/oriented-direct dev

# 3. Agregar como dependencia de desarrollo a un proyecto:
npm install -D @xvdxlinux/oriented-direct
```

*(Alternativamente, si trabajas desde el código fuente clonado, ejecuta `npm link`).*

### Comandos del CLI:
```bash
# 1. Iniciar servidor de desarrollo local (recompila, copia assets, Source Maps activos y sirve en http://localhost:3000)
ospc dev

# 2. Iniciar servidor en un puerto personalizado
ospc dev 8080

# 3. Compilar según la configuración de package.json
ospc build

# 4. Compilar generando Source Map (.map)
ospc build --public --sourcemap

# 5. Compilar con distribución pública (empaqueta JS y copia HTML/CSS a public/)
ospc build --public

# 6. Empaquetar un archivo específico con Source Map inline
ospc build src/principal.osp --bundle -s inline -o public/app.bundle.js

# 7. Ejecutar directamente con Node.js
ospc run src/servidor.osp
```

---

## 5. Integración con `index.html` y `.css`

```text
mi-proyecto/
├── package.json         # Configuración "osp"
├── index.html           # HTML raíz
├── estilos.css          # Estilos raíz
├── src/
│   ├── principal.osp    # Punto de entrada
│   ├── Componente.osp   # Módulo componente
│   └── utilidades.osp   # Módulo de funciones
└── public/              # Generado por `ospc build --public` o `ospc dev`
    ├── index.html       # Copiado
    ├── estilos.css      # Copiado
    ├── app.js           # Bundle monolítico de JavaScript
    └── app.js.map       # Source Map (si se activa sourcemap externo)
```

En tu `index.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Aplicación Oriented-Direct</title>
  <link rel="stylesheet" href="estilos.css">
</head>
<body>
  <div id="app"></div>

  <!-- Script empaquetado por Oriented-Direct -->
  <script type="module" src="app.js"></script>
</body>
</html>
```
