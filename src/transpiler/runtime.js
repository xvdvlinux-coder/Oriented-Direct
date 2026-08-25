/**
 * Oriented-Direct (.osp) Standard Runtime Helpers
 * Clean, lightweight, zero-dependency browser & Node.js utilities
 */

export const RUNTIME_HELPERS_CODE = `
// --- Oriented-Direct Runtime Helpers ---
const $doc = typeof document !== 'undefined' ? document : null;
const $win = typeof window !== 'undefined' ? window : null;

function $find(selector, parent = $doc) {
  if (!parent || !parent.querySelector) return null;
  return parent.querySelector(selector);
}

function $all(selector, parent = $doc) {
  if (!parent || !parent.querySelectorAll) return [];
  return Array.from(parent.querySelectorAll(selector));
}

function $id(id) {
  if (!$doc || !$doc.getElementById) return null;
  return $doc.getElementById(id);
}

function $on(target, event, handler, options) {
  if (target && target.addEventListener) {
    target.addEventListener(event, handler, options);
  }
  return target;
}

function $off(target, event, handler, options) {
  if (target && target.removeEventListener) {
    target.removeEventListener(event, handler, options);
  }
  return target;
}

function $emit(target, event, detail = {}) {
  if (target && target.dispatchEvent) {
    const customEvent = typeof CustomEvent !== 'undefined'
      ? new CustomEvent(event, { detail, bubbles: true, cancelable: true })
      : { type: event, detail };
    target.dispatchEvent(customEvent);
  }
  return target;
}

function $create(tag, attrs = {}, ...children) {
  if (!$doc || !$doc.createElement) return null;
  const el = $doc.createElement(tag);
  
  if (attrs && typeof attrs === 'object') {
    for (const [key, val] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
      } else if (key === 'class' || key === 'className') {
        el.className = val;
      } else if (key in el && typeof el[key] !== 'function') {
        el[key] = val;
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild($doc.createTextNode(String(child)));
    } else if (typeof Node !== 'undefined' && child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

function $html(target, content) {
  if (!target) return undefined;
  if (content !== undefined) {
    target.innerHTML = content;
    return target;
  }
  return target.innerHTML;
}

function $text(target, content) {
  if (!target) return undefined;
  if (content !== undefined) {
    target.textContent = content;
    return target;
  }
  return target.textContent;
}

function $css(target, styles) {
  if (target && target.style && styles) {
    Object.assign(target.style, styles);
  }
  return target;
}

function $attr(target, key, val) {
  if (!target) return undefined;
  if (val !== undefined) {
    target.setAttribute(key, String(val));
    return target;
  }
  return target.getAttribute ? target.getAttribute(key) : undefined;
}

function $val(target, val) {
  if (!target) return undefined;
  if (val !== undefined) {
    target.value = val;
    return target;
  }
  return target.value;
}
// ----------------------------------------
`.trim();
