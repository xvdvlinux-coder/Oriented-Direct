# Oriented-Direct (`.osp`) v1.3.0

> **An unambiguous, ultra-direct programming language that transpiles, bundles, and serves modern JavaScript applications.**  
> Built natively on **Node.js** with zero external dependencies.

---

## Language Selection / Selección de Idioma
- [English Documentation](#-english-documentation)
- [Documentación en Castellano](#-documentación-en-castellano)

---

# 🇬🇧 English Documentation

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
npm link
```
*(Or invoke directly using `node bin/ospc.js`)*

### CLI Commands & Workflows:
```bash
# 1. Start local dev server (auto-builds, watches, and serves public/ at http://localhost:3000)
ospc dev

# 2. Start dev server on a custom port
ospc dev 8080

# 3. Build using package.json config
ospc build

# 4. Build for public distribution (bundle JS and copy HTML/CSS/assets to public/)
ospc build --public

# 5. Bundle a specific entry file
ospc build src/main.osp --bundle -o public/app.bundle.js

# 6. Execute directly in Node.js
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
│   ├── Header.osp       # Component module
│   └── utils.osp        # Helper module
└── public/              # Generated automatically by `ospc build --public` or `ospc dev`
    ├── index.html       # Copied
    ├── styles.css       # Copied
    └── app.js           # Monolithic JavaScript bundle
```

In your `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oriented-Direct App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>

  <!-- Include the compiled/bundled script -->
  <script type="module" src="app.js"></script>
</body>
</html>
```

---
---

# 🇪🇸 Documentación en Castellano

## 1. Introducción y Novedades de la Versión 1.3.0
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
npm link
```
*(O invocar directamente con `node bin/ospc.js`)*

### Comandos del CLI:
```bash
# 1. Iniciar servidor de desarrollo local (recompila, copia assets y sirve en http://localhost:3000)
ospc dev

# 2. Iniciar servidor en un puerto personalizado
ospc dev 8080

# 3. Compilar según la configuración de package.json
ospc build

# 4. Compilar con distribución pública (empaqueta JS y copia HTML/CSS a public/)
ospc build --public

# 5. Empaquetar un archivo específico en un bundle monolítico
ospc build src/principal.osp --bundle -o public/app.bundle.js

# 6. Ejecutar directamente con Node.js
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
    └── app.js           # Bundle monolítico de JavaScript
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
