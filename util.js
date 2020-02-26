// ECMAScript Utilities
// Copyright 2019 Kevin M. Kilbride (The Undercat)
// License: MIT
const $UC_esutil = (function() {'use strict';
  function type(o, a) {
    if (o === undefined) return 'Undefined';
    if (o === null) return 'Null';
    if (a && o[Symbol.toStringTag]) return o[Symbol.toStringTag];
    const p = Object.getPrototypeOf(o);
    if (p == null) return 'Object';
    if (p[Symbol.toStringTag]) return p[Symbol.toStringTag];
    return typeof p.constructor == 'function' ? p.constructor.name : 'Object';
  }
  const kre = /^([^:?!]+)\:?([?!])?([0-7])?$/;
  function fixPD(o, ta = 11, sa = 1) {
    const pd = Object.getOwnPropertyDescriptors(o);
    for (const [k, v] of Object.entries(pd)) {
      if ((((v.configurable ? 4 : 0) + (v.writable ? 2 : 0) + (v.enumerable ? 1 : 0)) & sa) != sa) { delete pd[k]; continue; }
      const m = k.match(kre); if (m) {
        const [p, ...a] = m[1].split(','), t = m[3] !== undefined ? Number(m[3]) : ta;
        if (m[2] && !('value' in v)) throw new Error('Derived getter/setter must be from a value, not a getter/setter itself.');
        switch (m[2]) {
          case '?': if (!(p in pd)) pd[p] = {};
            if (typeof v.value != 'function') throw new Error(`Value for derived getter '${k}' must be a function, not: ${v.value}`);
            if (!('value' in pd[p])) pd[p].get = v.value; else throw new Error(`Cannot derive getter '${p}'; property already has value '${pd[p].value}'`); break;
          case '!': if (!(p in pd)) pd[p] = {};
            if (typeof v.value != 'function') throw new Error(`Value for derived setter '${k}' must be a function, not: ${v.value}`);
            if (!('value' in pd[p])) pd[p].set = v.value; else throw new Error(`Cannot derive setter '${p}'; property already has value '${pd[p].value}'`); break;
          default: if (!(p in pd)) pd[p] = {}; if ('value' in v) pd[p].value = v.value; if ('get' in v) pd[p].get = v.get; if ('set' in v) pd[p].set = v.set;
        }
        pd[p].enumerable = (t & 1) != 0;
        if ('value' in pd[p]) pd[p].writable = (t & 2) != 0;
        pd[p].configurable = (t & 4) != 0;
        for (let e of a) { e = e.trim(); if (!(e in pd)) { pd[e] = { get: function() { return this[`${p}`]; }, set: function(v) { this[`${p}`] = v; }}}}
        if (p != k) delete pd[k]; continue;
    } } return pd;
  }
  function create(p, s, ta, sa = 1) { return Object.create(p, fixPD(s, ta, sa)); }
  function add(t, s, ta, sa = 1) { return Object.defineProperties(t, fixPD(s, ta, sa)); }
  function forEach(o, f, fs, fe, c, t = o, e, p, i = 0) {
    let a = (typeof fs == 'function' ? fs.call(t, o) : fs), I = i, r; fe = fe || (a => a);
    if (typeof e != 'number' || e < 0) e = Number.MAX_SAFE_INTEGER;
    if (typeof p != 'number' || p < 0) p = Number.MAX_SAFE_INTEGER;
    switch (type(o)) {
      case 'String':
        if (c) { for (let j = 0; j < o.length; ++j) { if (--e < 0) break; if ((r = f.call(t, o[j], undefined, a, 4, j)) !== undefined) { if (r == null) break; else a = r; }}}
        else for (const c of o) { if (--e < 0) break; if ((r = f.call(t, c, undefined, a, 5, i++)) !== undefined) { if (r == null) break; else a = r; }}
        return fe.call(t, a, i - I, e < 0, false, o);
      case 'Null':
      case 'Undefined': return fe.call(t, a, 0, 0, 0, o);
      case 'Map': for (const [k, v] of o) { if (--e < 0) break; if ((r = f.call(t, v, k, a, 1, i++)) !== undefined) { if (r == null) break; else a = r; }} break;
      case 'Array': for (const [k, v] of o.entries()) { if (--e < 0) break; if ((r = f.call(t, v, k, a, 2, i++)) !== undefined) { if (r == null) break; else a = r; }}
        if (p) for (const [k, v] of Object.entries(o)) { if (--p < 0) break; if (isFinite(k) || k == 'length') continue; if ((r = f.call(t, v, k, a, 0, i++)) !== undefined) { if (r == null) break; else a = r; }}
        return fe.call(t, a, i - I, e < 0, p < 0, o);
      case 'Set': for (const v of o) { if (--e < 0) break; if ((r = f.call(t, v, v, a, 3, i++)) !== undefined) { if (r == null) break; else a = r; }} break;
      case 'Function':
      case 'AsyncFunction':
      case 'GeneratorFunction':
        if (p) for (const [k, v] of Object.entries(o)) {
          if (--p < 0) break;
          if (k == 'name' || k == 'length' || k == 'caller' || k == 'arguments' || k == 'prototype') continue;
          if ((r = f.call(t, v, k, a, 0, i++)) !== undefined) { if (r == null) break; else a = r; }
        } return fe.call(t ,a, i - I, e < 0, p < 0, o);
      default: if (typeof o != 'object') return fe.call(t, f.call(t, o, undefined, a, -1, 0), 1, 0, 0, o);
    }
    if (p) for (const [k, v] of Object.entries(o)) { if (--p < 0) break; if ((r = f.call(t, v, k, a, 0, i++)) !== undefined) { if (r == null) break; else a = r; }}
    return fe.call(t, a, i - I, e < 0, p < 0, o);
  }

  return {
    Index: function(o, ...a) { let v = 0, c = 0, f;
      switch (type(o)) {
        case 'Undefined':
        case 'Null': f = function(i = 1) { let t = v; v += i; c += i; return t; }; break;
        case 'Number': v = o;
          if (typeof a[0] != 'number' || a[0] < 63) throw new Error('Invalid mask.');
          f = function(i = 1) { let t = v; v += i; c += i; if (v != (v & a[0])) { v = 0; if (v + i != ((v + i) & a[0])) throw new Error('Index exceeds ring span.'); } return t; }
          break;
        case 'Array':
          if (Array.isArray(o[0])) { let k = 0; v = o[0][0]; f = function(i = 1) { while (v + i > o[k][0] + o[k][1]) v = o[++k][0]; let t = v; v += i; c += i; return t; }}
          else { let k = 1; v = o[1]; f = function(i = 1) { while (v + i > o[k] + o[0]) v = o[++k]; let t = v; v += i; c += i; return t; }}
          break;
        case 'Function': { let [b, l] = o(null, null, ...a); v = b; f = function(i = 1) { if (v + i > b + l) { [b, l] = o(b, l, ...a); v = b; } let t = v; v += i; c += i; return t; }} break;
        default: throw new TypeError('Index: invalid parameter type.');
      }
      return add(f, {
        'value?': () => v,
        'value!': n => v = n,
        'octets?': () => c,
        reset: () => c = 0
      });
    },
    Pool: function(max, alloc, ...a) { const pool = [];
      return new Proxy(alloc, {
        get: (t, p) => p == 'free' ? (o => { if (pool.length < max) pool.push(o); }) : undefined,
        apply: (t, s) => pool.length == 0 ? new t(...a) : pool.pop()
      });
    },
    RingBuffer: function(e = 8) {
      if (e > 30) throw new RangeError('Cannot allocate RingBuffer larger than 2^30 elements.');
      return create(Object.prototype, {
        [Symbol.toStringTag]: 'RingBuffer',
        'a:0': new Array(2**e).fill(0),
        'm:0': 2**e - 1,
        'h:2': 0,
        't:2': 1,
        unqueue: (function() { let i; return (i = (this.t - 1) & this.m) == this.h ? undefined : this.a[this.t = i] }),
        queue: (function(v) { let i; return (i = (this.t + 1) & this.m) == this.h ? false : (this.a[this.t] = v, this.t = i, true) }),
        tail: (function() { let i; return (i = (this.t - 1) & this.m) == this.h ? undefined : this.a[i] }),
        head: (function() { let i; return (i = (this.h + 1) & this.m) == this.t ? undefined : this.a[i] }),
        push: (function(v) { let i; return (i = (this.h - 1) & this.m) == this.t ? false : (this.a[this.h] = v, this.h = i, true) }),
        pop: (function() { let i; return (i = (this.h + 1) & this.m) == this.t ? undefined : this.a[this.h = i] }),
        skip: (function() { let i; return (i = (this.h + 1) & this.m) == this.t ? undefined : (this.h = i, i = (this.h + 1) & this.m) == this.t ? undefined : this.a[this.h = i] }),
    })},
    Type: add(type, {
      asIndex: function(o, m = 2**30 - 1, d, t) { return Number.isFinite(t = Math.round(Number(o))) && t >= 0 && t < m ? t : d },
      asMap: function asMap(o, r) { let t;
        switch (type(o)) {
          case 'Map': return new Map(o);
          case 'Set':
          case 'Array': t = new Map(); for (const [i, k] of o.entries()) t.set(k, i); return t;
          case 'Object': t = new Map(); for (const [k, v] of Object.entries(o)) t.set(k, v);
            if (r === true || (typeof r == 'number' && r > 0)) t.forEach((v, k) => t.set(k, asMap(v, r === true ? r : r - 1))); return t;
          default: return o;
      } },
      tag: function(o) { return type(o, true); },
      getPD: function(o) { return Object.getOwnPropertyDescriptors(o); },
      fixPD: fixPD,
      create: create,
      add: add,
      fill: function(t, s, l) {
        switch (type(l)) {
          case 'Array': forEach(s, (v,k) => { if (l.includes(k)) t[k] = v; }); return t;
          case 'Object': forEach(s, (v,k) => { if (k in l) t[k] = v; }); return t;
          case 'Set':
          case 'Map': forEach(s, (v,k) => { if (l.has(k)) t[k] = v; }); return t;
          default: forEach(s, (v,k) => { if (k in t) t[k] = v; }); return t;
      } },
      merge: function(t, s, keys, props) { let o = type(s) == 'Object';
        switch (type(t)) {
          case 'Object': forEach(s, (v, k) => t[k] = v); return t;
          case 'Array': forEach(s, (v,k,_,e) => e || o ? t.push(e != 2 && keys ? k : v) : t[k] = v, null, props || o ? null : 0); return t;
          case 'Map': forEach(s, (v,k,_,e) => e || o ? t.set(k, v) : t[k] = v, null, props || o ? null : 0); return t;
          case 'Set': forEach(s, (v,k,_,e) => e || o ? t.add(e != 2 && keys ? k : v) : t[k] = v, null, props || o ? null : 0); return t;
      } },
    }),
    callHistory: function callHistory(f, n = 5) {
      if (typeof f != 'function') return f;
      const h = [], m = 2 ** n - 1; let i = 0;
      return new Proxy(Object.defineProperty(f, 'history', { get() { let a = []; for (let j = i - 1; j >= i - 2 ** n; --j) if (h[j & m] !== undefined) a.push(h[j & m]); return a; }}),
        { apply: (t, s, a) => { let r = t.apply(s, a); h[i & m] = [++i, r, ...a]; return r; }});
    },
    capture: function(s, ...d) {
      let m = s.match(d[0]); if (m == null) return false; let r = [];
      for (let i = 1; i < m.length; ++i) switch (type(d[i])) {
        case 'Number': { let t = Number(m[i]); r.push(isNaN(t) ? d[i] : t); } continue;
        case 'Date': { let ms = Date.parse(m[i]); r.push(isNaN(ms) ? d[i] : new Date(ms)); } continue;
        default: r.push(m[i] != null ? m[i] : d[i]); continue;
      } return r;
    },
    forEach: forEach,
    partition: function(n, t, ovr) {
      let l = 0, r = t.length - 1, i;
      if (ovr === undefined) ovr = t[r--][1];
      while (l < r) {
        i = (l + r) >> 1;
        if (n == t[i][0]) return t[i][1];
        if (n < t[i][0]) r = i - 1; else l = i + 1;
      } return n <= t[l][0] ? t[l][1] : (++l >= t.length ? ovr : t[l][1]);
    },
  };
})();
if (typeof module != 'undefined' && module.exports) module.exports = $UC_esutil;
