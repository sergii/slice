import type { LayoutNode } from './types.js';

export type SelectorUniquenessCheck = (selector: string) => Promise<boolean>;

const GENERATED_ID = /^[a-z]*[-_]?[0-9a-f]{6,}$/i;
const CSS_MODULE_HASH = /_[a-z0-9]{5,}$/i;

function escapeCssIdentifier(value: string): string {
  if (value.length === 0) return '';

  return Array.from(value)
    .map((char, index) => {
      const code = char.codePointAt(0) ?? 0;
      const safe = /[a-zA-Z0-9_-]/.test(char);
      const leadingDigit = index === 0 && /[0-9]/.test(char);

      if (safe && !leadingDigit) return char;
      return `\\${code.toString(16)} `;
    })
    .join('');
}

function stableId(node: LayoutNode): string | null {
  const id = node.attributes.id?.trim();
  if (!id) return null;
  if (id.includes(':r')) return null;
  if (GENERATED_ID.test(id)) return null;
  return id;
}

function stableClasses(node: LayoutNode): string[] {
  return (node.attributes.class ?? '')
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !CSS_MODULE_HASH.test(value))
    .slice(0, 3);
}

function segment(node: LayoutNode, withNthChild = false): string {
  const tag = node.tagName.toLowerCase();
  const classes = stableClasses(node);
  const classPart = classes.map((name) => `.${escapeCssIdentifier(name)}`).join('');
  const nth = withNthChild && node.nthChild ? `:nth-child(${node.nthChild})` : '';

  return `${tag}${classPart}${nth}`;
}

function ancestorChain(
  node: LayoutNode,
  nodesByIndex: Map<number, LayoutNode>,
  maxParents: number,
): LayoutNode[] {
  const chain = [node];
  let current = node;

  while (chain.length <= maxParents) {
    const parent = nodesByIndex.get(current.parentIndex);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

export async function buildStableSelector(
  node: LayoutNode,
  nodes: LayoutNode[],
  isUnique: SelectorUniquenessCheck,
): Promise<string> {
  const id = stableId(node);
  if (id) {
    const selector = `#${escapeCssIdentifier(id)}`;
    if (await isUnique(selector)) return selector;
  }

  const nodesByIndex = new Map(nodes.map((entry) => [entry.index, entry]));
  const chain = ancestorChain(node, nodesByIndex, 3);

  for (let start = chain.length - 1; start >= 0; start -= 1) {
    const selector = chain
      .slice(start)
      .map((entry) => segment(entry))
      .join(' > ');
    if (await isUnique(selector)) return selector;
  }

  for (let start = chain.length - 1; start >= 0; start -= 1) {
    const selector = chain
      .slice(start)
      .map((entry) => segment(entry, true))
      .join(' > ');

    if (await isUnique(selector)) return selector;
  }

  return chain.map((entry) => segment(entry, true)).join(' > ');
}

export function makePageUniquenessCheck(
  evaluate: (selector: string) => Promise<number>,
): SelectorUniquenessCheck {
  return async (selector: string) => {
    try {
      return (await evaluate(selector)) === 1;
    } catch {
      return false;
    }
  };
}
