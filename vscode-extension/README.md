# Oriented-Direct Language Support for VS Code

Official syntax highlighting, intelligent snippets, autocompletion, hover documentation, and IntelliSense for the **Oriented-Direct** (`.osp`) programming language.

---

## Language Selection / Seleccion de Idioma
- [English Documentation](#english-documentation)
- [Documentacion en Castellano](#documentacion-en-castellano)

---

# English Documentation

## Features

### 1. Full Syntax Highlighting
- **Keywords**: `val`, `mut`, `fn`, `async`, `await`, `struct`, `class`, `constructor`, `extends`, `unless`, `match`, `case`, `default`, `loop`, `while`, `for`, `in`, `of`, `step`, `break`, `continue`, `return`, `try`, `catch`, `finally`, `throw`, `static`, `super`, `new`, `this`.
- **Native Directives**: `@doc`, `@win`, `@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`, `@warn`, `@error`, `@print`.
- **Readable Operators**: `is`, `is not`, `and`, `or`, `not`.
- **Pipeline Operator**: `|>`.
- **Numeric Range Operator**: `..` with optional `step`.
- **String Interpolation**: Full support for template literals with `${expression}` substitution.
- **Comments and Documentation**: Support for `// ...`, `/* ... */`, and JSDoc-style `/** ... */`.

### 2. Intelligent Code Snippets and Autocomplete
- `val`, `mut`: Immutable and mutable declarations.
- `fn`, `afn`: Standard and async function declarations.
- `struct`: Lightweight data structures with automatic constructor and sealing.
- `class`, `classext`: Classes and inheritance hierarchies.
- `unless`: Inverted conditional logic.
- `match`: Concise pattern matching and switch statements.
- `forin`, `forof`, `forrange`, `loop`: Optimized collection iterations, key mappings, numeric ranges, and infinite loops.
- Direct DOM and console macros (`@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`) with interactive tab stops.
- Contextual DOM event autocompletion inside `@on` (`click`, `input`, `change`, `submit`, `DOMContentLoaded`, etc.).

### 3. Hover Information and Documentation
- Hovering over any directive (`@find`, `@on`, `@css`, `@create`, etc.) or keyword (`val`, `mut`, `unless`, `match`, `struct`) displays full documentation, usage examples, and standard JavaScript transpilation output.

### 4. Parameter and Signature Assistance
- When typing arguments into directives like `@find(`, `@on(`, `@create(`, `@css(`, VS Code dynamically highlights the active parameter and its signature description.

---

## Installation Instructions

### Option 1: Direct Folder Installation (Recommended)
Copy the `vscode-extension` directory into your local VS Code extensions folder:

- **On Windows**:
  ```powershell
  Copy-Item -Recurse -Force "vscode-extension" "$env:USERPROFILE\.vscode\extensions\oriented-direct-1.0.0"
  ```
  *(Or in Command Prompt)*:
  ```cmd
  xcopy /E /I "vscode-extension" "%USERPROFILE%\.vscode\extensions\oriented-direct-1.0.0"
  ```

- **On macOS / Linux**:
  ```bash
  cp -r vscode-extension ~/.vscode/extensions/oriented-direct-1.0.0
  ```

Then reload Visual Studio Code (`Ctrl + Shift + P` or `Cmd + Shift + P` -> *Developer: Reload Window*).

---

### Option 2: Install via .vsix Package

1. Package the extension (if you have Node.js):
   ```bash
   npx @vscode/vsce package
   ```
2. Install in VS Code:
   - Open VS Code.
   - Navigate to the **Extensions** view (`Ctrl + Shift + X` or `Cmd + Shift + X`).
   - Click the **More Actions (`...`)** menu at the top-right of the Extensions panel.
   - Select **"Install from VSIX..."**.
   - Choose the generated `oriented-direct-1.0.0.vsix` file.

Or install via terminal:
```bash
code --install-extension oriented-direct-1.0.0.vsix
```

---

## License
MIT License

---
---

# Documentacion en Castellano

## Caracteristicas

### 1. Resaltado de Sintaxis Completo
- **Palabras Clave**: `val`, `mut`, `fn`, `async`, `await`, `struct`, `class`, `constructor`, `extends`, `unless`, `match`, `case`, `default`, `loop`, `while`, `for`, `in`, `of`, `step`, `break`, `continue`, `return`, `try`, `catch`, `finally`, `throw`, etc.
- **Directivas Nativas DOM y Core**: `@doc`, `@win`, `@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`, `@warn`, `@error`, `@print`.
- **Operadores Legibles**: `is`, `is not`, `and`, `or`, `not`.
- **Operador Pipeline**: `|>`.
- **Operador de Rango**: `..` con `step` opcional.
- **Interpolacion de Cadenas**: Soporte completo para `${expression}` dentro de plantillas `` `...` ``.
- **Comentarios y Documentacion**: Soporte para `// ...`, `/* ... */` y `/** ... */`.

### 2. Sugerencias de Codigo Inteligentes (Snippets y Autocomplete)
- `val`, `mut`: Declaraciones inmutables y mutables.
- `fn`, `afn`: Funciones estandar y asincronas.
- `struct`: Estructuras de datos directas con constructor automatico y sellado.
- `class`, `classext`: Clases y herencia.
- `unless`: Estructura condicional inversa.
- `match`: Pattern matching y switch conciso.
- `forin`, `forof`, `forrange`, `loop`: Bucles optimizados para colecciones, claves, rangos numericos y ciclos infinitos.
- Directivas DOM y consola (`@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`, `@log`, `@info`) con tabulaciones interactivas.
- Autocompletado contextual de eventos del navegador dentro de `@on` (`click`, `input`, `change`, `submit`, `DOMContentLoaded`, etc.).

### 3. Hover e Informacion de Tipos
- Al pasar el cursor sobre cualquier directiva (`@find`, `@on`, `@css`, etc.) o palabra clave (`unless`, `val`, `mut`, `match`), se muestra la documentacion oficial, ejemplos de codigo y su transpilacion a JavaScript estandar.

### 4. Asistencia de Parametros (Signature Help)
- Al escribir llamadas a directivas como `@find(`, `@on(`, `@create(`, `@css(`, etc., VS Code resalta interactivamente el parametro activo y su descripcion.

---

## Instrucciones de Instalacion en VS Code

### Opcion 1: Instalacion Directa (Recomendada y Rapida)
Copia la carpeta de la extension `vscode-extension` dentro de tu directorio de extensiones de VS Code:

- **En Windows**:
  ```powershell
  Copy-Item -Recurse -Force "vscode-extension" "$env:USERPROFILE\.vscode\extensions\oriented-direct-1.0.0"
  ```
  *(O en Command Prompt)*:
  ```cmd
  xcopy /E /I "vscode-extension" "%USERPROFILE%\.vscode\extensions\oriented-direct-1.0.0"
  ```

- **En macOS / Linux**:
  ```bash
  cp -r vscode-extension ~/.vscode/extensions/oriented-direct-1.0.0
  ```

Luego reinicia o recarga Visual Studio Code (`Ctrl + Shift + P` -> *Developer: Reload Window*).

---

### Opcion 2: Empaquetar e Instalar como archivo .vsix

1. Si tienes instalado Node.js, empaqueta la extension:
   ```bash
   npx @vscode/vsce package
   ```
2. Instala en VS Code:
   - Abre VS Code.
   - Ve a la pestana **Extensions** (`Ctrl + Shift + X`).
   - Haz clic en los **tres puntos (`...`)** en la esquina superior derecha del panel de Extensiones.
   - Selecciona **"Install from VSIX..."** (*Instalar desde VSIX...*).
   - Elige el archivo generado `oriented-direct-1.0.0.vsix`.

O por linea de comandos:
```bash
code --install-extension oriented-direct-1.0.0.vsix
```

---

## Licencia
MIT License
