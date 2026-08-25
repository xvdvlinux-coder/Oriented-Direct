/**
 * Oriented-Direct (.osp) Visual Studio Code Extension
 * Provides rich IntelliSense, code completion, hovers, signatures, and snippet helpers.
 */

const vscode = require('vscode');
const { LanguageSymbolType, LANGUAGE_KEYWORDS, LANGUAGE_DIRECTIVES } = require('./src/language-definitions.js');

/**
 * Documentation map for Directives and Keywords
 */
const DOCS = {
  // Directives
  '@doc': {
    detail: '@doc -> document',
    doc: 'Direct native reference to the DOM `document` object.\n\n```osp\nval title = @doc.title;\n```\nTranspiles to: `document`'
  },
  '@win': {
    detail: '@win -> window',
    doc: 'Direct native reference to the global `window` object.\n\n```osp\nval width = @win.innerWidth;\n```\nTranspiles to: `window`'
  },
  '@find': {
    detail: '@find(selector, parent?) -> Element',
    doc: 'Queries a single DOM element matching the specified CSS selector.\n\n```osp\nval btn = @find("#submit-btn");\nval icon = @find(".icon", btn);\n```\nTranspiles to: `parent.querySelector(selector)`'
  },
  '@all': {
    detail: '@all(selector, parent?) -> Array<Element>',
    doc: 'Queries all matching DOM elements as a clean JavaScript Array.\n\n```osp\nval cards = @all(".card");\nfor (val card in cards) {\n  @css(card, { opacity: "1" });\n}\n```\nTranspiles to: `Array.from(parent.querySelectorAll(selector))`'
  },
  '@id': {
    detail: '@id(elementId) -> Element',
    doc: 'Directly retrieves a DOM element by its ID.\n\n```osp\nval app = @id("app");\n```\nTranspiles to: `document.getElementById(elementId)`'
  },
  '@on': {
    detail: '@on(target, event, handler, options?) -> target',
    doc: 'Attaches an event listener to the target DOM element.\n\n```osp\n@on(btn, "click", (e) => {\n  log("Clicked!");\n});\n```\nTranspiles to: `target.addEventListener(event, handler, options)`'
  },
  '@off': {
    detail: '@off(target, event, handler, options?) -> target',
    doc: 'Removes an event listener from the target DOM element.\n\n```osp\n@off(btn, "click", onClickHandler);\n```\nTranspiles to: `target.removeEventListener(event, handler, options)`'
  },
  '@emit': {
    detail: '@emit(target, eventName, detail?) -> target',
    doc: 'Dispatches a custom event with optional payload data.\n\n```osp\n@emit(window, "user-login", { id: 42, role: "admin" });\n```\nTranspiles to: `target.dispatchEvent(new CustomEvent(eventName, { detail }))`'
  },
  '@create': {
    detail: '@create(tag, attributes?, ...children) -> Element',
    doc: 'Declaratively creates a DOM element with attributes, event listeners, inline styles, and child nodes.\n\n```osp\nval alert = @create("div", { class: "alert", style: { color: "blue" } }, "Welcome!");\n```\nTranspiles to declarative `document.createElement` helper.'
  },
  '@html': {
    detail: '@html(target, htmlString?) -> string | target',
    doc: 'Getter/setter for the `innerHTML` property of a DOM element.\n\n```osp\n// Setter:\n@html(container, "<h1>Title</h1>");\n// Getter:\nval currentHtml = @html(container);\n```'
  },
  '@text': {
    detail: '@text(target, textString?) -> string | target',
    doc: 'Getter/setter for the `textContent` property of a DOM element.\n\n```osp\n// Setter:\n@text(heading, "Hello World");\n// Getter:\nval currentText = @text(heading);\n```'
  },
  '@css': {
    detail: '@css(target, styleObject) -> target',
    doc: 'Directly applies inline CSS style properties to a DOM element.\n\n```osp\n@css(box, { backgroundColor: "#f0f0f0", borderRadius: "8px" });\n```\nTranspiles to: `Object.assign(target.style, styleObject)`'
  },
  '@attr': {
    detail: '@attr(target, attributeName, value?) -> string | target',
    doc: 'Getter/setter for HTML element attributes.\n\n```osp\n// Setter:\n@attr(inputEl, "disabled", "true");\n// Getter:\nval type = @attr(inputEl, "type");\n```'
  },
  '@val': {
    detail: '@val(target, value?) -> string | target',
    doc: 'Getter/setter for input/form element values.\n\n```osp\n// Setter:\n@val(usernameInput, "Alice");\n// Getter:\nval entered = @val(usernameInput);\n```'
  },

  // Keywords
  'val': {
    detail: 'val (immutable constant)',
    doc: 'Declares an immutable constant variable binding.\n\n```osp\nval PI = 3.14159;\n```\nTranspiles to: `const PI = 3.14159;`'
  },
  'mut': {
    detail: 'mut (mutable variable)',
    doc: 'Declares an explicitly mutable variable binding.\n\n```osp\nmut counter = 0;\ncounter += 1;\n```\nTranspiles to: `let counter = 0;`'
  },
  'fn': {
    detail: 'fn (function declaration)',
    doc: 'Declares a function.\n\n```osp\nfn add(a, b) {\n  return a + b;\n}\n```\nTranspiles to: `function add(a, b)`'
  },
  'struct': {
    detail: 'struct (lightweight structure)',
    doc: 'Declares a data structure with an auto-generated constructor assigning all fields.\n\n```osp\nstruct Point { x, y }\nval p = new Point(10, 20);\n```'
  },
  'unless': {
    detail: 'unless (inverse condition)',
    doc: 'Executes the block when condition is false (`if (!condition)`).\n\n```osp\nunless (isAuthenticated) {\n  log("Access Denied");\n}\n```'
  },
  'match': {
    detail: 'match (pattern matching / switch)',
    doc: 'Multi-branch pattern matching structure.\n\n```osp\nmatch (status) {\n  case 200 => log("OK")\n  case 404 => log("Not Found")\n  default => log("Unknown")\n}\n```'
  },
  'loop': {
    detail: 'loop (infinite loop)',
    doc: 'Executes a block repeatedly until explicitly interrupted with `break`.\n\n```osp\nloop {\n  if (done()) break;\n}\n```\nTranspiles to: `while (true)`'
  },
  'is': {
    detail: 'is (strict equality: ===)',
    doc: 'Strict equality operator.\n\n```osp\nif (role is "admin") { ... }\n```\nTranspiles to: `(role === "admin")`'
  },
  'is not': {
    detail: 'is not (strict inequality: !==)',
    doc: 'Strict inequality operator.\n\n```osp\nif (status is not 200) { ... }\n```\nTranspiles to: `(status !== 200)`'
  },
  'and': {
    detail: 'and (logical AND: &&)',
    doc: 'Logical AND operator.\n\n```osp\nif (valid and active) { ... }\n```\nTranspiles to: `(valid && active)`'
  },
  'or': {
    detail: 'or (logical OR: ||)',
    doc: 'Logical OR operator.\n\n```osp\nif (admin or moderator) { ... }\n```\nTranspiles to: `(admin || moderator)`'
  },
  'not': {
    detail: 'not (logical NOT: !)',
    doc: 'Logical NOT operator.\n\n```osp\nif (not ready) { ... }\n```\nTranspiles to: `!(ready)`'
  },
  'log': {
    detail: 'log(...args)',
    doc: 'Direct console output.\n\n```osp\nlog("Hello", user);\n```\nTranspiles to: `console.log(...)`'
  },
  'print': {
    detail: 'print(...args)',
    doc: 'Direct console output shorthand.\n\n```osp\nprint("Result:", total);\n```\nTranspiles to: `console.log(...)`'
  },
  'warn': {
    detail: 'warn(...args)',
    doc: 'Console warning output.\n\n```osp\nwarn("Resource deprecated");\n```\nTranspiles to: `console.warn(...)`'
  },
  'error': {
    detail: 'error(...args)',
    doc: 'Console error output.\n\n```osp\nerror("Operation failed");\n```\nTranspiles to: `console.error(...)`'
  },
  'info': {
    detail: 'info(...args)',
    doc: 'Console info output.\n\n```osp\ninfo("System initialized");\n```\nTranspiles to: `console.info(...)`'
  }
};

