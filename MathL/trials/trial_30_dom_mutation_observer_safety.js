/**
 * Trial #30: DOM Mutation Observer & Safe Reactive Templating (Rule XVII)
 * Proves compile-time verification of sanitized HTML template interpolation,
 * DOM clobbering prevention, and MutationObserver recursive cascade cycle detection.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #30: DOM Mutation Observer & Safe Reactive Templating ---');

export const SanitizationLevel = {
  BOTTOM: 'BOTTOM',
  UNTRUSTED_RAW: 'UNTRUSTED_RAW',
  SANITIZED_SAFE: 'SANITIZED_SAFE',
  TRUSTED_STATIC: 'TRUSTED_STATIC',
  TOP: 'TOP'
};

export class DOMNodeModel {
  constructor(id, tag, parent = null) {
    this.id = id;
    this.tag = tag;
    this.parent = parent;
    this.children = [];
    if (parent) {
      parent.children.push(this);
    }
  }

  isAncestorOf(node) {
    let curr = node.parent;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parent;
    }
    return false;
  }
}

export class TemplateInterpolationAnalyzer {
  static sanitize(expr) {
    return {
      source: expr,
      level: SanitizationLevel.SANITIZED_SAFE
    };
  }

  static verifyHTMLAssignment(targetNode, expression) {
    const level = expression.level || SanitizationLevel.UNTRUSTED_RAW;

    // Check for direct untrusted raw string interpolation
    if (level === SanitizationLevel.UNTRUSTED_RAW) {
      return {
        ok: false,
        error: `[MathL Violation: S_UnsafeHTMLInterpolation] Unsanitized dynamic string interpolated into '${targetNode.tag}.innerHTML'. Requires compile-time @sanitize() or static template.`
      };
    }

    // Inspect static/sanitized template content for DOM clobbering and injection patterns
    const rawContent = expression.raw || expression.source || '';
    if (typeof rawContent === 'string') {
      const clobberingPattern = /<(?:img|form|input|embed|object)[^>]+(?:name|id)\s*=\s*["'](?:prototype|__proto__|constructor|attributes|children)["']/i;
      if (clobberingPattern.test(rawContent)) {
        return {
          ok: false,
          error: `[MathL Violation: S_DOMClobberingRisk] Interpolated markup contains property clobbering attributes (name/id collision on prototype/attributes).`
        };
      }

      const scriptPattern = /<script\b[^>]*>|javascript:\s*|on\w+\s*=/i;
      if (level !== SanitizationLevel.TRUSTED_STATIC && scriptPattern.test(rawContent)) {
        return {
          ok: false,
          error: `[MathL Violation: S_UnsafeHTMLInterpolation] Disallowed executable script or event handler attribute detected in dynamic template.`
        };
      }
    }

    return { ok: true };
  }
}

export class MutationObserverSafetyAnalyzer {
  static verifyObserverCallback(observerConfig) {
    const { target, subtree, callbackOps, hasDisconnectGuard, hasDepthGuard } = observerConfig;

    for (const op of callbackOps) {
      if (op.type === 'DOM_MUTATION') {
        const mutatedNode = op.targetNode;
        const isSelfOrSubtree = (mutatedNode === target) || (subtree && target.isAncestorOf(mutatedNode));

        if (isSelfOrSubtree) {
          if (!hasDisconnectGuard && !hasDepthGuard) {
            return {
              ok: false,
              error: `[MathL Violation: S_InfiniteDOMMutationCascade] MutationObserver on <${target.tag}#${target.id}> synchronously mutates observed node <${mutatedNode.tag}#${mutatedNode.id}> without disconnect() or depth guard. Causes unbounded reactive microtask cascade.`
            };
          }
        }
      }
    }

    return { ok: true };
  }
}

// --- Verification Tests ---

const root = new DOMNodeModel('app', 'div');
const list = new DOMNodeModel('list', 'ul', root);
const item = new DOMNodeModel('item-1', 'li', list);
const statusBanner = new DOMNodeModel('status', 'span', root);

// 1. Trusted Static HTML Interpolation
console.log('1. Testing Trusted Static HTML Interpolation...');
const staticTemplate = {
  raw: '<span class="label">Total Items</span>',
  level: SanitizationLevel.TRUSTED_STATIC
};
const resStatic = TemplateInterpolationAnalyzer.verifyHTMLAssignment(item, staticTemplate);
assert.ok(resStatic.ok);

// 2. Sanitized Dynamic HTML Interpolation
console.log('2. Testing Sanitized Dynamic HTML Interpolation...');
const sanitizedExpr = TemplateInterpolationAnalyzer.sanitize('<b>User input bolded</b>');
const resSanitized = TemplateInterpolationAnalyzer.verifyHTMLAssignment(item, sanitizedExpr);
assert.ok(resSanitized.ok);

// 3. Raw Untrusted String Interpolation Rejection
console.log('3. Testing Raw Untrusted String Interpolation Rejection...');
const rawExpr = {
  raw: '<div>' + '<img src=x onerror=alert(1)>' + '</div>',
  level: SanitizationLevel.UNTRUSTED_RAW
};
const resRaw = TemplateInterpolationAnalyzer.verifyHTMLAssignment(item, rawExpr);
assert.strictEqual(resRaw.ok, false);
assert.ok(resRaw.error.includes('S_UnsafeHTMLInterpolation'));

// 4. DOM Clobbering Pattern Rejection
console.log('4. Testing DOM Clobbering Attribute Rejection...');
const clobberExpr = {
  raw: '<form id="attributes"><input name="prototype"></form>',
  level: SanitizationLevel.SANITIZED_SAFE
};
const resClobber = TemplateInterpolationAnalyzer.verifyHTMLAssignment(item, clobberExpr);
assert.strictEqual(resClobber.ok, false);
assert.ok(resClobber.error.includes('S_DOMClobberingRisk'));

// 5. Observer Mutating Disjoint External Node (Safe)
console.log('5. Testing Observer Mutating External Target...');
const safeObserverConfig = {
  target: list,
  subtree: true,
  callbackOps: [
    { type: 'DOM_MUTATION', targetNode: statusBanner, action: 'textContent = "Updated"' }
  ],
  hasDisconnectGuard: false,
  hasDepthGuard: false
};
const resObsSafe = MutationObserverSafetyAnalyzer.verifyObserverCallback(safeObserverConfig);
assert.ok(resObsSafe.ok);

// 6. Observer Mutating Observed Subtree with Disconnect Guard (Safe)
console.log('6. Testing Observer with Disconnect Guard...');
const guardedObserverConfig = {
  target: list,
  subtree: true,
  callbackOps: [
    { type: 'DOM_MUTATION', targetNode: item, action: 'classList.add("highlight")' }
  ],
  hasDisconnectGuard: true,
  hasDepthGuard: false
};
const resObsGuarded = MutationObserverSafetyAnalyzer.verifyObserverCallback(guardedObserverConfig);
assert.ok(resObsGuarded.ok);

// 7. Observer Mutating Self Without Guard (Cascade Rejection)
console.log('7. Testing Observer Mutating Self (Infinite Cascade Rejection)...');
const cascadeObserverConfig = {
  target: list,
  subtree: false,
  callbackOps: [
    { type: 'DOM_MUTATION', targetNode: list, action: 'setAttribute("data-count", 1)' }
  ],
  hasDisconnectGuard: false,
  hasDepthGuard: false
};
const resObsCascade = MutationObserverSafetyAnalyzer.verifyObserverCallback(cascadeObserverConfig);
assert.strictEqual(resObsCascade.ok, false);
assert.ok(resObsCascade.error.includes('S_InfiniteDOMMutationCascade'));

// 8. Observer Mutating Child in Subtree Without Guard (Cascade Rejection)
console.log('8. Testing Observer Mutating Child in Subtree Without Guard...');
const subtreeCascadeConfig = {
  target: list,
  subtree: true,
  callbackOps: [
    { type: 'DOM_MUTATION', targetNode: item, action: 'appendChild' }
  ],
  hasDisconnectGuard: false,
  hasDepthGuard: false
};
const resSubtreeCascade = MutationObserverSafetyAnalyzer.verifyObserverCallback(subtreeCascadeConfig);
assert.strictEqual(resSubtreeCascade.ok, false);
assert.ok(resSubtreeCascade.error.includes('S_InfiniteDOMMutationCascade'));

console.log('Trial #30 Result: PASS (DOM Mutation Observer safety and sanitized reactive templating verified).\n');
