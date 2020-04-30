"use strict";
const { Type, Index, Pool, capture, callHistory, forEach, partition, RingBuffer } = require('./util.js'),
types = [undefined,null,true,12.3,123n,'hello',new Date(),/regex/,Symbol(),() => 'foo',function*(){},async function(){},{},[],new Map(),new Set(),
  new ArrayBuffer(64),new SharedArrayBuffer(64),new DataView(new ArrayBuffer(64)),new Uint32Array(4),
  new Error('test'),new SyntaxError('test2'),
  Object.defineProperties(new Set(['Cannot be fooled!']), { [Symbol.toStringTag]: { value: 'Bogus' }})];
let a, f, h, i = 0, o, p, r, t = {}, u;
function elog(s) { console.log('\x1b[34m' + s + '\x1b[m'); eval(s); }
function log(...a) { console.log(...a); }

log('\n\x1b[30;42m MEANINGFUL TYPE DISCRIMINATION \x1b[m');
for (const e of types) t[i++] = { 'typeof': typeof e, 'Symbol.toStringTag': Type.tag(e), 'Type()': Type(e) }
console.table(t);

log('\n\x1b[30;42m BOUNDS-CHECKED INDEX VALIDATION \x1b[m');
elog("t = ['first','second','third']; log(t[Type.asIndex('0')], t[Type.asIndex(99, 3, 1)], t[Type.asIndex('foo', 3, 2)]);");

log('\n\x1b[30;42m CREATE AN OBJECT WITH SPECIFIED ATTRIBUTES (default: enumerable for functions, enumerable+writable for everything else) \x1b[m');
elog("t = Type.create(Object.prototype, { foo: 88, 'bar,alias1,alias2:7': 99 }); log(Object.getOwnPropertyDescriptors(t)); log(t.bar, t.alias2 = 5, t.alias1, t.bar);");
log('\x1b[32m...you can hide property values, forcing public access through accessor aliases\x1b[m');
elog(`t = Type.create(Object.prototype, { 'foo,alias1*': { value: 99, set: "if (typeof v == 'number') $v = v;" }, 'bar,alias2*': { value: 'word', set: "if (typeof v == 'string') $v = v;" }});`);
elog(`log(Object.getOwnPropertyDescriptors(t));`);
elog(`log(t.foo, t.alias1, t.bar, t.alias2);`);
elog(`t.foo = 123; t.bar = 'changed'; log(t.foo, t.alias1, t.bar, t.alias2);`);
elog(`t.foo = 'invalid'; t.bar = 235; log(t.foo, t.alias1, t.bar, t.alias2);`);
log('\x1b[32m...but you can still get direct access to the values aliased this way via a hidden property\x1b[m');
elog(`log(t); log(t.$);`);
log('\x1b[32mYou can also add properties to an existing object\x1b[m');
elog("log(Object.getOwnPropertyDescriptors(Type.add({ foo: 23 }, { bar: 83, yadda: 'something' })));");
log('\x1b[32m...or merge elements from one container to another\x1b[m');
elog("log(Type.merge(new Map([['foo',64]]), { bar: 23 }));");
log('\x1b[32m...and with fill(), you can even populate objects with values from another object...\x1b[m');
elog("t = Type.create(Object.prototype, { 'color,foregroundColor': 'black', 'bgColor,backgroundColor': 'white' });");
elog("log(Type.fill(t, { foregroundColor: 'red', backgroundColor: 'yellow', foo: 'bar' }));");
log('\x1b[32m...allowing only valid properties through, and selecting from one of more aliases.\x1b[m');

log('\n\x1b[30;42m POINTER-LIKE VALUES ALLOW POST-INCREMENT EXPRESSIONS \x1b[m');
elog("t = Index(); log(t.value, t(4), t(6), t.value, t(35), t.value);");
log('\x1b[32m...with optional ring-buffer wrapping behavior...\x1b[m');
elog("t = Index(0, 0xff); log(t(64), t(64), t(64), t(64), t(64), t.value);");
log('\x1b[32m...or block-spanning behavior (first element is block length)...\x1b[m');
elog("t = Index([300, 0, 1000]); log(t(64), t(64), t(64), t(64), t(64), t.value);");
elog("t = Index([[1000, 128], [2000,256], [3000, 256]]); log(t(64), t(64), t(64), t(64), t(64), t(64), t(64), t.value);");
log('\x1b[32m...or a user-supplied block allocator function\x1b[m');
elog("a = [1000, 2000]; i = 0;\nt = Index(() => [a[i++], 256]); log(t(64), t(64), t(64), t(64), t(64), t.value);");

log('\n\x1b[30;42m POOL KEEPS TRACK OF IDLE OBJECTS THAT ARE EXPENSIVE TO RECREATE \x1b[m');
elog("f = function() { let r = 0; for (let i = 0; i < 100000000; ++i) r += i; return r; }; p = Pool(10, f);");
elog("console.time('uncached'); t = p(); console.timeEnd('uncached'); p.free(t); console.time('cached'); t = p(); console.timeEnd('cached');");

log('\n\x1b[30;42m RETURN ONLY THE CAPTURES OF REGULAR EXPRESSIONS, WITH DEFAULT VALUES \x1b[m');
elog("log(capture('abbbbddd', /(ab*)(c+)?/, 'ab', 'c'));");
log('\x1b[32m...if dates or numbers are supplied as a default, the corresponding field is coerced to that type\x1b[m');
elog("log(capture('12345 number 2000-01-01 date', /(\\d+) (number) ([^ ]*) (date)/, 999, 999, new Date(), new Date()));");

