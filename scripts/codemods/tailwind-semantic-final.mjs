#!/usr/bin/env node
/**
 * Final pass: map remaining palette utilities to semantic tokens from tailwind-theme-extend.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../../src');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue;
      walk(p, files);
    } else if (/\.(tsx|ts)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      files.push(p);
    }
  }
  return files;
}

function buildReplacements() {
  const out = [];

  // Dark-mode error/success/info
  out.push([/\bdark:text-red-400\b/g, 'dark:text-destructive']);
  out.push([/\bdark:text-green-400\b/g, 'dark:text-success']);
  out.push([/\bdark:text-blue-400\b/g, 'dark:text-info']);

  // Modal overlay (palette-agnostic scrim)
  out.push([/\bbg-black\s+bg-opacity-50\b/g, 'bg-foreground/50']);
  out.push([/\bbg-black\/80\b/g, 'bg-foreground/80']);
  out.push([/\bbg-black\/50\b/g, 'bg-foreground/50']);

  // Toast / rings
  out.push([/\bring-black\s+ring-opacity-5\b/g, 'ring-1 ring-border']);
  out.push([/\bborder-green-400\b/g, 'border-success']);
  out.push([/\btext-green-400\b/g, 'text-success']);
  out.push([/\btext-red-400\b/g, 'text-destructive']);
  out.push([/\btext-blue-400\b/g, 'text-info']);

  // Focus rings (residual blues/ambers)
  out.push([/\bfocus:ring-blue-100\b/g, 'focus:ring-primary/20']);
  out.push([/\bring-blue-200\b/g, 'ring-primary/20']);
  out.push([/\bfocus:ring-amber-300\b/g, 'focus:ring-warning/40']);
  out.push([/\bfocus:ring-cyan-400\b/g, 'focus:ring-info']);
  out.push([/\bfocus:ring-sky-300\b/g, 'focus:ring-info']);
  out.push([/\bfocus:ring-indigo-300\b/g, 'focus:ring-primary/40']);
  out.push([/\bfocus:ring-red-400\b/g, 'focus:ring-destructive']);

  out.push([/\bhover:bg-amber-200\b/g, 'hover:bg-warning/25']);
  out.push([/\bhover:bg-amber-700\b/g, 'hover:bg-warning/90']);
  out.push([/\bbg-amber-600\b/g, 'bg-warning']);
  out.push([/\bbg-amber-500\b/g, 'bg-warning']);
  out.push([/\bborder-amber-500\b/g, 'border-warning']);
  out.push([/\bbg-amber-400\b/g, 'bg-warning']);

  // Purple / indigo CTAs → primary
  out.push([/\bbg-purple-600\b/g, 'bg-primary']);
  out.push([/\bhover:bg-purple-700\b/g, 'hover:bg-primary/90']);
  out.push([/\bbg-indigo-600\b/g, 'bg-primary']);
  out.push([/\bhover:bg-indigo-700\b/g, 'hover:bg-primary/90']);
  out.push([/\bborder-indigo-300\b/g, 'border-primary/40']);
  out.push([/\bborder-indigo-200\b/g, 'border-primary/30']);
  out.push([/\bborder-indigo-600\b/g, 'border-primary']);

  // Sky / cyan / violet / teal / purple node chrome → info + border
  for (const x of ['sky', 'cyan', 'violet', 'teal', 'purple']) {
    out.push([new RegExp(`\\bborder-${x}-300\\b`, 'g'), 'border-info/40']);
    out.push([new RegExp(`\\bborder-${x}-200\\b`, 'g'), 'border-info/30']);
    out.push([new RegExp(`\\bborder-${x}-100\\b`, 'g'), 'border-info/20']);
  }
  out.push([/\btext-cyan-800\b/g, 'text-info']);
  out.push([/\btext-cyan-900\b/g, 'text-info']);
  out.push([/\btext-sky-800\b/g, 'text-info']);
  out.push([/\bbg-sky-500\b/g, 'bg-info']);
  out.push([/\bbg-sky-600\b/g, 'bg-info']);
  out.push([/\bhover:bg-sky-700\b/g, 'hover:bg-info/90']);
  out.push([/\bhover:text-sky-800\b/g, 'hover:text-info']);

  // Green / red buttons
  out.push([/\bbg-green-600\b/g, 'bg-success']);
  out.push([/\bhover:bg-green-700\b/g, 'hover:bg-success/90']);
  out.push([/\bbg-green-500\b/g, 'bg-success']);
  out.push([/\bbg-red-600\b/g, 'bg-destructive']);
  out.push([/\bhover:bg-red-700\b/g, 'hover:bg-destructive/90']);
  out.push([/\bhover:bg-green-200\b/g, 'hover:bg-success/25']);
  out.push([/\bhover:bg-red-200\b/g, 'hover:bg-destructive/25']);
  out.push([/\bhover:bg-blue-200\b/g, 'hover:bg-primary/25']);
  out.push([/\bborder-amber-100\b/g, 'border-warning/25']);
  out.push([/\bborder-green-100\b/g, 'border-success/25']);

  // Dividers
  out.push([/\bdivide-gray-50\b/g, 'divide-border/60']);
  out.push([/\bdivide-y\s+divide-gray-50\b/g, 'divide-y divide-border/60']);

  // Shadows on selection
  out.push([/\bshadow-blue-100\b/g, 'shadow-sm']);

  // Status dots & handles
  out.push([/\bbg-green-400\b/g, 'bg-success']);
  out.push([/\bbg-green-500\b/g, 'bg-success']);
  out.push([/\bbg-amber-400\b/g, 'bg-warning']);
  out.push([/\bbg-amber-500\b/g, 'bg-warning']);
  out.push([/\bbg-red-500\b/g, 'bg-destructive']);
  out.push([/\bbg-indigo-400\b/g, 'bg-info']);
  out.push([/\bbg-violet-500\b/g, 'bg-primary']);

  // Specific: text-white on semantic buttons (pairs) — run before loose `text-white` fixes
  out.push([/\bbg-primary\s+hover:bg-primary\s+text-white\b/g, 'bg-primary hover:bg-primary text-primary-foreground']);
  out.push([/\bbg-success\s+hover:bg-success\/90\s+text-white\b/g, 'bg-success hover:bg-success/90 text-success-foreground']);
  out.push([/\bbg-primary\s+hover:bg-primary\/90\s+text-white\b/g, 'bg-primary hover:bg-primary/90 text-primary-foreground']);
  out.push([/\bbg-red-600\s+hover:bg-red-700\s+text-white\b/g, 'bg-destructive hover:bg-destructive/90 text-destructive-foreground']);
  out.push([/\bbg-green-600\s+hover:bg-green-700\s+text-white\b/g, 'bg-success hover:bg-success/90 text-success-foreground']);
  out.push([/\bbg-primary\s+text-white\b/g, 'bg-primary text-primary-foreground']);

  out.push([/\bhover:text-gray-100\b/g, 'hover:text-foreground']);

  out.push([/\btext-orange-400\b/g, 'text-warning']);
  out.push([/\bbg-blue-400\b/g, 'bg-info']);

  // Theme matrix / chips (exact strings)
  out.push([
    /\? 'bg-amber-500 text-white border-amber-500'/g,
    "? 'bg-warning text-warning-foreground border-warning'",
  ]);
  out.push([/\? 'bg-muted text-white border-border'/g, "? 'bg-foreground text-background border-border'"]);
  out.push([
    /\? 'bg-indigo-600 text-white border-indigo-600'/g,
    "? 'bg-primary text-primary-foreground border-primary'",
  ]);

  return out;
}

const REPLACEMENTS = buildReplacements();

let changedFiles = 0;
for (const file of walk(srcRoot)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const [re, to] of REPLACEMENTS) {
    s = s.replace(re, to);
  }

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    changedFiles += 1;
  }
}

console.log(`tailwind-semantic-final: ${changedFiles} files updated.`);
