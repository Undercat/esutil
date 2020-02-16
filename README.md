# Miniature power tools for ECMAScript.

![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Size](https://img.shields.io/badge/source_size-11k-blue) ![GZip Size](https://img.shields.io/badge/gzip_size-2714-blue)

A collection of powerful utility functions that are generally too small to merit implementation as stand-alone modules.

- [Accurately discriminate variable types](#type) (not fooled by toStringTag overloading).
- [Create or add properties to objects](#typefixpd) using a compact notation for assigning specific attributes.
- [Create property-name aliases](#typefill), greatly simplifying support for syntax-flexible option parsing.
- [Merge properties and/or elements](#typemerge) from one container to another of potentially different type.
- [Copy data from any container to a Map](#typeasmap), permitting uniform has/get/set/delete syntax to be used.
- [Create pre-allocated ring-buffers](#ringbuffer) that support constant-time insertion and removal from *both* ends, making for very snappy queues.
- [Quickly assign a value to one of several contiguous ranges](#partition). Uses binary search techniques to support very large partition sets.
- [Define pointer-like index variables](#index) that support a post-increment syntax with a variety of useful automatic block-stitching options.
- [Return just the captures of regular expression matches](#capture), with optional default values and support for automatic type casting.
- [Iterate on objects](#foreach), with an optional accumulator, allowing complex expressions to be performed in a single iteration pass.
- [Trace the call parameters and result history](#callhistory) of a wrapped function to help with debugging.
- [Bounds-check array indices before use](#typeasindex), with default value support.
- [Wrap expensive object allocators](#pool) with a very simple pooler.

### Installation

`npm install @undercat/esutil`

Or clone this repository and include `util.js` directly in an HTML file. Although the module works in the browser, it will not benefit from module isolation if loaded directly, and the code required to use it differs somewhat:

_Node.js:_
```js
const util = require('@undercat/esutil'); // load the whole wrapper
util.Type(x);
const { Type } = require('@undercat/esutil'); // load a component (or several)
Type(x);
```
_Browser:_
```html
<script src='util.js'></script>
<script>
  const { Type } = $UC_esutil;
  Type(x);
</script>
```

The file itself is written as a CommonJS module, and when it is used in the browser it suffers from unavoidable load-order dependencies. Most of my other modules require esutils, so if you're going to use it directly, you should generally include it first.

Incidentally, it is impossible to write a single file that loads as both a CommonJS module and an ECMAScript module because **export** is a privileged keyword that cannot be conditionally executed or overloaded _and_ it throws if it is not satisfied or is encountered in a file not loaded as a module _and_ the error cannot be caught because the keyword is restricted to the global scope (and therefore cannot be wrapped in a `try/catch` block). If **export** failed with a non-fatal warning, like much of the rest of ECMAScript that deals with resources, there would be no problem writing actual modules that could load as CommonJS and ES6 simultaneously.

## API Description
[N.B. For a complete demonstration of all functions offered, run the `validate.js` or `validate.html` files. The output will be written to the console, with some explanatory text.]

<h3 id='type'>Type(<i>var</i>);</h3>

Returns a string describing the type of the supplied variable. This string is similar to the type tag that can be retrieved from an object using `Object.prototype.toString.call()`, but it is not wrapped in superfluous text and cannot be fooled by defining custom string tags on an object.

object|typeof|toString.call|Type()
-|-|-|-
null|object|[object Null]|Null
new Date()|object|[object Date]|Date
/re/|object|[object RegExp]|RegExp
async function(){}|function|[object AsyncFunction]|AsyncFunction
new ArrayBuffer(8)|object|[object ArrayBuffer]|ArrayBuffer
a = []; a[Symbol.toStringTag] = 'Bogus';|object|[object Bogus]|Array

---
<h3 id='typetag'>Type.tag(<i>var</i>);</h3>

Similar to `Object.prototype.toString.call()`, but reads directly from the relevant symbol on the object or its prototype. It does not wrap the value returned in `[object ...]`, preferring to return just the tag itself ('Map', 'Array', etc.). Use this when you <i>want</i> to be 'fooled' by toStringTag overloads.

---
<h3 id='typegetpd'>Type.getPD(<i>obj</i>);</h3>

Equivalent to `Object.getOwnPropertyDescriptors(obj)`.

---
<h3 id='typefixpd'>Type.fixPD(<i>source</i>, <i>attribute_default</i>, <i>source_filter</i>);<br>Type.create(<i>prototype</i>, <i>source</i>, <i>attribute_default</i>, <i>source_filter</i>);<br>Type.add(<i>target</i>, <i>source</i>, <i>attribute_default</i>, <i>source_filter</i>);</h3>

<dl>
<dt>prototype</dt><dd>The prototype to use (when creating a new object).</dd>
<dt>target</dt><dd>The target object (when adding properties).</dd>
<dt>source</dt><dd>An object that supplies the properties to assign. The keys of this object use a special syntax to support attribute overrides and property-name aliases (see below).</dd>
<dt>default_attributes</dt><dd>An octal digit that specifies the attributes to use when assigning new properties: 0 = no permissions, 1 = enumerable, 2 = writable, 4 = configurable, etc. The default is to make all properties enumerable+writable (3) except functions, which are made enumerable only (1). The setters/getters of aliases are always hidden, to keep from cluttering up object iteration.

\# | C | W | E
:-:|:-:|:-:|:-:
0 | - | - | -
1 | - | - | &check;
2 | - | &check; | -
3 | - | &check; | &check;
4 | &check; | - | -
5 | &check; | - | &check;
6 | &check; | &check; | -
7 | &check; | &check; | &check;

The default attributes can be overridden on a per-property basis by appending a colon and digit to the property-name-string (see example below).
</dd>
<dt>source_filter</dt><dd>Only those properties in <i>source</i> having these attributes will be considered when generating new target properties. Uses the same octal schema as <i>default_attributes</i>, above.</dd>
<dt>(return value)</dt><dd>Type.fixPD() returns an object containing 'fixed' property descriptors for <i>source</i>.<br>
Type.create() returns a new object created from 'fixed' property descriptors.<br>
Type.add() returns <i>target</i> with the 'fixed' properties added to it.
</dl>

The _source_ object be defined with special key-strings that are parsed at runtime to determine what aliases, if any, to apply to the property, and/or how to override the default attributes for this property:
```js
const o = Type.create(Object.prototype, {
  'foo,alias:0': 123,
  'bar:5': function() { return this.foo; },
  'cat,dog,mammal,animal': true,
  raw: 'no aliases'
});

console.log(Object.getOwnPropertyDescriptors(o));
```
```
{
  raw: {
    value: 'no aliases',
    writable: true,
    enumerable: true,
    configurable: false
  },
  foo: {
    value: 123,
    writable: false,
    enumerable: false,
    configurable: false
  },
  alias: {
    get: [Function: get],
    set: [Function: set],
    enumerable: false,
    configurable: false
  },
  bar: {
    value: [Function: bar:5],
    writable: false,
    enumerable: true,
    configurable: true
  },
  cat: {
    value: true,
    writable: true,
    enumerable: true,
    configurable: false
  },
  dog: {
    get: [Function: get],
    set: [Function: set],
    enumerable: true,
    configurable: false
  },
  mammal: {
    get: [Function: get],
    set: [Function: set],
    enumerable: true,
    configurable: false
  },
  animal: {
    get: [Function: get],
    set: [Function: set],
    enumerable: true,
    configurable: false
  }
}
```
...as you can see, the resulting object 'o' has four properties and four aliases:
- o.raw &#x21d2; an ordinary property that inherits the default attributes (enumerable+writable)
- o.foo &#x21d2; a 'hidden' number that is not enumerable, writable or configurable
- o.alias &#x21d2; an alias to _foo_
- o.bar &#x21d2; an enumerable+configurable function reference
- o.cat &#x21d2; a Boolean value
- o.dog | o.mammal | o.animal &#x21d2; aliases to _cat_

Aliases indirectly reference their data through getters/setters. Consequently, the primary key, which is always the first name in the list, will be slightly faster than its aliases, and its use should be preferred in critical loops. This holds true for _all_ getters/setters, mind you, not just those created by this module.

The drawback to the property label processing scheme used by these functions is that it precludes the possibility of defining 'ordinary' property names that contains commas or colons. Since most people would probably not consider such names to be 'ordinary,' this was considered to be an acceptable trade-off.

---
<h3 id='typefill'>Type.fill(<i>target</i>, <i>source</i>, [<i>filter</i>]);</h3>

Assigns selected properties of <i>source</i>, which may be an Object or Map, to <i>target</i>, which must be an Object. Properties are selected either be being in the target object already (presumably with a different value), or by being present in a <i>filter</i> object, which may itself be an Array, Object, Map or Set. Only the keys of Maps and Objects are referenced in a <i>filter</i>.

If the target object has aliases defined on it (see above), multiple keys from <i>source</i> may map to the same actual value in <i>target</i>, in which case the last property encountered in <i>source</i> as it is being iterated will prevail. This ambiguity is actually quite useful for allowing options to be satisfied by multiple keywords, as the following example shows:

```js
const prog_opt = Type.create(Object.prototype, {
  'color,fgColor,foregroundColor': 'black',
  'bgColor,backgroundColor': 'white'
});
let user_opt1 = { color: 'red', bgColor: 'yellow', foo: 'purple' };
let user_opt2 = { fgColor: 'red', bgColor: 'yellow', bar: 'purple' };
let user_opt3 = { foregroundColor: 'red', backgroundColor: 'yellow' };

Type.fill(prog_opt, user_opt1);
Type.fill(prog_opt, user_opt2);
Type.fill(prog_opt, user_opt3);
```
In this example, <i>all</i> of the user option structures produce the <i>same</i> program option object. Essentially, the user can choose between label aliases in specifying a given option instead of being forced to use a canonical form. Any 'invalid' properties will be ignored.

---
<h3 id='typemerge'>Type.merge(<i>target</i>, <i>source</i>, <i>keys</i>, <i>props</i>);</h3>

<dl>
<dt>target</dt><dd>The container to merge elements into, either an Object, Array, Map or Set.</dd>
<dt>source</dt><dd>Supplies elements to transfer. It does not need to be the same type as the target.</dd>
<dt>keys<dt><dd>If the target is an Array or Set, then Object and Maps will not be able to transfer both keys and values to them simultaneously. If this flag is set, the keys from the Object or Map are transferred; if it is clear, the values are transferred.
<dt>props</dt><dd>If the source object is not an <i>actual</i> Object, any properties defined on the container (as opposed to elements <i>of</i> the container) will only be copied if this flag is set. Properties are always copied if the source is an actual Object, because it has no other elements to provide.</dd>
</dl>

```js
console.log(Type.merge(new Map([['foo',64]]), { bar: 23 })); // Map(2) { 'foo' => 64, 'bar' => 23 }
console.log(Type.merge([1,2,3], { foo: 4, bar: 6 })); // [ 1, 2, 3, 4, 6 ]
console.log(Type.merge([1,2,3], { foo: 4, bar: 6 }, true)); // [ 1, 2, 3, 'foo', 'bar' ]
console.log(Type.merge([1,2,3], Object.defineProperty([4,5,6], 'foo', { enumerable: true, value: 23 }), null, true));
// [ 1, 2, 3, 4, 5, 6, foo: 23 ]
```

---
<h3 id='typeasmap'>Type.asMap(<i>source</i>, [<i>recursive</i>]);</h3>

Copies all the elements from a _source_ Array, Map or Set, or copies all the enumerable, intrinsic ("own") properties from a _source_ Object, into a new stand-alone Map object. Useful for allowing code to be written for a single interface (namely, Map's) while accepting data from any container type. Arrays elements supply keys for the resulting Map entries, while their indices (i.e., order) supplies the values. Set elements are used as both the keys and values.

If the <i>recursive</i> flag is set to a Number or `true`, Type.asMap() will recursively convert containers in the appropriate number of object levels (or all of them) to Maps. Because Maps can use object instances, like Arrays and Sets, as actual keys, it would be difficult to distinguish between objects intended to be keys and objects intended to be collections on a level-by-level basis, so they are never recursively converted.

```js
console.log(Type.asMap({ foo: 12, bar:64 }));    // Map(2) { 'foo' => 12, 'bar' => 64 }
console.log(Type.asMap(['foo', 'bar']));         // Map(2) { 'foo' => 0, 'bar' => 1 }
console.log(Type.asMap(new Set(['foo','bar']))); // Map(2) { 'foo' => 'foo', 'bar' => 'bar' }
console.log(Type.asMap({ foo: 12, bar: { yes: 23, no: 34 }}, true));
// Map(2) { 'foo' => 12, Map(2) { 'yes' => 23, 'no' = 34 } }
```

---
<h3 id='typeasindex'>Type.asIndex(<i>object</i>, <i>elements</i>, <i>default_index</i>);</h3>

<dl>
<dt>object</dt><dd>Any object, which may or may not be covertible to a Number, and which may or may not be in-bounds.</dd>
<dt>elements</dt><dd>If <i>object</i> can be converted to a Number (or is a Number), it must lie between zero and this value. Default is 2<sup>30</sup>, to provide a safe margin on V8's index limit of &plusmn;2<sup>31</sup>.</dd>
<dt>default_index</dt><dd>If <i>object</i> cannot be converted to a Number, or is out-of-bounds, this index will be returned.</dd>
</dl>

```js
let a = [10,20,30,40,50], i = 45;
console.log(a[Type.asIndex(i, 5, 0)]); // 10
console.log(a[Type.asIndex(i - 41, 5, 0)]); // 50
```

---
<h3 id='index'>Index();<br>Index(<i>initial_value</i>, [mask]);<br>Index(<i>block_list</i>);<br>Index(<i>block_function</i>, [<i>...arguments</i>]);</h3>

If no argument is supplied, a function is returned that increments a counter from zero each time it is called (the default is to increment by one, unless an argument is supplied giving the increment value). It returns the <i>pre</i>-increment value. This allows post-increment expressions to be created in-line, like pointers in C++.

If a Number is supplied as the initial argument, that value is used to set the counter's initial value. If an optional integer mask is supplied, it will be ANDed with the counter after each operation...cheap modulus wrapping for rings.

If an Array is supplied, it may take two forms: `[block_size, base1, base2, base3, ...]` or `[[base1, length1], [base2, length2], ...]`. The first form uses a uniform block size built on any number of block bases; the second form supplies both the base and length for each block explicitly. Index() will thread blocks transparently, updating the counter when space in one block is exhausted with the next block base. If an increment is too large to fit in the remaining 'space' within a block, the next block of suitable size is returned.

If a Function is supplied as the initial argument, it is invoked both to supply the base and length of the initial block and each following block. The callback function is invoked with the following parameters:
```block_threader(null, null, ...threader_arguments)```
...to supply the first block, and...
```block_threader(block_base, block_length, ...threader_arguments)```
to supply all subsequent blocks. It should return an array `[block_base, block_length]` that describes the base and length of the next block, which will be supplied to it again, in turn, when another block is need (i.e., they are 'stable' and can be used as keys).

The object returned by Index() is itself a function. That function takes one optional parameter: the number by which to increment (or decrement, for negative numbers) the value of the counter. It returns the <i>unincremented</i> value, however, turning the function into a sort of 'pseudo-post-incremented-pointer' for pointerless languages, like ECMAScript.

There are also a few properties defined on the returned function-object:
- value — returns the current value of the internal index
- octets — returns the total number of increments (minus decrements) applied to the internal index; this is not that same as the difference between starting and ending index values, owing to block spanning, and that fact that some blocks may be left partially (or completely) empty if they are not big enough to satisfy a request
- reset() — sets the internal index value to zero

A few examples will be much more instructive than further verbiage expended in explanation:
```js
let t = Index();
console.log(t.value); // 0
console.log(t());     // 0
console.log(t(8));    // 1
console.log(t(-1));   // 9
console.log(t.value); // 8
console.log(t.octets);// 8

t = Index(128, 0xff);
console.log(t.value); // 128
console.log(t(64));   // 128
console.log(t(64));   // 192
console.log(t(64));   // 0
console.log(t(64));   // 64
console.log(t.value); // 128
console.log(t.octets);// 256

t = Index([100, 0, 200]);
console.log(t.value); // 0
console.log(t(50));   // 0
console.log(t(50));   // 50
console.log(t(50));   // 200
console.log(t.value); // 250
console.log(t.octets);// 150

t = Index([[100, 100],[300, 100]]);
console.log(t.value); // 100
console.log(t(50));   // 100
console.log(t(50));   // 150
console.log(t(50));   // 300
console.log(t.value); // 350
console.log(t.octets);// 150

let base = [1000, 2000], i = 0;
t = Index(() => [base[i++], 256]);
console.log(t.value); // 1000
console.log(t(128));  // 1000
console.log(t(128));  // 1128
console.log(t(128));  // 2000
console.log(t.value); // 2128
console.log(t.octets);// 384
```
---
<h3 id='pool'>Pool(<i>max</i>, <i>allocater</i>, [<i>...allocator_instance_args</i>]);</h3>

A very simple object pooler that stores references to freed objects, then provides them again in preference to invoking the allocator the next time one is needed. Obviously, this only works for objects that can be reused (not Promises, for instance) and presumably the object is expensive to reconstruct. It basically functions as a push-down-stack that keeps discarded objects "out of your way" until needed again, with the benefit that it automatically allocates new objects if the cache of freed objects is empty.

```js
function alloc(...s) { this.version = s[0]; }
const pool1 = Pool(4, alloc, 'first');  // holds sixteen freed objects, parameterized with 'first'
const pool2 = Pool(4, alloc, 'second'); // another sixteen objects, parameterized with 'second'

let x = pool1(), y = pool2();
console.log(x.version, y.version); // 'first' 'second'
pool1.free(x); pool2.free(y);
```
Run the `validate.js` or `validate.html` files to obtain some time comparisons.

---
<h3 id='ringbuffer'>RingBuffer(<i>n</i>);</h3>

Creates a ring buffer with 2<sup><i>n</i></sup> elements (default 2<sup>10</sup> = 1024), of which (2<sup><i>n</i></sup> &ndash; 2) elements are available for data (the remaining two elements are used as the 'head' and 'tail' elements, which cannot overlap). The resulting object supports the following methods:
<dl>
<dt>queue(v)</dt><dd>Adds a value to the tail of the ring.</dd>
<dt>unqueue()</dt><dd>Pops a value from the tail of the ring.</dd>
<dt>tail()</dt><dd>Returns the tail value without popping it.</dd>
<dt>push(v)</dt><dd>Adds a value to the head of the ring.</dd>
<dt>pop()</dt><dd>Pops a value from the head of the ring.</dd>
<dt>head()</dt><dd>Returns the head value without popping it.</dd>
<dt>skip()</dt><dd>Pops the head value and returns the value under it (without popping it).</dd>
</dl>

```js
const r = RingBuffer();
r.queue(42); r.queue(18); console.log(r.pop(), r.pop()); // 42 18
r.queue(10); r.queue(20); console.log(r.skip()); // 20
r.queue(35); r.queue(45); console.log(r.unqueue(), r.unqueue()); // 45 35
```

Because the RingBuffer never reallocates its storage or copies its elements, it benefits from constant insertion/removal time at <i>both</i> ends of the ring. For push()/pop() operations, it is as fast as an Array at ring sizes of about 512 elements, and faster for larger stacks; for queue()/unqueue() operations, it is faster than an Array at any size.

Of course, since it <i>never</i> reallocates, you can exhaust the ring's buffer space if you do not size it sufficiently. An Array, on the other hand, will be dynamically and automatically resized as the number of elements increase, though it will get slower as its reallocation window gets larger.

---
<h3 id='callhistory'>callHistory(<i>function</i>, <i>n</i>);</h3>

Remembers 2<sup><i>n</i></sup> (default: 2<sup>5</sup> = 32) invocations of a function. Both the call parameters and result generated are recorded and can be recalled at any subsequent time through the `history` virtual property added to the resulting function-object.

This feature is implemented by defining a Proxy on the wrapped function, and proxies are slow. Do not use this on functions that support critical loops in production code!

```js
const f = callHistory(s => 'result of ' + s);
f('first call'); f('second call'); f('third call'); f('fourth call');
console.log(f.history);
```
```
[
  [ 4, 'result of fourth call', 'fourth call' ],
  [ 3, 'result of third call', 'third call' ],
  [ 2, 'result of second call', 'second call' ],
  [ 1, 'result of first call', 'first call' ]
]
```

---
<h3 id='capture'>capture(<i>string</i>, <i>regular_expression</i>, <i>...default_values</i>);</h3>

Applies _regular\_expression_ to _string_ and returns an array containing only the captures found, if any. Default values provided in the 'rest' parameter will substitue for any missing captures.

If the default value for a particular capture is a Number or a Date, the string from that capture position will be converted to a Number or Date value before it is returned. The default will also be returned if the capture <i>cannot</i> be converted to the default's type, even if the capture matches something.

```js
console.log(capture('12345 number 2000-01-01 date', /(\d+) (number) ([^ ]*) (date)/,
    999, 999, new Date(), new Date()));
```
```
[ 12345, 999, 2000-01-01T00:00:00.000Z, 2020-02-14T21:02:15.021Z ]
```
Notice that the second capture returns the default value, because 'number' cannot be converted to an actual Number. Likewise, since 'date' is not convertible to a real Date, the fourth capture returns the default (read the date values).

---
<h3 id='foreach'>forEach(<i>iterable</i>, <i>callback</i>, [<i>initializer</i>], [<i>finalizer</i>], [<i>code_points</i>], [<i>this</i>], [<i>max_elements</i>], [<i>max_properties</i>], [<i>initial_sequence_value</i>]);</h3>

<dl>
<dt>iterable<dt>
 <dd>An iterable container, property-containing element, or string. If a string is provided, the characters will be iterated over. If a non-iterable or scalar element is supplied, it will be fed to the callback directly.<dd>
<dt>callback<dt>
 <dd>The function that will be called for each element of the supplied <i>iterable</i>. It is called with<br><b>callback(<i>value</i>, <i>key</i>, <i>accumulator</i>, <i>source_type</i>, <i>sequence</i>);</b>
  <dl>
    <dt>value</dt>
     <dd>The value of the instant element.</dd>
    <dt>key</dt>
     <dd>The key for the instant element. If the source object is an Array, the key will be the index for element. This is not necessarily the same as the sequence value (i) because the array might have holes (but the sequence does not).</dd>
    <dt>accumulator</dt>
     <dd>An arbitrary value that is initially set to the return value of the <i>initializer</i> (q.v.), and can subsequently be updated by the iteration callback every time it explicitly returns a value. If no value is returned by the callback, the accumulator is unchanged. (More detailed description provided below, and in the examples.)</dd>
    <dt>source_type</dt>
     <dd>An integer that indicates the source providing this element:
      <ol>
        <li value='0'>Property, either from an actual Object, or defined on some other type of container, like an Array or Map (uncommon, but it happens).</li>
        <li>Map element.</li>
        <li>Array element.</li>
        <li>Set member.</li>
        <li>UCS-2 character code (16-bit).</li>
        <li>UTF code point (21-bit).</li>
      </ol>
     Certain containers, like Maps and Array, can have both intrinsic elements and object properties. If neither is filtered out (see max-elements sections, below), both will be fed to the callback and distinguished by <i>source_type</i>.</dd>
    <dt>sequence</dt>
     <dd>This is a monotonic counter. It starts at <i>initial_sequence_value</i>, which default to zero, and increases by one each time the callback is invoked. It continues to increase linearly as forEach iterates through elements and properties, unlike an array index value.</dd>
  </dl>
 </dd>
<dt>initializer</dt>
 <dd>If this value is a function, it is invoked to create the initial value of the accumulator; if it is not a function, <i>initializer</i> is used verbatim <i>as</i> the accumulator. An initialization function is called with <i>iterable</i> as its only argument. Its return value becomes the accumulator's initial value. Defaults to &lt;undefined&gt;.</dd>
<dt>finalizer</dt>
 <dd>A function that is used to finalize the accumulator before it is returned by forEach(). Its call signature is:<br><b>finalizer(<i>accumulator</i>, <i>count</i>, <i>all_elms?</i>, <i>all_props?</i>, <i>iterable</i>);</b>
  <dl>
    <dt>accumulator</dt>
     <dd>The value of the accumulator after all the permitted elements have been iterated.</dd>
    <dt>count</dt>
     <dd>The actual number of elements iterated.</dd>
    <dt>all_elms?</dt>
     <dd>True, if all the elements in <i>iterable</i> were processed; false, if some were left out due to limits placed on iteration by <i>max_elements</i>.</dd>
    <dt>all_props?</dt>
     <dd>True, if all properties of <i>iterable</i> were processed; false, if some were left out.</dd>
    <dt>iterable</dt>
     <dd>The object supplied to forEach to iterate over.</dd>
  </dl>
 </dd>
<dt>code_points</dt>
 <dd>The default is to iterate strings by UCS-2 character codes. If you need to iterate by UTF code points instead, set this flag.</dd>
<dt>this</dt>
 <dd>Object to use as the 'this' argument when invoking <i>callback</i>, <i>initializer</i> and <i>finalizer</i>. Defaults to <i>iterable</i></dd>
<dt>max_elements</dt>
 <dd>The maximum number of intrinsic elements to process (for Arrays, Maps and Sets). Defaults to 2<sup>52</sup>.</dd>
<dt>max_properties</dt>
 <dd>The maximum number of properties to process. If <i>iterable</i> has both intrinsic elements and properties, this will control only the properties. Defaults to 2<sup>52</sup>.</dd>
<dt>initial_sequence_value<dt>
 <dd>Sets the <i>sequence</i> origin for the <i>callback</i> parameter. Defaults to zero. Has no effect on the <i>count</i> value that is given to the <i>finalizer</i>.</dd>
</dl>

```js
log(forEach(['foo','bar'], (v,k,a) => a += `<li>${v}</li>`, '', a => `<ul>${a}</ul>`));
```
```
<ul><li>foo</li><li>bar</li></ul>
```

---
<h3 id='partition'>partition(<i>number</i>, <i>partition_array</i>, [<i>overflow_value</i>]);</h3>

<dl>
<dt>number</dt><dd>The number to be sorted into its appropriate range.</dd>
<dt>partition_array</dt><dd>An sorted array of two-element sub-arrays defining a partition on a numeric range. A partition can be thought of as an arbitrary set of 'dividers' that are placed on the number line, implicitly defining a set that consists of the span between every adjacent divider. Academic grades, for example, are usually treated as a partition of scores ranging from zero to one-hundred. The <i>partition_array</i> defines the cut-off scores for each grade, if you will. Each sub-array consists of two elements: the first gives the cut-off value that a number must be <i>less-than-or-equal-to</i> in order 'belong' in that bin, while the second is some arbitrary value that is assigned to members of the bin.<dd>
<dt>overflow_value<dt><dd>Because of its relational definition, <i>all</i> values less than the first 'divider' will be placed into that bin and assigned its return value, but what of elements that are greater than the last divider? This 'ultra-bin' can be defined in one of two ways: implicitly, where only the return value of the last element in <i>partition_array</i> is used (i.e., it does not define another 'divider' and any cut-off value it gives is ignored); or explicitly, in which case all elements of <i>partition_array</i> define 'dividers' and <i>overflow_value</i> is returned for numbers greater than the highest 'divider'.</dd>
</dl>

```js
const { partition } = require('./util.js');
const grade_partition = [[59, 'F'], [69, 'D'], [79, 'C'], [89, 'B']];
const score = [-1, 59, 60, 69, 70, 79, 80, 89, 90, 99, 100, 110];
const grade = new Map();
for (const e of score) grade.set(e, partition(e, grade_partition, 'A'));
console.log(grade);
```
```
Map(12) {
  -1 => 'F',
  59 => 'F',
  60 => 'D',
  69 => 'D',
  70 => 'C',
  79 => 'C',
  80 => 'B',
  89 => 'B',
  90 => 'A',
  99 => 'A',
  100 => 'A',
  110 => 'A'
}
```
This function is implemented as a binary search on <i>partition_array</i>, so it can scale to very large partitions with little run-time penalty. The downside, if any, is that <i>partition_array</i> must be sorted in strictly-increasing order by cut-off values.

## Minifier Utility
Included in this distribution is a modest (read that as: "not very robust") minification utility that can perform 'alias-aware' variable name substitution for properties referencing 'this' (doing more general substitution would require ferreting out the controlling variable in a variety of tricky edge cases, and that would require a complete parser).

Variable substitution can be handy to insure that all access to a particular property is by the fastest accessor; namely, the primary (first) key, since aliases are getters/setters that simply point to the primary key.

Unlike most minifiers, <i>line numbers will be preserved between the source and target files</i>. The newline character is itself a statement terminator in ECMAScript and can often substitute for a semicolon, so there isn't as much to be gained from eliminating newlines as you might think.

The benefit of preserving line structure in the minified file is that you can use it without a code map. You can simply open up the <i>un</i>-minified file and navigate directly to the reported line. There's very little difference in compressability between files that use newlines as terminators and files that do not...<i>provided that you do not leave in huge, vertical blocks of comments that minify to vast, empty expanses of whitespace</i>. I feel that a good readme file is worth thousands of lines of cryptic comments, anyway. Comments that are placed at the end of a line will minify out completely, however.

To run the minifier, use `node minify my_source_file.js my_target_file.js`. If you leave out the target, the result will be dumped to standard output.

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=PXK2UMAPRCRDL&source=url)  Help Undercat buy kibble to fuel his long nights of coding!  Meow! 😺