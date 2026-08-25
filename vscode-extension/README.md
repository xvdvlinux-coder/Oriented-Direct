# Oriented-Direct Language Support for VS Code

Soporte oficial de resaltado de sintaxis, sugerencias inteligentes (snippets), autocompletado e IntelliSense para el lenguaje **Oriented-Direct** (`.osp` / `.odp`).

---

## ✨ Características

### 1. Resaltado de Sintaxis Completo
- **Palabras Clave**: `val`, `mut`, `fn`, `async`, `await`, `struct`, `class`, `constructor`, `extends`, `unless`, `match`, `case`, `default`, `loop`, `while`, `for`, `in`, `of`, `break`, `continue`, `return`, `try`, `catch`, `finally`, `throw`, etc.
- **Directivas Nativas DOM & Core**: `@doc`, `@win`, `@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`.
- **Operadores Legibles**: `is`, `is not`, `and`, `or`, `not`.
- **Operador Pipeline**: `|>`.
- **Salidas Directas de Consola**: `log`, `print`, `warn`, `error`, `info`.
- **Interpolación de Cadenas**: Soporte completo para `${expression}` dentro de plantillas `` `...` ``.
- **Comentarios y Documentación**: Soporte para `// ...`, `/* ... */` y `/** ... */`.

### 2. Sugerencias de Código Inteligentes (Snippets & Autocomplete)
- `val`, `mut`: Declaraciones inmutables y mutables.
- `fn`, `afn`: Funciones estándar y asíncronas.
- `struct`: Estructuras de datos directas con constructor automático.
- `class`, `classext`: Clases y herencia.
- `unless`: Estructura condicional inversa.
- `match`: Pattern matching / switch conciso.
- `forin`, `forof`, `loop`: Bucles optimizados para colecciones, claves y ciclos infinitos.
- Directivas DOM (`@find`, `@all`, `@id`, `@on`, `@off`, `@emit`, `@create`, `@html`, `@text`, `@css`, `@attr`, `@val`) con tabulaciones interactivas.
- Autocompletado contextual de eventos del navegador dentro de `@on` (`click`, `input`, `change`, `submit`, `DOMContentLoaded`, etc.).

### 3. Hover e Información de Tipos
- Al pasar el cursor sobre cualquier directiva (`@find`, `@on`, `@css`, etc.) o palabra clave (`unless`, `val`, `mut`, `match`), se muestra la documentación oficial, ejemplos de código y su transpilación a JavaScript estándar.

### 4. Asistencia de Parámetros (Signature Help)
- Al escribir llamadas a directivas como `@find(`, `@on(`, `@create(`, `@css(`, etc., VS Code resalta interactivamente el parámetro activo y su descripción.

---

## 🚀 Instrucciones de Instalación en VS Code

### Opción 1: Instalación Directa (Recomendada y Rápida)
Copia la carpeta de la extensión `vscode-extension` dentro de tu directorio de extensiones de VS Code:

- **En Windows**:
  ```cmd
  xcopy /E /I "vscode-extension" "%USERPROFILE%\.vscode\extensions\oriented-direct-1.0.0"
  ```
  *(O en PowerShell)*:
  ```powershell
  Copy-Item -Recurse -Force "vscode-extension" "$env:USERPROFILE\.vscode\extensions\oriented-direct-1.0.0"
  ```

- **En macOS / Linux**:
  ```bash
  cp -r vscode-extension ~/.vscode/extensions/oriented-direct-1.0.0
  ```

Luego **reinicia o recarga Visual Studio Code** (Ctrl+Shift+P $\rightarrow$ *Developer: Reload Window*).

---

### Opción 2: Empaquetar e Instalar como archivo `.vsix`

1. Si tienes instalado Node.js, empaqueta la extensión:
   ```bash
   npx @vscode/vsce package
   ```
2. Instálala en VS Code:
   - Abre VS Code.
   - Ve a la pestaña **Extensions** (`Ctrl + Shift + X`).
   - Haz clic en los **tres puntos (`...`)** en la esquina superior derecha del panel de Extensiones.
   - Selecciona **"Install from VSIX..."** (*Instalar desde VSIX...*).
   - Elige el archivo generado `oriented-direct-1.0.0.vsix`.

O por línea de comandos:
```bash
code --install-extension oriented-direct-1.0.0.vsix
```

---

## 📄 Licencia
MIT License
