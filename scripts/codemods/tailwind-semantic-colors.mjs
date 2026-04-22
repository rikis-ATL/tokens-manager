#!/usr/bin/env node
/**
 * Replaces palette-based Tailwind color utilities with theme-centric semantic tokens
 * (foreground, muted, card, primary, destructive, success, warning, info, border, etc.)
 * so the app responds to globals.css + app theme injection.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../../src');

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
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

const NEUTRALS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];

/** @type {Array<[RegExp, string]>} — order matters: longer / opacity variants first */
function buildReplacements() {
  const out = [];

  // High-specificity first (before bg-gray-* single-token rules)
  out.push([/\bbg-gray-900 text-green-300\b/g, 'bg-foreground text-success']);
  out.push([/\bbg-gray-900 text-gray-100\b/g, 'bg-foreground text-background']);
  out.push([/\bbg-gray-800 text-muted-foreground\b/g, 'bg-card text-muted-foreground']);
  out.push([/\bhover:bg-gray-700 hover:text-white\b/g, 'hover:bg-muted hover:text-foreground']);
  out.push([/\bbg-gray-900 text-white\b/g, 'bg-primary text-primary-foreground']);
  out.push([/\bbg-gray-800 text-white\b/g, 'bg-card text-card-foreground']);

  for (const n of NEUTRALS) {
    // text with opacity
    out.push([new RegExp(`\\btext-${n}-900/([0-9]+)\\b`, 'g'), 'text-foreground/$1']);
    out.push([new RegExp(`\\btext-${n}-800/([0-9]+)\\b`, 'g'), 'text-foreground/$1']);
    out.push([new RegExp(`\\btext-${n}-700/([0-9]+)\\b`, 'g'), 'text-muted-foreground/$1']);
    out.push([new RegExp(`\\btext-${n}-600/([0-9]+)\\b`, 'g'), 'text-muted-foreground/$1']);
    out.push([new RegExp(`\\btext-${n}-500/([0-9]+)\\b`, 'g'), 'text-muted-foreground/$1']);
    out.push([new RegExp(`\\btext-${n}-400/([0-9]+)\\b`, 'g'), 'text-muted-foreground/$1']);

    out.push([new RegExp(`\\btext-${n}-900\\b`, 'g'), 'text-foreground']);
    out.push([new RegExp(`\\btext-${n}-800\\b`, 'g'), 'text-foreground']);
    out.push([new RegExp(`\\btext-${n}-700\\b`, 'g'), 'text-foreground']);
    out.push([new RegExp(`\\btext-${n}-600\\b`, 'g'), 'text-muted-foreground']);
    out.push([new RegExp(`\\btext-${n}-500\\b`, 'g'), 'text-muted-foreground']);
    out.push([new RegExp(`\\btext-${n}-400\\b`, 'g'), 'text-muted-foreground']);
    out.push([new RegExp(`\\btext-${n}-300\\b`, 'g'), 'text-muted-foreground']);
    out.push([new RegExp(`\\btext-${n}-200\\b`, 'g'), 'text-muted-foreground']);

    out.push([new RegExp(`\\bbg-${n}-50/([0-9]+)\\b`, 'g'), 'bg-muted/$1']);
    out.push([new RegExp(`\\bbg-${n}-100/([0-9]+)\\b`, 'g'), 'bg-muted/$1']);
    out.push([new RegExp(`\\bbg-${n}-50\\b`, 'g'), 'bg-muted/50']);
    out.push([new RegExp(`\\bbg-${n}-100\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-200\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-300\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-400\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-500\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-600\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-700\\b`, 'g'), 'bg-muted']);
    out.push([new RegExp(`\\bbg-${n}-800\\b`, 'g'), 'bg-card']);
    out.push([new RegExp(`\\bbg-${n}-900\\b`, 'g'), 'bg-foreground']);

    out.push([new RegExp(`\\bborder-${n}-100/([0-9]+)\\b`, 'g'), 'border-border/$1']);
    out.push([new RegExp(`\\bborder-${n}-200/([0-9]+)\\b`, 'g'), 'border-border/$1']);
    out.push([new RegExp(`\\bborder-${n}-100\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-200\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-300\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-400\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-500\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-600\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-700\\b`, 'g'), 'border-border']);
    out.push([new RegExp(`\\bborder-${n}-800\\b`, 'g'), 'border-border']);

    out.push([new RegExp(`\\bdivide-${n}-200\\b`, 'g'), 'divide-border']);
    out.push([new RegExp(`\\bdivide-${n}-100\\b`, 'g'), 'divide-border']);

    out.push([new RegExp(`\\bring-${n}-300\\b`, 'g'), 'ring-ring']);
    out.push([new RegExp(`\\bring-${n}-200\\b`, 'g'), 'ring-border']);

    out.push([new RegExp(`\\bstroke-${n}-[0-9]+\\b`, 'g'), 'stroke-muted-foreground']);
    out.push([new RegExp(`\\bfill-${n}-[0-9]+\\b`, 'g'), 'fill-muted-foreground']);

    out.push([new RegExp(`\\bfrom-${n}-50\\b`, 'g'), 'from-muted/50']);
    out.push([new RegExp(`\\bto-${n}-50\\b`, 'g'), 'to-muted/50']);
    out.push([new RegExp(`\\bvia-${n}-50\\b`, 'g'), 'via-muted/50']);
  }

  // dark: neutrals (Tailwind darkMode: 'class' + html.dark)
  for (const n of NEUTRALS) {
    out.push([new RegExp(`\\bdark:text-${n}-100\\b`, 'g'), 'dark:text-foreground']);
    out.push([new RegExp(`\\bdark:text-${n}-200\\b`, 'g'), 'dark:text-foreground']);
    out.push([new RegExp(`\\bdark:text-${n}-300\\b`, 'g'), 'dark:text-muted-foreground']);
    out.push([new RegExp(`\\bdark:text-${n}-400\\b`, 'g'), 'dark:text-muted-foreground']);
    out.push([new RegExp(`\\bdark:bg-${n}-800\\b`, 'g'), 'dark:bg-muted']);
    out.push([new RegExp(`\\bdark:bg-${n}-900\\b`, 'g'), 'dark:bg-card']);
    out.push([new RegExp(`\\bdark:bg-${n}-950\\b`, 'g'), 'dark:bg-background']);
    out.push([new RegExp(`\\bdark:border-${n}-700\\b`, 'g'), 'dark:border-border']);
    out.push([new RegExp(`\\bdark:border-${n}-800\\b`, 'g'), 'dark:border-border']);
  }

  // Blue → primary
  const blues = [
    ['\\bbg-blue-950\\b', 'bg-primary'],
    ['\\bbg-blue-900\\b', 'bg-primary'],
    ['\\bbg-blue-800\\b', 'bg-primary'],
    ['\\bbg-blue-700\\b', 'bg-primary'],
    ['\\bbg-blue-600\\b', 'bg-primary'],
    ['\\bbg-blue-500\\b', 'bg-primary'],
    ['\\bhover:bg-blue-800\\b', 'hover:bg-primary/90'],
    ['\\bhover:bg-blue-700\\b', 'hover:bg-primary/90'],
    ['\\bhover:bg-blue-600\\b', 'hover:bg-primary/90'],
    ['\\bhover:bg-blue-50\\b', 'hover:bg-primary/10'],
    ['\\bhover:bg-blue-100\\b', 'hover:bg-primary/15'],
    ['\\bbg-blue-50\\b', 'bg-primary/10'],
    ['\\bbg-blue-100\\b', 'bg-primary/15'],
    ['\\btext-blue-900\\b', 'text-primary'],
    ['\\btext-blue-800\\b', 'text-primary'],
    ['\\btext-blue-700\\b', 'text-primary'],
    ['\\btext-blue-600\\b', 'text-primary'],
    ['\\btext-blue-500\\b', 'text-primary'],
    ['\\bhover:text-blue-800\\b', 'hover:text-primary'],
    ['\\bhover:text-blue-700\\b', 'hover:text-primary'],
    ['\\bhover:text-blue-600\\b', 'hover:text-primary'],
    ['\\bborder-blue-800\\b', 'border-primary'],
    ['\\bborder-blue-700\\b', 'border-primary'],
    ['\\bborder-blue-600\\b', 'border-primary'],
    ['\\bborder-blue-500\\b', 'border-primary'],
    ['\\bborder-blue-400\\b', 'border-primary'],
    ['\\bborder-blue-300\\b', 'border-primary'],
    ['\\bborder-blue-200\\b', 'border-primary'],
    ['\\bborder-blue-100\\b', 'border-primary'],
    ['\\bring-blue-500\\b', 'ring-primary'],
    ['\\bring-blue-400\\b', 'ring-primary'],
  ];
  for (const [re, to] of blues) {
    out.push([new RegExp(re, 'g'), to]);
  }

  // Red → destructive
  const reds = [
    ['\\btext-red-900\\b', 'text-destructive'],
    ['\\btext-red-800\\b', 'text-destructive'],
    ['\\btext-red-700\\b', 'text-destructive'],
    ['\\btext-red-600\\b', 'text-destructive'],
    ['\\btext-red-500\\b', 'text-destructive'],
    ['\\bbg-red-100\\b', 'bg-destructive/15'],
    ['\\bbg-red-50\\b', 'bg-destructive/10'],
    ['\\bborder-red-500\\b', 'border-destructive'],
    ['\\bborder-red-400\\b', 'border-destructive'],
    ['\\bborder-red-300\\b', 'border-destructive'],
    ['\\bborder-red-200\\b', 'border-destructive'],
    ['\\bring-red-500\\b', 'ring-destructive'],
  ];
  for (const [re, to] of reds) {
    out.push([new RegExp(re, 'g'), to]);
  }

  // Green → success
  const greens = [
    ['\\btext-green-900\\b', 'text-success'],
    ['\\btext-green-800\\b', 'text-success'],
    ['\\btext-green-700\\b', 'text-success'],
    ['\\btext-green-600\\b', 'text-success'],
    ['\\btext-green-500\\b', 'text-success'],
    ['\\bbg-green-100\\b', 'bg-success/15'],
    ['\\bbg-green-50\\b', 'bg-success/10'],
    ['\\bborder-green-500\\b', 'border-success'],
    ['\\bborder-green-300\\b', 'border-success'],
    ['\\bborder-green-200\\b', 'border-success'],
  ];
  for (const [re, to] of greens) {
    out.push([new RegExp(re, 'g'), to]);
  }

  // Amber / orange / yellow → warning
  for (const c of ['amber', 'orange', 'yellow']) {
    out.push([new RegExp(`\\btext-${c}-900\\b`, 'g'), 'text-warning']);
    out.push([new RegExp(`\\btext-${c}-800\\b`, 'g'), 'text-warning']);
    out.push([new RegExp(`\\btext-${c}-700\\b`, 'g'), 'text-warning']);
    out.push([new RegExp(`\\btext-${c}-600\\b`, 'g'), 'text-warning']);
    out.push([new RegExp(`\\btext-${c}-500\\b`, 'g'), 'text-warning']);
    out.push([new RegExp(`\\bbg-${c}-100\\b`, 'g'), 'bg-warning/15']);
    out.push([new RegExp(`\\bbg-${c}-50\\b`, 'g'), 'bg-warning/10']);
    out.push([new RegExp(`\\bborder-${c}-400\\b`, 'g'), 'border-warning']);
    out.push([new RegExp(`\\bborder-${c}-300\\b`, 'g'), 'border-warning']);
    out.push([new RegExp(`\\bborder-${c}-200\\b`, 'g'), 'border-warning']);
  }

  // Purple / violet / indigo / cyan / sky / teal (info / accent)
  for (const c of ['indigo', 'violet', 'purple', 'cyan', 'sky', 'teal']) {
    out.push([new RegExp(`\\btext-${c}-700\\b`, 'g'), 'text-info']);
    out.push([new RegExp(`\\btext-${c}-600\\b`, 'g'), 'text-info']);
    out.push([new RegExp(`\\btext-${c}-500\\b`, 'g'), 'text-info']);
    out.push([new RegExp(`\\bbg-${c}-50\\b`, 'g'), 'bg-info/10']);
    out.push([new RegExp(`\\bbg-${c}-100\\b`, 'g'), 'bg-info/15']);
  }

  // White / black surfaces
  out.push([/\bbg-white\b/g, 'bg-card']);
  out.push([/\bborder-white\b/g, 'border-border']);
  out.push([/\btext-black\b/g, 'text-foreground']);

  // Placeholder / focus rings
  out.push([/\bplaceholder-gray-400\b/g, 'placeholder-muted-foreground']);
  out.push([/\bfocus:ring-slate-400\b/g, 'focus:ring-ring']);
  out.push([/\bfocus:ring-emerald-400\b/g, 'focus:ring-success']);

  // Subtle borders
  out.push([/\bborder-gray-50\b/g, 'border-border/60']);

  // Emerald (same as success)
  for (const p of [
    ['\\btext-emerald-95[0-9]\\b', 'text-success'],
    ['\\btext-emerald-900\\b', 'text-success'],
    ['\\btext-emerald-800\\b', 'text-success'],
    ['\\btext-emerald-700\\b', 'text-success'],
    ['\\btext-emerald-600\\b', 'text-success'],
    ['\\btext-emerald-500\\b', 'text-success'],
    ['\\bbg-emerald-100\\b', 'bg-success/15'],
    ['\\bbg-emerald-50\\b', 'bg-success/10'],
    ['\\bborder-emerald-400\\b', 'border-success'],
    ['\\bborder-emerald-300\\b', 'border-success'],
    ['\\bborder-emerald-200\\b', 'border-success'],
    ['\\bbg-emerald-600\\b', 'bg-success'],
    ['\\bhover:bg-emerald-700\\b', 'hover:bg-success/90'],
    ['\\bbg-emerald-400\\b', 'bg-success'],
  ]) {
    out.push([new RegExp(p[0], 'g'), p[1]]);
  }

  // Rose → destructive (distinct hue for graph nodes)
  for (const p of [
    ['\\btext-rose-700\\b', 'text-destructive'],
    ['\\btext-rose-600\\b', 'text-destructive'],
    ['\\btext-rose-500\\b', 'text-destructive'],
    ['\\btext-rose-300\\b', 'text-destructive/80'],
    ['\\bbg-rose-100\\b', 'bg-destructive/15'],
    ['\\bbg-rose-50\\b', 'bg-destructive/10'],
    ['\\bbg-rose-50/50\\b', 'bg-destructive/10'],
    ['\\bborder-rose-300\\b', 'border-destructive'],
    ['\\bborder-rose-200\\b', 'border-destructive'],
    ['\\bhover:text-rose-500\\b', 'hover:text-destructive'],
  ]) {
    out.push([new RegExp(p[0], 'g'), p[1]]);
  }

  // Pink → primary accent
  for (const p of [
    ['\\btext-pink-700\\b', 'text-primary'],
    ['\\btext-pink-500\\b', 'text-primary'],
    ['\\bbg-pink-50\\b', 'bg-primary/10'],
    ['\\bborder-pink-300\\b', 'border-primary'],
    ['\\bborder-pink-200\\b', 'border-primary'],
  ]) {
    out.push([new RegExp(p[0], 'g'), p[1]]);
  }

  // Dark mode leftovers
  out.push([/\bdark:hover:text-gray-100\b/g, 'dark:hover:text-foreground']);
  out.push([/\bhover:text-gray-100\b/g, 'hover:text-foreground']);

  // Residual blues (400/200/100 shades)
  out.push([/\btext-blue-400\b/g, 'text-info']);
  out.push([/\bdark:text-blue-400\b/g, 'dark:text-info']);
  out.push([/\bbg-blue-400\b/g, 'bg-info']);
  out.push([/\bfocus:ring-blue-100\b/g, 'focus:ring-primary/20']);
  out.push([/\bring-blue-200\b/g, 'ring-primary/30']);
  out.push([/\bhover:bg-blue-200\b/g, 'hover:bg-primary/20']);

  // Amber / indigo chips (themes matrix)
  out.push([/\bbg-amber-500 text-white border-amber-500\b/g, 'bg-warning text-warning-foreground border-warning']);
  out.push([/\bbg-indigo-600 text-white border-indigo-600\b/g, 'bg-info text-info-foreground border-info']);

  return out;
}

const REPLACEMENTS = buildReplacements();

let totalFiles = 0;
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
  totalFiles += 1;
}

console.log(`tailwind-semantic-colors: ${changedFiles}/${totalFiles} files updated.`);
