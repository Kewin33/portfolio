#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'config', 'hardcoded-ui-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

const FILE_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'kjemumfrageauswertung.vercel.app']);

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function collectFindings(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const findings = [];

  const nodeTextRe = /<(?:button|h[1-6]|p|span|label|a|div|option|strong)\b[^>]*>\s*([^<{]*[A-Za-z\u00C0-\u017F][^<{]*)\s*<\/(?:button|h[1-6]|p|span|label|a|div|option|strong)>/g;
  const attrRe = /\b(?:aria-label|placeholder|title)\s*=\s*"([^"{]*[A-Za-z\u00C0-\u017F][^"]*)"/g;
  const dialogRe = /\b(?:alert|confirm|prompt)\(\s*(['"`])([^'"`]*[A-Za-z\u00C0-\u017F][^'"`]*)\1\s*\)/g;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    for (const re of [nodeTextRe, attrRe, dialogRe]) {
      re.lastIndex = 0;
      let match = re.exec(line);
      while (match) {
        const raw = normalizeText(match[1] ?? match[2] ?? '');
        if (raw.length > 0) {
          findings.push(`${rel}:${i + 1}:${raw}`);
        }
        match = re.exec(line);
      }
    }
  }

  return findings;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { version: 1, findings: [] };
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(findings) {
  const dir = path.dirname(BASELINE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    findings,
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

if (!fs.existsSync(SRC_DIR)) {
  console.error('Missing src directory:', SRC_DIR);
  process.exit(1);
}

const files = walk(SRC_DIR);
const currentFindings = files.flatMap((f) => collectFindings(f)).sort();

if (UPDATE) {
  writeBaseline(currentFindings);
  console.log(`Baseline updated with ${currentFindings.length} entries.`);
  process.exit(0);
}

const baseline = readBaseline();
const baselineSet = new Set((baseline.findings || []).map(String));
const newFindings = currentFindings.filter((entry) => !baselineSet.has(entry));

if (newFindings.length > 0) {
  console.error('New hardcoded UI text found (not in baseline):\n');
  for (const finding of newFindings) {
    console.error(`- ${finding}`);
  }
  console.error('\nIf these are intentional, run: npm run check:i18n-hardcoded:update');
  process.exit(1);
}

console.log(`No new hardcoded UI text. Checked ${files.length} files.`);
