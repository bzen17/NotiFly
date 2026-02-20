/*
  strip-comments.js
  - Recursively walks the `web/` folder and removes ALL comments from files
  - Targets: .ts, .tsx, .js, .jsx, .css, .scss
  - WARNING: destructive. Make a git commit/branch before running if you want to revert.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../web');
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);
const changed = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      walk(full);
    } else if (e.isFile()) {
      if (exts.has(path.extname(e.name))) {
        processFile(full);
      }
    }
  }
}

function stripComments(content) {
  let out = '';
  const n = content.length;
  let i = 0;
  const stack = [];
  // states: none, '"', "'", '`', '/*', '//' ; for template expressions we push a frame

  while (i < n) {
    const ch = content[i];
    const next = content[i + 1];

    const top = stack.length ? stack[stack.length - 1] : null;

    // If currently in single-line comment
    if (top === '//') {
      if (ch === '\n') {
        stack.pop();
        out += ch;
      }
      i++;
      continue;
    }
    // If in block comment
    if (top === '/*') {
      if (ch === '*' && next === '/') {
        stack.pop();
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // If in double-quote
    if (top === '"') {
      out += ch;
      if (ch === '"' && content[i - 1] !== '\\') {
        stack.pop();
      }
      i++;
      continue;
    }
    // single-quote
    if (top === "'") {
      out += ch;
      if (ch === "'" && content[i - 1] !== '\\') {
        stack.pop();
      }
      i++;
      continue;
    }
    // backtick (template)
    if (top === '`') {
      // handle ${ ... } expressions by pushing a special marker, where comments are parsed normally
      if (ch === '$' && next === '{') {
        out += '${';
        stack.push('${');
        i += 2;
        continue;
      }
      out += ch;
      if (ch === '`' && content[i - 1] !== '\\' && stack[stack.length - 1] === '`') {
        stack.pop();
      }
      i++;
      continue;
    }
    // inside template expression ${ ... }
    if (top === '${') {
      // end of expression
      if (ch === '}') {
        out += ch;
        stack.pop();
        i++;
        continue;
      }
      // otherwise treat like normal code (no special handling here)
    }

    // Not inside any quote/comment
    // detect start of strings
    if (ch === '"' || ch === "'" || ch === '`') {
      stack.push(ch);
      out += ch;
      i++;
      continue;
    }

    // detect comments
    if (ch === '/' && next === '/') {
      stack.push('//');
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      stack.push('/*');
      i += 2;
      continue;
    }

    // default
    out += ch;
    i++;
  }

  return out;
}

function processFile(full) {
  try {
    const src = fs.readFileSync(full, 'utf8');
    const stripped = stripComments(src);
    if (stripped !== src) {
      fs.writeFileSync(full, stripped, 'utf8');
      changed.push(full);
    }
  } catch (err) {
    console.error('failed', full, err.message);
  }
}

walk(ROOT);

console.log('Done. Files changed:', changed.length);
for (const f of changed) console.log('-', f);

process.exit(0);