/**
 * Signature database for SignatureHelpProvider
 */
const SIGNATURES = {
  '@find': {
    label: '@find(selector: string, parent?: Element): Element | null',
    documentation: 'Queries a single DOM element matching the specified selector.',
    parameters: [
      { label: 'selector: string', documentation: 'CSS selector string (e.g. "#id", ".class", "div > p")' },
      { label: 'parent?: Element', documentation: 'Optional parent element to query within (defaults to @doc)' }
    ]
  },
  '@all': {
    label: '@all(selector: string, parent?: Element): Element[]',
    documentation: 'Queries all matching DOM elements as a JavaScript Array.',
    parameters: [
      { label: 'selector: string', documentation: 'CSS selector string' },
      { label: 'parent?: Element', documentation: 'Optional parent element to query within (defaults to @doc)' }
    ]
  },
  '@id': {
    label: '@id(elementId: string): Element | null',
    documentation: 'Retrieves element directly by ID.',
    parameters: [
      { label: 'elementId: string', documentation: 'ID of the element without leading "#"' }
    ]
  },
  '@on': {
    label: '@on(target: Element, event: string, handler: (e: Event) => void, options?: object): Element',
    documentation: 'Attaches an event listener to the target DOM element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'event: string', documentation: 'Event type (e.g. "click", "input", "submit")' },
      { label: 'handler: Function', documentation: 'Callback function receiving the event object' },
      { label: 'options?: object', documentation: 'Optional listener options (e.g. { once: true, passive: true })' }
    ]
  },
  '@off': {
    label: '@off(target: Element, event: string, handler: Function, options?: object): Element',
    documentation: 'Removes an event listener from the target DOM element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'event: string', documentation: 'Event type string' },
      { label: 'handler: Function', documentation: 'Previously attached callback function' },
      { label: 'options?: object', documentation: 'Optional options' }
    ]
  },
  '@emit': {
    label: '@emit(target: Element, eventName: string, detail?: any): Element',
    documentation: 'Dispatches a CustomEvent to the target.',
    parameters: [
      { label: 'target: Element', documentation: 'Target element or window' },
      { label: 'eventName: string', documentation: 'Name of the custom event' },
      { label: 'detail?: any', documentation: 'Payload data attached to event.detail' }
    ]
  },
  '@create': {
    label: '@create(tag: string, attributes?: object, ...children: any[]): Element',
    documentation: 'Declaratively creates a DOM element with attributes and children.',
    parameters: [
      { label: 'tag: string', documentation: 'HTML tag name (e.g. "div", "button", "span")' },
      { label: 'attributes?: object', documentation: 'Object containing attributes, class, style, or event listeners' },
      { label: '...children: any[]', documentation: 'Text strings or child DOM elements' }
    ]
  },
  '@html': {
    label: '@html(target: Element, html?: string): string | Element',
    documentation: 'Gets or sets innerHTML of the target element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'html?: string', documentation: 'Optional HTML string to set' }
    ]
  },
  '@text': {
    label: '@text(target: Element, text?: string): string | Element',
    documentation: 'Gets or sets textContent of the target element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'text?: string', documentation: 'Optional text string to set' }
    ]
  },
  '@css': {
    label: '@css(target: Element, styles: object): Element',
    documentation: 'Applies inline style object to the target element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'styles: object', documentation: 'Object containing CSS properties in camelCase' }
    ]
  },
  '@attr': {
    label: '@attr(target: Element, name: string, value?: string): string | Element',
    documentation: 'Gets or sets an attribute on the target DOM element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target DOM element' },
      { label: 'name: string', documentation: 'Attribute name' },
      { label: 'value?: string', documentation: 'Optional attribute value to set' }
    ]
  },
  '@val': {
    label: '@val(target: Element, value?: string): string | Element',
    documentation: 'Gets or sets the value of a form/input element.',
    parameters: [
      { label: 'target: Element', documentation: 'Target input or textarea element' },
      { label: 'value?: string', documentation: 'Optional new value to set' }
    ]
  }
};

