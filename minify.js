const fs = require('fs');
if (process.argv[2] === undefined) { console.log('usage: node minify <source.js> [<target.js>]'); return; }
let source = fs.readFileSync(process.argv[2],'utf8');
// remove comments; leave blank lines so line numbers in the compressed file will match the source file
function newlines(s) { let r = ''; for (let i = 0; i < s.length; ++i) if (s[i] == '\n') r += '\n'; return r; }
let a = source.replace(/\/\*(.*?)\*\//sg, (_,m) => newlines(m)).replace(/(.*?)\/\/.*\n/g, (_,m) => m + '\n');
// protect regular expression delimiters
a = a.replace(/\/((?:[^\\\/]|\\.)*)\/([gimsuy]*\s*[)}\].,;])/sg, (_,m,n) => `\x1d${m}\x1d${n ? n : ''}`);
// protect spaces in strings and regular expressions from mangling
let b = '', q = 0, l = [];
function notEsc(a, i) { let j = 1; while (a[--i] == '\\') ++j; return j % 2; }
for (let i = 0; i < source.length; ++i) if (a[i]) switch (q) {
  case 1: b += a[i] == ' ' ? '\x1f' : a[i]; if (a[i] == '"' && notEsc(a, i)) q = 0; continue;
  case 2: b += a[i] == ' ' ? '\x1f' : a[i]; if (a[i] == "'" && notEsc(a, i)) q = 0; continue;
  case 3: b += a[i] == ' ' ? '\x1f' : a[i]; if (a[i] == '\x1d' && notEsc(a, i)) q = 0; continue;
  case 4: b += a[i] == ' ' ? '\x1f' : a[i]; if (a[i] == '`' && notEsc(a, i)) q = 0; if (a[i] == '{' && a[i - 1] == '$' && notEsc(a, i - 1)) { q = 0; l.push(4); } continue;
  default: if (a[i] != '\f') b += a[i];
    if (a[i] == '}' && l.length) q = l.pop();
    else if (a[i] == '"') q = 1;
    else if (a[i] == "'") q = 2;
    else if (a[i] == '\x1d') q = 3;
    else if (a[i] == '`' && a[i + 1] != '\f') { q = 4; l.push(0); }
}
// ...also protect newlines (even without the requirement to match source and target line numbers, newlines would still be preferred over semicolons for the simple reason that newlines
// are a delimiter, and eliding them would sometimes require them to be replaced with a semicolon, which is pointless and difficult to achieve with the simple RegEx system used here)
b = b.replace(/\n[ \t]*/g, '\x1e').replace(/\;\x1e/g, '\x1e');
// get rid of non-delimiting whitespace
b = b.replace(/([`~!@#%^&*()\-=+[\]{}|;:,.<>/?'"])\s+/g, (_,m) => m).replace(/\s+([`~!@#%^&*()\-=+[\]{}|;:,.<>/?'"])/g, (_,m) => m);
// get rid of non-delimiting semicolons
b = b.replace(/\;([)}\]])/g, (_,m) => m);
// ensure stict mode clauses have canonical form
b = b.replace(/(\'use strict\'|\"use strict\")(.)/sg, (_,m,c) => m + (c == ';' ? c : ';' + c));
// optimize aliased property access by using the fastest accessor (this code is fragile, but making it robust would require a parser)
let list = [...b.matchAll(/(?<!case\s*)['"]([^'"]+)['"]\:/g)];
for (const e of list) {
  let [k, ...aliases] = e[1].split(','); k = /[^$_0-9a-zA-Z]/.test(k) ? `this['${k}']` : /^\d/.test(k) ? `this[${k}]` : 'this.' + k;
  for (const a of aliases) b = b.replace(new RegExp(`this\\.${a}([^$_0-9a-zA-Z])|this\\[['"]?${a}['"]?\\]`, 'g'), (_,m) => k + m);
}
// undo string protection and convert newlines back
let target = b.replace(/\x1f/g, ' ').replace(/\x1e/g, '\n').replace(/\x1d/g, '/');
// ...done
console.error(`Source length: ${source.length}\nTarget length: ${target.length}\n`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], target); else console.log(target);