log('\n\x1b[30;42m UNIFORM ITERATION FOR ALL CONTAINER TYPES \x1b[m');
elog("t = {}; forEach({foo: 10, bar: 20}, (v, k, a, _, i) => t[i] = { key: k, value: v }); console.table(t);");
elog("t = {}; forEach(['foo', 'bar'], (v, k, a, _, i) => t[i] = { key: k, value: v }); console.table(t);");
elog("t = {}; forEach(new Map([['foo', 10], ['bar', 20]]), (v, k, a, _, i) => t[i] = { key: k, value: v }); console.table(t);");
elog("t = {}; forEach(new Set(['foo', 'bar']), (v, k, a, _, i) => t[i] = { key: k, value: v }); console.table(t);");
log('\x1b[32mStrings can be iterated by characters\x1b[m');
elog("t = []; forEach('\u262f balance', c => t.push(c)); log(t);");
log('\x1b[32mThe accumulator allows complex tests or extractions to be written as expressions---a superset of #some, #every and #reduce...\x1b[m');
elog("log(forEach('abcdefghijklm', (v, k, a) => { if (v > 'f') a.push(v); return a; }, []));");
log('\x1b[32mA finalizer can be used to convert statements to expressions\x1b[m');
elog("log(forEach(['foo','bar'], (v, k, a) => a += `<li>${v}</li>`, '', a => `<ul>${a}</ul>`));");
log('\x1b[32mProperties are iterated over even if they\'re defined on container objects, but can be filtered out by ID parameter, or by setting max_properties to zero.\x1b[m');
elog("t = Object.defineProperties(['foo','bar'], { yadda: { enumerable: true, value: 46 }, hidden: { value: 764 }});");
elog("forEach(t, (v, k, a, t, i) => console.log(i, k, v, t));");
elog("forEach(t, (v, k, a, t, i) => console.log(i, k, v, t), null, null, null, null, null, 0);");

log('\n\x1b[30;42m YOU CAN RECORD A FUNCTION\'S CALL HISTORY FOR LATER ANALYSIS \x1b[m');
elog("f = callHistory(s => 'result of ' + s, 2); // allow 2**2 elements of history, just to test");
elog("f('first call'); f('second call'); f('third call'); f('fourth call'); f('should wrap'); f('ooops!');");
elog("console.table(f.history);");
log('\x1b[32m...but it\'s not without a cost in efficiency\x1b[m');
elog("f = i => t += i + Math.random(); h = callHistory(i => t += i + Math.random());");
elog("t = 0; console.time('raw'); for (let i = 0; i < 1000000; ++i) f(i); console.timeEnd('raw');");
elog("t = 0; console.time('rec'); for (let i = 0; i < 1000000; ++i) h(i); console.timeEnd('rec');");

log('\n\x1b[30;42m SORT A NUMBER INTO ONE OF SEVERAL BINS (PARTITIONING) \x1b[m');
elog("t = []; for (const e of [0,24,25,26,49,50,51,74,75,76,99,100,101]) t.push([e, partition(e, [[25,0],[50,1],[75,2],[100,3]], 4)]); console.log(t);");

log('\n\x1b[30;42m RING BUFFERS HAVE CONSTANT INSERT/REMOVE TIME AT BOTH ENDS \x1b[m');
log('\x1b[32m>> 64 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) a.push(i); for (let i = 0; i < 64; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) r.push(i); for (let i = 0; i < 64; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> 256 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) a.push(i); for (let i = 0; i < 256; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(9); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) r.push(i); for (let i = 0; i < 256; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> 1024 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) a.push(i); for (let i = 0; i < 1024; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(11); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) r.push(i); for (let i = 0; i < 1024; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> reverse, 64 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) a.unshift(i); for (let i = 0; i < 64; ++i) t += a.shift(); } console.timeEnd('array');");
elog("r = RingBuffer(); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) r.queue(i); for (let i = 0; i < 64; ++i) u += r.unqueue(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> reverse, 256 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) a.unshift(i); for (let i = 0; i < 256; ++i) t += a.shift(); } console.timeEnd('array');");
elog("r = RingBuffer(9); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) r.queue(i); for (let i = 0; i < 256; ++i) u += r.unqueue(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> reverse, 1024 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) a.unshift(i); for (let i = 0; i < 1024; ++i) t += a.shift(); } console.timeEnd('array');");
elog("r = RingBuffer(11); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) r.queue(i); for (let i = 0; i < 1024; ++i) u += r.unqueue(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> queue, 64 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) a.unshift(i); for (let i = 0; i < 64; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 64; ++i) r.queue(i); for (let i = 0; i < 64; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> queue, 256 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) a.unshift(i); for (let i = 0; i < 256; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(9); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 256; ++i) r.queue(i); for (let i = 0; i < 256; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
log('\x1b[32m>> queue, 1024 elements...\x1b[m');
elog("a = []; t = 0; console.time('array'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) a.unshift(i); for (let i = 0; i < 1024; ++i) t += a.pop(); } console.timeEnd('array');");
elog("r = RingBuffer(11); u = 0; console.time('ring'); for (let j = 0; j < 1024; ++j) { for (let i = 0; i < 1024; ++i) r.queue(i); for (let i = 0; i < 1024; ++i) u += r.pop(); } console.timeEnd('ring'); console.log(`${t} =? ${u}`);");
