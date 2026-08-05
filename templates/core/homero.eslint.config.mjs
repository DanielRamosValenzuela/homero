/**
 * Homero — opt-in ESLint flat-config fragment.
 *
 * OPT-IN. This file does NOTHING on its own. It is a fragment, not a lint config: it
 * never replaces, generates, or claims ownership of your eslint.config.js. To have any
 * effect it must be imported by your own eslint.config.js. Homero CANNOT detect whether
 * you wired it in — nothing in `homero validate`, `upgrade`, or the verify loop will
 * tell you this file is inert. To enforce it, paste these 3 lines into eslint.config.js:
 *
 *   import homeroUseClient from "./homero.eslint.config.mjs";
 *   // ...then spread it into the array you already export:
 *   export default [...yourExistingConfig, ...homeroUseClient];
 *
 * ONE RULE, deliberately: any file that statically imports the design-system package
 * must carry the 'use client' directive — the gotcha recorded in .claude/rules/tomaco.md.
 * The cause is packaging: tomaco-components ships a single bundle with no subpath
 * exports, so even importing a purely presentational component loads the module that
 * calls React hooks and inlines react-select/react-datepicker (devDependencies absent
 * from rollup's `external`), which brings @emotion's createContext along. Mechanical,
 * with no false positives. Re-check it if Tomaco ever ships subpath exports or a
 * 'use client' banner.
 *
 * Deliberately NOT here: a raw hex/px rule (ESLint does not lint .css/.scss where most
 * raw values live, stack.stylingException is a legitimate recorded escape hatch, and
 * Homero's own UI references specify literal values), and a "non-design-system UI
 * import" blocklist (never finishable; inverted to an allowlist it breaks on
 * react/next/zod/react-hook-form). The package specifier is read from
 * homero.config.json (product.designSystemPackage) at load, never hardcoded here.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_PACKAGE = "tomaco-components";

function readDesignSystemPackage() {
  // fileURLToPath, not URL.pathname: this is a PowerShell-first team and .pathname
  // yields "/C:/..." on Windows, which readFileSync cannot open.
  const candidates = [
    fileURLToPath(new URL("./homero.config.json", import.meta.url)),
    path.join(process.cwd(), "homero.config.json")
  ];

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, "utf8"))?.product?.designSystemPackage;
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // An absent or unreadable config is not a lint failure — fall through.
    }
  }
  return FALLBACK_PACKAGE;
}

const designSystemPackage = readDesignSystemPackage();

function importsDesignSystem(node) {
  const source = node.source?.value;
  if (typeof source !== "string") return false;
  return source === designSystemPackage || source.startsWith(`${designSystemPackage}/`);
}

// Type-only imports are erased before runtime, never pull in the bundle, and so never
// need a client boundary. Flagging them would be a false positive.
function isTypeOnly(node) {
  if (node.importKind === "type" || node.exportKind === "type") return true;
  const specifiers = node.specifiers;
  if (!Array.isArray(specifiers) || specifiers.length === 0) return false;
  return specifiers.every((specifier) => specifier.importKind === "type");
}

// 'use client' only counts inside the leading directive prologue, so stop at the first
// statement that is not a bare string expression.
function hasUseClientDirective(program) {
  for (const node of program.body) {
    if (node.type !== "ExpressionStatement") return false;
    const expression = node.expression;
    if (expression.type !== "Literal" || typeof expression.value !== "string") return false;
    if ((node.directive ?? expression.value) === "use client") return true;
  }
  return false;
}

const useClientForDesignSystem = {
  meta: {
    type: "problem",
    schema: [],
    docs: {
      description: `Files importing ${designSystemPackage} must declare 'use client' at the top.`
    },
    messages: {
      missingUseClient:
        "This file imports '{{source}}'. Add the 'use client' directive at the top, even if it uses no hooks: the package ships one bundle with no subpath exports, so any import pulls in the module that calls React hooks and inlines third-party context, breaking the Server Component build."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (hasUseClientDirective(sourceCode.ast)) return {};

    const check = (node) => {
      if (isTypeOnly(node) || !importsDesignSystem(node)) return;
      context.report({ node, messageId: "missingUseClient", data: { source: node.source.value } });
    };

    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  }
};

export default [
  {
    name: "homero/use-client-for-design-system",
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: { homero: { rules: { "use-client-for-design-system": useClientForDesignSystem } } },
    rules: { "homero/use-client-for-design-system": "error" }
  }
];