/**
 * Event list for completion
 */
const DOM_EVENTS = [
  'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
  'keydown', 'keyup', 'keypress',
  'input', 'change', 'submit', 'reset', 'focus', 'blur',
  'load', 'DOMContentLoaded', 'resize', 'scroll', 'unload',
  'drag', 'dragstart', 'dragend', 'dragover', 'drop',
  'pointerdown', 'pointerup', 'pointermove', 'contextmenu'
];

/**
 * Activate Extension
 */
function activate(context) {
  console.log('Oriented-Direct (.osp) language extension activated');

  // 1. Completion Provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'oriented-direct',
    {
      provideCompletionItems(document, position, token, context) {
        const completions = [];
        const linePrefix = document.lineAt(position).text.substr(0, position.character);

        // Check if typing inside @on event string
        if (/@on\s*\([^,]+,\s*["'][\w-]*$/.test(linePrefix)) {
          for (const ev of DOM_EVENTS) {
            const item = new vscode.CompletionItem(ev, vscode.CompletionItemKind.Event);
            item.detail = `DOM Event: ${ev}`;
            completions.push(item);
          }
          return completions;
        }

        // Directives completions
        for (const [key, info] of Object.entries(DOCS)) {
          if (key.startsWith('@')) {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Function);
            item.detail = info.detail;
            item.documentation = new vscode.MarkdownString(info.doc);
            
            // Provide snippet insert text
            if (key === '@find') {
              item.insertText = new vscode.SnippetString('@find("${1:selector}"${2:, parent})');
            } else if (key === '@all') {
              item.insertText = new vscode.SnippetString('@all("${1:selector}"${2:, parent})');
            } else if (key === '@id') {
              item.insertText = new vscode.SnippetString('@id("${1:elementId}")');
            } else if (key === '@on') {
              item.insertText = new vscode.SnippetString('@on(${1:target}, "${2:click}", (${3:e}) => {\n\t$0\n})');
            } else if (key === '@css') {
              item.insertText = new vscode.SnippetString('@css(${1:target}, { ${2:property}: "${3:value}" })');
            } else if (key === '@create') {
              item.insertText = new vscode.SnippetString('@create("${1:div}", { ${2:class: "${3:name}"} }, ${4:...children})');
            }
            completions.push(item);
          }
        }

        // Keyword completions
        const keywords = [
          { name: 'val', kind: vscode.CompletionItemKind.Keyword, snippet: 'val ${1:name} = ${2:value};' },
          { name: 'mut', kind: vscode.CompletionItemKind.Keyword, snippet: 'mut ${1:name} = ${2:value};' },
          { name: 'fn', kind: vscode.CompletionItemKind.Keyword, snippet: 'fn ${1:name}(${2:params}) {\n\t$0\n}' },
          { name: 'async fn', kind: vscode.CompletionItemKind.Keyword, snippet: 'async fn ${1:name}(${2:params}) {\n\t$0\n}' },
          { name: 'struct', kind: vscode.CompletionItemKind.Class, snippet: 'struct ${1:Name} { ${2:x, y} }' },
          { name: 'class', kind: vscode.CompletionItemKind.Class, snippet: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}' },
          { name: 'unless', kind: vscode.CompletionItemKind.Keyword, snippet: 'unless (${1:condition}) {\n\t$0\n}' },
          { name: 'match', kind: vscode.CompletionItemKind.Keyword, snippet: 'match (${1:expression}) {\n\tcase ${2:pattern} => ${3:action}\n\tdefault => ${4:defaultAction}\n}' },
          { name: 'loop', kind: vscode.CompletionItemKind.Keyword, snippet: 'loop {\n\t$0\n}' },
          { name: 'for in', kind: vscode.CompletionItemKind.Snippet, snippet: 'for (val ${1:item} in ${2:collection}) {\n\t$0\n}' },
          { name: 'for of', kind: vscode.CompletionItemKind.Snippet, snippet: 'for (val ${1:key} of ${2:object}) {\n\t$0\n}' },
          { name: 'is', kind: vscode.CompletionItemKind.Operator, snippet: 'is ' },
          { name: 'is not', kind: vscode.CompletionItemKind.Operator, snippet: 'is not ' },
          { name: 'and', kind: vscode.CompletionItemKind.Operator, snippet: 'and ' },
          { name: 'or', kind: vscode.CompletionItemKind.Operator, snippet: 'or ' },
          { name: 'not', kind: vscode.CompletionItemKind.Operator, snippet: 'not ' },
          { name: 'log', kind: vscode.CompletionItemKind.Function, snippet: 'log(${1:message});' },
          { name: 'print', kind: vscode.CompletionItemKind.Function, snippet: 'print(${1:message});' },
          { name: 'warn', kind: vscode.CompletionItemKind.Function, snippet: 'warn(${1:message});' },
          { name: 'error', kind: vscode.CompletionItemKind.Function, snippet: 'error(${1:message});' },
          { name: 'info', kind: vscode.CompletionItemKind.Function, snippet: 'info(${1:message});' },
          { name: 'import', kind: vscode.CompletionItemKind.Keyword, snippet: 'import { ${1:members} } from "${2:./module.osp}";' },
          { name: 'export', kind: vscode.CompletionItemKind.Keyword, snippet: 'export ${1:declaration};' }
        ];

        for (const kw of keywords) {
          const item = new vscode.CompletionItem(kw.name, kw.kind);
          if (DOCS[kw.name]) {
            item.detail = DOCS[kw.name].detail;
            item.documentation = new vscode.MarkdownString(DOCS[kw.name].doc);
          }
          item.insertText = new vscode.SnippetString(kw.snippet);
          completions.push(item);
        }

        return completions;
      }
    },
    '@', '.', '"', "'"
  );

  // 2. Hover Provider
  const hoverProvider = vscode.languages.registerHoverProvider('oriented-direct', {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /@[a-zA-Z_]\w*|\b[a-zA-Z_]\w*\b|is\s+not/);
      if (!range) return null;

      const word = document.getText(range);
      if (DOCS[word]) {
        const info = DOCS[word];
        const md = new vscode.MarkdownString();
        md.appendCodeblock(info.detail, 'osp');
        md.appendMarkdown('\n' + info.doc);
        return new vscode.Hover(md, range);
      }
      return null;
    }
  });

  // 3. Signature Help Provider
  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    'oriented-direct',
    {
      provideSignatureHelp(document, position) {
        const lineText = document.lineAt(position).text.substr(0, position.character);
        
        // Match function / directive call before cursor: e.g. @find( or @on(
        const match = lineText.match(/(@[a-zA-Z_]\w*|[a-zA-Z_]\w*)\s*\(([^)]*)$/);
        if (!match) return null;

        const fnName = match[1];
        const argsStr = match[2];
        const sigInfo = SIGNATURES[fnName];
        if (!sigInfo) return null;

        // Count commas outside quotes
        let paramIndex = 0;
        let inQuotes = false;
        let quoteChar = '';
        for (let i = 0; i < argsStr.length; i++) {
          const c = argsStr[i];
          if (inQuotes) {
            if (c === quoteChar && argsStr[i - 1] !== '\\') inQuotes = false;
          } else {
            if (c === '"' || c === "'") {
              inQuotes = true;
              quoteChar = c;
            } else if (c === ',') {
              paramIndex++;
            }
          }
        }

        const help = new vscode.SignatureHelp();
        const sig = new vscode.SignatureInformation(sigInfo.label, new vscode.MarkdownString(sigInfo.documentation));
        sig.parameters = sigInfo.parameters.map(p => new vscode.ParameterInformation(p.label, new vscode.MarkdownString(p.documentation)));

        help.signatures = [sig];
        help.activeSignature = 0;
        help.activeParameter = Math.min(paramIndex, sig.parameters.length - 1);

        return help;
      }
    },
    '(', ','
  );

  context.subscriptions.push(completionProvider, hoverProvider, signatureProvider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
